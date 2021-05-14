var getTheContext = window.webkitAudioContext || window.AudioContext || window.mozAudioContext
var audioContext = new getTheContext()
var source;
var analyser = audioContext.createAnalyser();
var printHere = document.getElementById('printHere')

const fileName = '20190829_195016.s1.mp4'
const partialName = fileName.substring(0,fileName.length-4)

const decibalThreshold = -65.0
const minClipLength = 3
// highpass high ignores more low sounds, lowpass low filters more high sounds
function fetchAudio(url, callback) {
    fetch(url)
    .then(response => {
        var p = document.createElement('p') // 6.55 wind h-2000 l-2000, trying h-3000 l-3000
        p.innerHTML = `ffmpeg -i ${fileName} -c:v copy -af "highpass=4000,lowpass=2000" ${partialName}.af.mp4`
        printHere.appendChild(p)
        return response.arrayBuffer()
    })
    .then(buffer => {
        callback(buffer)
    })
    .catch(error => {
        console.log(error)
        const multiplesOf20MinClips = 3
        for (let i = 0; i < multiplesOf20MinClips; i++) { 
            var p = document.createElement('span')
            p.innerHTML = `ffmpeg -i ${fileName} -ss ${i*1200} -to ${(i+1)*1200} -c:v copy -af "highpass=4000,lowpass=2000" ${partialName}.s${i+1}.mp4${i+1 == multiplesOf20MinClips ? '' : ' && '}`
            printHere.appendChild(p)
        }
    })

}

function decode(arrayBuffer, callback) {
    audioContext.decodeAudioData(arrayBuffer, function (audioBuffer) {
        source = audioContext.createBufferSource();
      source.connect(audioContext.destination)
      source.connect(analyser);
      source.buffer = audioBuffer;
        callback(audioBuffer);
    });
}

// return an array of amplitudes for the supplied `audioBuffer`
//
// each item in the array will represent the average amplitude (in dB)
// for a chunk of audio `t` seconds long
function slice(audioBuffer, t) {
    var channels = audioBuffer.numberOfChannels,
        sampleRate = audioContext.sampleRate,
        len = audioBuffer.length,
        samples = sampleRate * t,
        output = [],
        amplitude,
        values,
        i = 0,
        j, k;
    // loop by chunks of `t` seconds
    for (; i < len; i += samples) {
        values = [];
        // loop through each sample in the chunk
        for (j = 0; j < samples && j + i < len; ++j) {
            amplitude = 0;
            // sum the samples across all channels
            for (k = 0; k < channels; ++k) {
                amplitude += audioBuffer.getChannelData(k)[i + j];
            }
            values.push(amplitude);
        }
        output.push(dB(values));
    }
    return output;
}

// calculate the average amplitude (in dB) for an array of samples
function dB(buffer) {
    var len = buffer.length,
        total = 0,
        i = 0,
        rms,
        db;
    while (i < len) {
        total += (buffer[i] * buffer[i++]);
    }
    rms = Math.sqrt(total / len);
    db = 20 * (Math.log(rms) / Math.LN10);
    return Math.round(db);
}


// fetch the audio, decode it, and log an array of average
// amplitudes for each chunk
const timePerChunk = .1
let soundChunks = []
let chunksWeWant = {}
let finalChunks = []
let firstGoodChunk = null
let lastGoodChunk = null

fetchAudio(fileName, function (arrayBuffer) {
    decode(arrayBuffer, function (audioBuffer) {

        soundChunks = slice(audioBuffer, timePerChunk)
        /**
         * create an object with the timestap as key, and decibal as value
         */
        for (let i = 0; i < soundChunks.length; i++) {
            if (soundChunks[i] > decibalThreshold) {
                chunksWeWant = {
                    ...chunksWeWant,
                    [Math.floor(i*timePerChunk)]: soundChunks[i]
                }
            }
        }
        printHere.innerHTML += JSON.stringify(chunksWeWant)


        /**
         * Loop over timestamp keys and find start and stop pairs
         * over the minClipLength
         */
        for (const timeStamp in chunksWeWant) {

            if (firstGoodChunk === null) { 
                firstGoodChunk = timeStamp
                lastGoodChunk = timeStamp
            }

            if (timeStamp - lastGoodChunk > minClipLength)  {
                finalChunks.push([firstGoodChunk-.5, lastGoodChunk-1+3.5])
                firstGoodChunk = timeStamp
            }
            lastGoodChunk = timeStamp
        }

        if (lastGoodChunk != firstGoodChunk)
        finalChunks.push([firstGoodChunk-.5,lastGoodChunk-1+3.5])

        /**
         * one last pass over altered start/stop values to only
         * keep clip chunks over minClipLength
         */
        finalChunks = finalChunks.filter(chunk => {
            if (chunk[1] - chunk[0] >= minClipLength) {
                return [chunk[0], chunk[1]]
            }
        })

        printHere.innerHTML += JSON.stringify(finalChunks)

        printHere.appendChild(document.createElement('br'))
        printHere.appendChild(document.createElement('br'))


        for (let i = 0; i < finalChunks.length; i++) {
            var p = document.createElement('span')
            p.innerHTML = `ffmpeg -ss ${finalChunks[i][0]} -to ${finalChunks[i][1]} -i ${fileName} -c:v libx264 -crf 18 ${partialName}.p${i+1}.mp4 && `
            printHere.appendChild(p)
        }
        p = document.createElement('span')
        p.innerHTML = `ffmpeg -f concat -i slices.txt -c:v copy -c:a copy cut-${fileName}`
        printHere.appendChild(p)


        printHere.appendChild(document.createElement('br'))
        printHere.appendChild(document.createElement('br'))

        for (let j = 0; j < finalChunks.length; j++) {
            var p = document.createElement('p')
            p.innerHTML = `file '${partialName}.p${j+1}.mp4'`
            printHere.appendChild(p)
        }

        printHere.appendChild(document.createElement('br'))

    });
});
