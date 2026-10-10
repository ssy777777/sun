(function () {
    'use strict';

    var T = 30;              // 试次数
    var STIM = 500;          // 刺激呈现时长(ms)
    var MATCH = 0.28;        // 目标匹配比例
    var LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
    var SPEEDS = { slow: 3000, mid: 2400, fast: 1800 };

    var boardEl = document.getElementById('board');
    var progEl = document.getElementById('prog');
    var nvalEl = document.getElementById('nval');
    var accEl = document.getElementById('acc');
    var bestEl = document.getElementById('best');
    var btnVis = document.getElementById('btn-vis');
    var btnAud = document.getElementById('btn-aud');
    var overlay = document.getElementById('overlay');
    var startScreen = document.getElementById('start-screen');
    var resultScreen = document.getElementById('result-screen');
    var nSeg = document.getElementById('n-seg');
    var spdSeg = document.getElementById('spd-seg');
    var startBtn = document.getElementById('start');
    var againBtn = document.getElementById('again');
    var resTitle = document.getElementById('res-title');
    var resText = document.getElementById('res-text');

    var cells = [];
    var n = 2;
    var speed = 'mid';
    var seqVis = [];
    var seqAud = [];
    var i = 0;
    var phase = 'idle';       // idle | ready | play | done
    var respVis = false;
    var respAud = false;
    var statsVis = null;
    var statsAud = null;
    var stimTimer = null;
    var trialTimer = null;
    var readyTimer = null;
    var audioCtx = null;

    function newStats() { return { hit: 0, miss: 0, fa: 0, cr: 0 }; }

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function toneFor(idx) {
        var ac = getAudio();
        if (!ac) return;
        var freq = 300 * Math.pow(2, idx / 6);
        var t0 = ac.currentTime;
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.4);
    }

    function playAudio(idx) {
        var letter = LETTERS[idx];
        if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
            try {
                var u = new window.SpeechSynthesisUtterance(letter);
                u.lang = 'en-US';
                u.rate = 0.85;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
                return;
            } catch (e) { /* fall through */ }
        }
        toneFor(idx);
    }

    function genSeq(len, nback, alphabet, rate) {
        var s = [];
        for (var k = 0; k < len; k++) {
            if (k >= nback && Math.random() < rate) {
                s.push(s[k - nback]);
            } else {
                var v;
                do {
                    v = alphabet[Math.floor(Math.random() * alphabet.length)];
                } while (k >= nback && v === s[k - nback]);
                s.push(v);
            }
        }
        return s;
    }

    function buildBoard() {
        boardEl.textContent = '';
        cells = [];
        for (var k = 0; k < 9; k++) {
            var c = document.createElement('div');
            c.className = 'cell';
            boardEl.appendChild(c);
            cells.push(c);
        }
    }

    function updateLive() {
        progEl.textContent = Math.min(i, T) + '/' + T;
        var done = statsVis.hit + statsVis.miss + statsVis.fa + statsVis.cr +
            statsAud.hit + statsAud.miss + statsAud.fa + statsAud.cr;
        if (done > 0) {
            var correct = statsVis.hit + statsVis.cr + statsAud.hit + statsAud.cr;
            accEl.textContent = Math.round((correct / done) * 100) + '%';
        }
    }

    function evaluate(idx) {
        var isVis = idx >= n && seqVis[idx] === seqVis[idx - n];
        var isAud = idx >= n && seqAud[idx] === seqAud[idx - n];

        if (isVis) { if (respVis) statsVis.hit++; else statsVis.miss++; }
        else { if (respVis) statsVis.fa++; else statsVis.cr++; }

        if (isAud) { if (respAud) statsAud.hit++; else statsAud.miss++; }
        else { if (respAud) statsAud.fa++; else statsAud.cr++; }
    }

    function startTrial() {
        if (phase !== 'play') return;
        if (i >= T) { finish(); return; }

        respVis = false;
        respAud = false;
        progEl.textContent = (i) + '/' + T;

        var cell = cells[seqVis[i]];
        cell.classList.add('on');
        stimTimer = setTimeout(function () { cell.classList.remove('on'); }, STIM);
        playAudio(seqAud[i]);

        trialTimer = setTimeout(function () {
            evaluate(i);
            i++;
            updateLive();
            startTrial();
        }, SPEEDS[speed]);
    }

    function startGame() {
        overlay.classList.add('hidden');
        startScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        nvalEl.textContent = n;
        loadBest();

        seqVis = genSeq(T, n, [0, 1, 2, 3, 4, 5, 6, 7, 8], MATCH);
        seqAud = genSeq(T, n, [0, 1, 2, 3, 4, 5, 6, 7], MATCH);
        i = 0;
        statsVis = newStats();
        statsAud = newStats();
        respVis = false;
        respAud = false;
        accEl.textContent = '--';
        progEl.textContent = '0/' + T;

        phase = 'ready';
        readyTimer = setTimeout(function () {
            phase = 'play';
            startTrial();
        }, 1200);
    }

    function accOf(s) {
        var total = s.hit + s.miss + s.fa + s.cr;
        return total ? Math.round(((s.hit + s.cr) / total) * 100) : 0;
    }

    function finish() {
        phase = 'done';
        clearTimeout(stimTimer);
        clearTimeout(trialTimer);
        var av = accOf(statsVis);
        var aa = accOf(statsAud);
        var overall = Math.round((av + aa) / 2);

        var key = 'nback-best-' + n;
        var best = 0;
        try { best = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { best = 0; }
        var record = overall > best;
        if (record) {
            try { localStorage.setItem(key, String(overall)); } catch (e) { /* ignore */ }
            best = overall;
        }
        bestEl.textContent = best;

        resTitle.textContent = record ? '新纪录！' : '训练完成';
        resText.innerHTML = 'N = <b>' + n + '</b> · 综合正确率 <b>' + overall + '%</b><br>' +
            '位置 <b>' + av + '%</b>（命中 ' + statsVis.hit + ' / 漏报 ' + statsVis.miss +
            ' / 误报 ' + statsVis.fa + '）<br>' +
            '声音 <b>' + aa + '%</b>（命中 ' + statsAud.hit + ' / 漏报 ' + statsAud.miss +
            ' / 误报 ' + statsAud.fa + '）';

        startScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        overlay.classList.remove('hidden');
    }

    function respondVis() {
        if (phase !== 'play') return;
        respVis = true;
        flash(btnVis);
    }

    function respondAud() {
        if (phase !== 'play') return;
        respAud = true;
        flash(btnAud);
    }

    function flash(el) {
        el.classList.add('hit');
        setTimeout(function () { el.classList.remove('hit'); }, 90);
    }

    function updateBestDisplay() {
        var best = 0;
        try { best = parseInt(localStorage.getItem('nback-best-' + n) || '0', 10) || 0; } catch (e) { best = 0; }
        bestEl.textContent = best;
    }

    function loadBest() { updateBestDisplay(); }

    function resetToMenu() {
        phase = 'idle';
        clearTimeout(readyTimer);
        clearTimeout(stimTimer);
        clearTimeout(trialTimer);
        for (var k = 0; k < cells.length; k++) cells[k].classList.remove('on');
        startScreen.classList.remove('hidden');
        resultScreen.classList.add('hidden');
        overlay.classList.remove('hidden');
        updateBestDisplay();
    }

    nSeg.addEventListener('click', function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute('data-n')) return;
        n = parseInt(b.getAttribute('data-n'), 10);
        var all = nSeg.querySelectorAll('.seg-btn');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
        b.classList.add('active');
        nvalEl.textContent = n;
        updateBestDisplay();
    });

    spdSeg.addEventListener('click', function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute('data-spd')) return;
        speed = b.getAttribute('data-spd');
        var all = spdSeg.querySelectorAll('.seg-btn');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('active');
        b.classList.add('active');
    });

    btnVis.addEventListener('click', respondVis);
    btnAud.addEventListener('click', respondAud);
    startBtn.addEventListener('click', startGame);
    againBtn.addEventListener('click', function () { resetToMenu(); });

    window.addEventListener('keydown', function (e) {
        var k = e.key.toLowerCase();
        if (k === 'l') { e.preventDefault(); respondVis(); }
        else if (k === 'a') { e.preventDefault(); respondAud(); }
    });

    buildBoard();
    loadBest();
})();
