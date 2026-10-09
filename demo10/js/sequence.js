(function () {
    'use strict';

    var N = 9;
    var FREQ = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];

    var gridEl = document.getElementById('grid');
    var msgEl = document.getElementById('msg');
    var bestEl = document.getElementById('best');
    var progressEl = document.getElementById('progress');
    var soundBtn = document.getElementById('sound');
    var startBtn = document.getElementById('start');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var tiles = [];
    var sequence = [];
    var level = 1;
    var inputIndex = 0;
    var best = 0;
    var phase = 'idle';
    var soundOn = true;
    var audioCtx = null;
    var stepTimer = null;

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function tone(i) {
        if (!soundOn) return;
        var ac = getAudio();
        if (!ac) return;
        var t0 = ac.currentTime;
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(FREQ[i] || 440, t0);
        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.3);
    }

    function build() {
        gridEl.textContent = '';
        tiles = [];
        for (var i = 0; i < N; i++) {
            (function (idx) {
                var t = document.createElement('button');
                t.type = 'button';
                t.className = 'tile';
                t.style.setProperty('--c', 'hsl(' + (idx * 40) + ', 72%, 58%)');
                t.setAttribute('data-i', idx);
                t.addEventListener('pointerdown', onTile);
                gridEl.appendChild(t);
                tiles.push(t);
            })(i);
        }
    }

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('sequence-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        bestEl.textContent = best;
    }

    function saveBest() {
        try { localStorage.setItem('sequence-best', String(best)); } catch (e) { /* ignore */ }
    }

    function showMsg(text, hold) {
        msgEl.textContent = text;
        msgEl.classList.add('show');
        if (hold) {
            setTimeout(function () { msgEl.classList.remove('show'); }, hold);
        }
    }

    function flash(i, dur) {
        var t = tiles[i];
        t.classList.add('flash');
        tone(i);
        setTimeout(function () { t.classList.remove('flash'); }, dur);
    }

    function randomTile() {
        return Math.floor(Math.random() * N);
    }

    function startGame() {
        overlay.classList.add('hidden');
        clearTimeout(stepTimer);
        level = 1;
        sequence = [];
        loadBest();
        for (var i = 0; i < 3; i++) sequence.push(randomTile());
        playSequence();
    }

    function playSequence() {
        phase = 'play';
        inputIndex = 0;
        progressEl.textContent = '第 ' + level + ' 关 · ' + sequence.length + ' 步';
        showMsg('看好了…', 900);

        var i = 0;
        stepTimer = setTimeout(function step() {
            if (phase !== 'play') return;
            if (i >= sequence.length) {
                phase = 'input';
                showMsg('该你了', 800);
                return;
            }
            flash(sequence[i], 380);
            i++;
            stepTimer = setTimeout(step, 620);
        }, 600);
    }

    function onTile(e) {
        e.preventDefault();
        if (phase !== 'input') return;
        var t = e.currentTarget;
        var i = parseInt(t.getAttribute('data-i'), 10);
        flash(i, 220);

        if (sequence[inputIndex] === i) {
            inputIndex++;
            t.classList.add('good');
            setTimeout(function () { t.classList.remove('good'); }, 180);
            if (inputIndex === sequence.length) success();
        } else {
            t.classList.add('wrong');
            fail();
        }
    }

    function success() {
        phase = 'flash';
        var len = sequence.length;
        if (len > best) {
            best = len;
            saveBest();
        }
        bestEl.textContent = best;
        showMsg('正确！', 700);
        level++;
        sequence.push(randomTile());
        clearTimeout(stepTimer);
        stepTimer = setTimeout(playSequence, 850);
    }

    function fail() {
        phase = 'over';
        clearTimeout(stepTimer);
        ovTitle.textContent = '游戏结束';
        ovText.innerHTML = '本次复现 <b>' + best + '</b> 步';
        overlay.classList.remove('hidden');
    }

    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
    });
    startBtn.addEventListener('click', startGame);
    ovBtn.addEventListener('click', startGame);

    soundBtn.classList.add('active');
    build();
    loadBest();
    progressEl.textContent = '第 1 关 · 3 步';
})();
