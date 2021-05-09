// AUDIO CONTEXT
window.AudioContext = (window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext);

if (!AudioContext) alert('This site cannot be run in your Browser. Try a recent Chrome or Firefox. ');

var audioContext = new AudioContext();
var currentBuffer = null;

// CANVAS
var canvasWidth = window.innerWidth, canvasHeight = 500;
var newCanvas = createCanvas(canvasWidth, canvasHeight);
var context = null;

window.onload = appendCanvas;
function appendCanvas() {
    document.body.appendChild(newCanvas);
    context = newCanvas.getContext('2d');
}

// MUSIC LOADER + DECODE
function loadMusic(url) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "arraybuffer";
    req.onreadystatechange = function (e) {
        if (req.readyState == 4) {
            if (req.status == 200)
                audioContext.decodeAudioData(req.response,
                    function (buffer) {
                        console.log(buffer)
                        currentBuffer = buffer;
                        displayBuffer(buffer);
                    }, onDecodeError);
            else
                alert('error during the load.Wrong url or cross origin issue');
        }
    };
    req.send();
}

function onDecodeError() { alert('error while decoding your file.'); }

// MUSIC DISPLAY
function displayBuffer(buff /* is an AudioBuffer */) {
    var drawLines = buff.duration;
    var leftChannel = buff.getChannelData(0); // Float32Array describing left channel     
    var rightChannel = buff.getChannelData(1)
    // var lineOpacity = canvasWidth / leftChannel.length;
    context.save();
    context.fillStyle = '#080808';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.strokeStyle = '#46a0ba';
    context.globalCompositeOperation = 'lighter';
    context.translate(0, canvasHeight / 2);
    // context.globalAlpha = 0.6 ; // lineOpacity ;
    context.lineWidth = 1;
    var totallength = leftChannel.length;
    var eachBlock = Math.floor(totallength / drawLines);
    var lineGap = (canvasWidth / drawLines);

    context.beginPath();
    for (var i = 0; i <= drawLines; i++) {
        var audioBuffKey = Math.floor(eachBlock * i);
        var x = i * lineGap;
        var y = (leftChannel[audioBuffKey] + rightChannel[audioBuffKey]) * canvasHeight / 2;
        context.moveTo(x, y);
        context.lineTo(x, (y * -1));
    }
    context.stroke();
    context.restore();
}

function createCanvas(w, h) {
    var newCanvas = document.createElement('canvas');
    newCanvas.width = w; newCanvas.height = h;
    return newCanvas;
};


loadMusic('PXL_20210415_185038174.mp4');