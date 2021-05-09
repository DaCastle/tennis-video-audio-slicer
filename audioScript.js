document.addEventListener("DOMContentLoaded", function (event) {

    // Hacks to deal with different function names in different browsers
    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback, element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();
    window.AudioContext = (function () {
        return window.webkitAudioContext || window.AudioContext || window.mozAudioContext;
    })();
    // Global Variables for Audio
    let audioContext;
    let audioBuffer;
    let sourceNode;
    let analyserNode;
    let javascriptNode;
    let audioData = null;
    let audioPlaying = false;
    let sampleSize = 1024;  // number of samples to collect before analyzing data
    let amplitudeArray;     // array to hold time domain data
    // This must be hosted on the same server as this page - otherwise you get a Cross Site Scripting error
    let audioUrl = './PXL_20210415_185038174.mp4'
    // Global variables for the Graphics
    let canvasWidth = 512;
    let canvasHeight = 256;
    let ctx;

    ctx = document.querySelector('#canvas').getContext('2d');

    // When the Start button is clicked, finish setting up the audio nodes, play the sound,
    // gather samples for the analysis, update the canvas
    document.querySelector('#start_button').addEventListener('click', function (e) {
        // the AudioContext is the primary 'container' for all your audio node objects
        if (!audioContext) {
            try {
                audioContext = new AudioContext();
            } catch (e) {
                alert('Web Audio API is not supported in this browser');
            }
        }

        e.preventDefault();
        // Set up the audio Analyser, the Source Buffer and javascriptNode
        setupAudioNodes();
        // setup the event handler that is triggered every time enough samples have been collected
        // trigger the audio analysis and draw the results
        javascriptNode.onaudioprocess = function () {
            // get the Time Domain data for this sample
            analyserNode.getByteTimeDomainData(amplitudeArray);
            // draw the display if the audio is playing
            if (audioPlaying == true) {
                requestAnimFrame(drawTimeDomain);
            }
        }
        // Load the Audio the first time through, otherwise play it from the buffer
        if (audioData == null) {
            loadSound(audioUrl);
        } else {
            playSound(audioData);
        }
    });

    // Stop the audio playing
    document.querySelector('#stop_button').addEventListener('click', function (e) {
        resumePoint = e.timeStamp
        e.preventDefault();
        sourceNode.stop(0);
        audioPlaying = false;
    });


    function setupAudioNodes() {
        sourceNode = audioContext.createBufferSource();
        analyserNode = audioContext.createAnalyser();
        javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);
        // Create the array for the data values
        amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
        // Now connect the nodes together
        sourceNode.connect(audioContext.destination);
        sourceNode.connect(analyserNode);
        analyserNode.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
    }


    // Load the audio from the URL via fetch and store it in global variable audioData
    // Note that the audio load is asynchronous
    function loadSound(url) {
        document.getElementById('msg').textContent = "Loading audio...";
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                audioContext.decodeAudioData(buffer, decoded => {
                    document.getElementById('msg').textContent = "Audio sample download finished";
                    console.log(buffer)
                    console.log(decoded)
                    audioData = decoded;
                    playSound(audioData);
                }, onError);
            })
    }


    // Play the audio and loop until stopped
    function playSound(buffer) {
        sourceNode.buffer = buffer;
        sourceNode.start(0);    // Play the sound now
        sourceNode.loop = true;
        audioPlaying = true;
    }

    function onError(e) {
        console.log(e);
    }

    function drawTimeDomain() {
        clearCanvas();
        for (let i = 0; i < amplitudeArray.length; i++) {
            let value = amplitudeArray[i] / 256;
            let y = canvasHeight - (canvasHeight * value) - 1;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(i, y, 1, 1);
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

});