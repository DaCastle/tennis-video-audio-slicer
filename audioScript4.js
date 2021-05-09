let lastHit = 0
let allHits= []

const audioCtx = new AudioContext();

//Create audio source
//Here, we use an audio file, but this could also be e.g. microphone input
const audioEle = new Audio();
audioEle.src = 'PXL_20210415_185038174.mp4';//insert file name here
audioEle.autoplay = true;
audioEle.preload = 'auto';
const audioSourceNode = audioCtx.createMediaElementSource(audioEle);

//Create analyser node
const analyserNode = audioCtx.createAnalyser();
analyserNode.fftSize = 64; // messing with this
const bufferLength = analyserNode.frequencyBinCount;
const dataArray = new Float32Array(bufferLength);
//Set up audio node network
audioSourceNode.connect(analyserNode);

//Create 2D canvas
const canvas = document.createElement('canvas');
canvas.style.position = 'absolute';
canvas.style.top = 0;
canvas.style.left = 0;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const canvasCtx = canvas.getContext('2d');
canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
// analyserNode.getFloatTimeDomainData(dataArray);

function draw() {
    //Schedule next redraw
    requestAnimationFrame(draw);
    //Get spectrum data
    analyserNode.getFloatFrequencyData(dataArray);
    //Draw black background
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    //Draw spectrum
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let posX = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] + 140) * 5;
        canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight + 100) + ', 50, 50)';
        canvasCtx.fillRect(posX, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        posX += barWidth + 1;
    }
    if (dataArray[1] >= dataArray[0]) {
        const thisHit = Math.floor(audioCtx.getOutputTimestamp().contextTime)
        if (thisHit > lastHit + 1) {
            allHits.push(thisHit)
            console.log(allHits)
            lastHit = thisHit
        }
    }
};

draw();
