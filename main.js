
let currentModIndex = 100;
let currentModFreq = 100;
let currentModFreqAM = 100;
let currentAdditiveFreq = 1;
let currentPartials = 4;

document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var wave = 'sine';
    var mode = 'Normal';
    var modulatorAM;
    var modulatorFM;
    let tremoloDepthValue = 0.5;

    const keyboardFrequencyMap = {
    '90': 261.625565300598634,  //Z - C
    '83': 277.182630976872096, //S - C#
    '88': 293.664767917407560,  //X - D
    '68': 311.126983722080910, //D - D#
    '67': 329.627556912869929,  //C - E
    '86': 349.228231433003884,  //V - F
    '71': 369.994422711634398, //G - F#
    '66': 391.995435981749294,  //B - G
    '72': 415.304697579945138, //H - G#
    '78': 440.000000000000000,  //N - A
    '74': 466.163761518089916, //J - A#
    '77': 493.883301256124111,  //M - B
    '81': 523.251130601197269,  //Q - C
    '50': 554.365261953744192, //2 - C#
    '87': 587.329535834815120,  //W - D
    '51': 622.253967444161821, //3 - D#
    '69': 659.255113825739859,  //E - E
    '82': 698.456462866007768,  //R - F
    '53': 739.988845423268797, //5 - F#
    '84': 783.990871963498588,  //T - G
    '54': 830.609395159890277, //6 - G#
    '89': 880.000000000000000,  //Y - A
    '55': 932.327523036179832, //7 - A#
    '85': 987.766602512248223,  //U - B
    }
    const images = [
    "images/ja1.jpg",
    "images/ja2.jpg",
    "images/ja3.jpg",
    "images/ja4.jpg",
    "images/ja5.jpg",
    "images/ja6.jpg",
    "images/ja7.jpg",
    "images/ja8.jpg",
    "images/ja9.jpg",
    "images/ja10.jpg",
    "images/ja11.jpg",
    "images/ja12.jpg",
    "images/ja13.jpg",
    "images/ja14.jpg",
    "images/ja15.jpg",
    "images/ja16.jpg",
    "images/ja17.jpg",
    ];


    const globalGain = audioCtx.createGain(); //this will control the volume of all notes
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime)

    const tremoloGain = audioCtx.createGain();
    tremoloGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    globalGain.connect(tremoloGain);
    tremoloGain.connect(audioCtx.destination);
    const max = 0.8;

    const lfo = audioCtx.createOscillator();
    lfo.type = "sine";

    const lfoDepth = audioCtx.createGain();
    lfoDepth.gain.setValueAtTime(0.0, audioCtx.currentTime);
    const lfoBase = audioCtx.createConstantSource();
    lfoBase.offset.setValueAtTime(1.0, audioCtx.currentTime);

    lfo.frequency.setValueAtTime(6, audioCtx.currentTime); 
    lfo.connect(lfoDepth).connect(tremoloGain.gain);
    lfoBase.connect(tremoloGain.gain);

    lfo.start();
    lfoBase.start();
    
    const buttons = document.querySelectorAll(".wave");
    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
        changeWave(button.textContent);
        });
    });

    const otherButtons = document.querySelectorAll(".mode");
    otherButtons.forEach(function (button) {
        button.addEventListener('click', function () {
        changeMode(button.textContent);
        });
    });

    const tremoloToggle = document.getElementById("lfoToggle");
    tremoloToggle.addEventListener("change", () => {
        const time = audioCtx.currentTime;
        const target = tremoloToggle.checked ? tremoloDepthValue : 0.0;

        lfoDepth.gain.cancelScheduledValues(time);
        lfoDepth.gain.setTargetAtTime(target, time, 0.02);
    });

    const slider = document.getElementById("partialsSlider");
    const label = document.getElementById("partialsLabel");

    slider.addEventListener("input", (e) => {
        currentPartials = parseInt(e.target.value, 10);
        label.textContent = currentPartials;
    });

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    activeOscillators = {}

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            playNote(key);
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            const { oscs, gainNode } = activeOscillators[key];
            const time = audioCtx.currentTime;
            const releaseEM = 0.2; 
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.00001), time); //I'm using setValueAtTime here instead of set target like you said
            gainNode.gain.exponentialRampToValueAtTime(0.00001, time + releaseEM); // I tried to get setTarget to work but I kept having clicking issues
            oscs.forEach(o => o.stop(time + releaseEM + 0.01));            delete activeOscillators[key];
            fixAmps();
        }
    }
    function playNote(key) { 
        const time = audioCtx.currentTime;
        if (mode==='Normal'){
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.frequency.setValueAtTime(keyboardFrequencyMap[key], time)
            osc.type = wave 
            osc.connect(gainNode);
            gainNode.connect(globalGain);
            activeOscillators[key] = {oscs: [osc], gainNode};
            fixAmps();
            const target = max / Object.keys(activeOscillators).length;
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(0.00001, time);
            gainNode.gain.exponentialRampToValueAtTime(target, time + 0.15);
            osc.start(time);
            randoGoBills();
        }
        else if (mode==='Additive Synthesis'){
            const oscs = [];
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            const freq = keyboardFrequencyMap[key];
            gainNode.connect(globalGain);

            for (let n = 1; n <= currentPartials; n++) {
                const partial = audioCtx.createOscillator();
                partial.type = wave;
                partial.frequency.setValueAtTime(freq*currentAdditiveFreq*n, time);
                partial.connect(gainNode);
                partial.start(time);
                oscs.push(partial);
            }
            activeOscillators[key] = { oscs, gainNode };
            fixAmps();
            const target = max / Object.keys(activeOscillators).length;
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(0.00001, time);
            gainNode.gain.exponentialRampToValueAtTime(target, time + 0.15);
            randoGoBills();
        }
        else if (mode==='AM'){
            const carrier = audioCtx.createOscillator();
            carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], time)
            carrier.type = wave 

            modulatorAM = audioCtx.createOscillator();
            modulatorAM.type = "sine";
            modulatorAM.frequency.setValueAtTime(currentModFreqAM, time); //make modifiabel
            const modulated = audioCtx.createGain();
            const depth = audioCtx.createGain();
            depth.gain.setValueAtTime(0.5, time); 

            modulated.gain.setValueAtTime(1.0 - depth.gain.value, time);
            modulatorAM.connect(depth); //.connect is additive, so with [-0.5,0.5] and 0.5, the modulated signal now has output gain at [0,1]
            depth.connect(modulated.gain);
            carrier.connect(modulated);
            
            const gainNode = audioCtx.createGain();
            modulated.connect(gainNode);
            gainNode.connect(globalGain);

            activeOscillators[key] = { oscs: [carrier, modulatorAM], gainNode, modulatorAM };
            fixAmps();
            const target = max / Object.keys(activeOscillators).length;
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(0.00001, time);
            gainNode.gain.exponentialRampToValueAtTime(target, time + 0.15);
            carrier.start(time);
            modulatorAM.start(time);
            randoGoBills();
        }
        else if (mode==='FM'){
            const carrier = audioCtx.createOscillator();
            carrier.type=wave
            modulatorFM = audioCtx.createOscillator();
            modulatorFM.type = "sine";

            const freq = keyboardFrequencyMap[key];
            carrier.frequency.setValueAtTime(freq, time);

            const modulationIndex = audioCtx.createGain();
            modulationIndex.gain.setValueAtTime(currentModIndex, time);
            modulatorFM.frequency.setValueAtTime(currentModFreq, time);

            modulatorFM.connect(modulationIndex);
            modulationIndex.connect(carrier.frequency)
            
            const gainNode = audioCtx.createGain();
            carrier.connect(gainNode);
            gainNode.connect(globalGain);
            activeOscillators[key] = { oscs: [carrier, modulatorFM], gainNode, modulationIndex, modulatorFM};
            fixAmps();

            const target = max / Object.keys(activeOscillators).length;
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(0.00001, time);
            gainNode.gain.exponentialRampToValueAtTime(target, time + 0.15);
            
            carrier.start();
            modulatorFM.start();
            randoGoBills();
        }
    }
    function changeWave(waveName){
        wave = waveName;
    }
    function changeMode(modeName){
        mode = modeName;
    }

  function fixAmps() {
    const notes = Object.values(activeOscillators);
    const time = audioCtx.currentTime;
    if (notes.length == 0) return;
    const noteGain = max / notes.length;

    notes.forEach(({ gainNode }) => {
        gainNode.gain.cancelScheduledValues(time);
        const current = Math.max(gainNode.gain.value, 0.00001);
        gainNode.gain.setValueAtTime(current, time);
        gainNode.gain.linearRampToValueAtTime(noteGain, time + 0.01);
        //console.log("current:", current);

    });
  }

  function randoGoBills(){
    const img = document.createElement("img");
    const src = images[Math.floor(Math.random() * images.length)];
    img.src = src;

    img.style.position = "fixed";
    img.style.width = "300px";
    img.style.pointerEvents = "none";
    img.style.opacity = "0";
    img.style.transform = "scale(0.5)";
    img.style.transition = "opacity 0.2s ease, transform 0.2s ease";

    const x = Math.random()*(window.innerWidth - 300);
    const y = Math.random()*(window.innerHeight -300);

    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    document.body.appendChild(img);
    requestAnimationFrame(() => {
        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    });

    setTimeout(() => {
        img.style.opacity = "0";
        img.style.transform = "scale(0.7)";
    }, 700);

    setTimeout(() => img.remove(), 1000);
  }
});

function updateIndex(val) {
  currentModIndex = parseFloat(val);
  Object.values(activeOscillators || {}).forEach(v => {
    if (v.modulationIndex) {
      v.modulationIndex.gain.setValueAtTime(currentModIndex, audioCtx.currentTime);
    }
  });
}

function updateFreq(val) {
  currentModFreq = parseFloat(val);
  Object.values(activeOscillators || {}).forEach(v => {
    if (v.modulatorFM) {
      v.modulatorFM.frequency.setValueAtTime(currentModFreq, audioCtx.currentTime);
    }
  });
}

function updateFreqAM(val) {
  currentModFreqAM = parseFloat(val);
  Object.values(activeOscillators || {}).forEach(v => {
    if (v.modulatorAM) {
      v.modulatorAM.frequency.setValueAtTime(currentModFreqAM, audioCtx.currentTime);
    }
  });
}

function updateAdditive(val) {
  currentAdditiveFreq = parseFloat(val);
  Object.values(activeOscillators || {}).forEach(v => {
    if (v.modulatorAM) {
      v.modulatorAM.frequency.setValueAtTime(currentModFreqAM, audioCtx.currentTime);
    }
  });
}