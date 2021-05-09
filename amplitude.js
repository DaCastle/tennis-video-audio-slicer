var getTheContext = window.webkitAudioContext || window.AudioContext || window.mozAudioContext
var audioContext = new getTheContext()
var source;
var analyser = audioContext.createAnalyser();
var printHere = document.getElementById('printHere')

var url = 'PXL_20210415_185038174.mp4';

const decibalThreshold = -25.0
const minClipLength = 5

function fetchAudio(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
        callback(xhr.response);
    };
    xhr.send();
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

fetchAudio(url, function (arrayBuffer) {
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
                finalChunks.push([firstGoodChunk-1, lastGoodChunk-1+4])
                firstGoodChunk = timeStamp
            }
            lastGoodChunk = timeStamp
        }

        if (lastGoodChunk != firstGoodChunk)
        finalChunks.push([firstGoodChunk-1+1,lastGoodChunk-1+4])

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

        const paritalURL = url.substring(0,url.length-4)

        for (let i = 0; i < finalChunks.length; i++) {
            var p = document.createElement('span')
            p.innerHTML = `ffmpeg -i ${url} -ss ${finalChunks[i][0]} -to ${finalChunks[i][1]} ${paritalURL}.part${i+1}.mp4${i+1 == finalChunks.length ? '' : ' && '}`
            // p.innerHTML = `ffmpeg -i ${url} -ss ${finalChunks[i][0]} -to ${finalChunks[i][1]} -c:v copy -c:a copy ${paritalURL}.part${i+1}.mp4${i+1 == finalChunks.length ? '' : ' && '}`
            printHere.appendChild(p)
        }

        printHere.appendChild(document.createElement('br'))
        printHere.appendChild(document.createElement('br'))

        for (let j = 0; j < finalChunks.length; j++) {
            var p = document.createElement('p')
            p.innerHTML = `file '${paritalURL}.part${j+1}.mp4'`
            printHere.appendChild(p)
        }

        printHere.appendChild(document.createElement('br'))

        var p = document.createElement('p')
        // p.innerHTML = `ffmpeg -f concat -i slices.txt cut-${url}`
        p.innerHTML = `ffmpeg -f concat -i slices.txt -c:v copy -c:a copy cut-${url}`
        printHere.appendChild(p)

    });
});
