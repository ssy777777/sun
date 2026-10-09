(function () {
    'use strict';

    var boardEl = document.getElementById('board');
    var sizeSeg = document.getElementById('size-seg');
    var targetEl = document.getElementById('target');
    var timerEl = document.getElementById('timer');
    var bestEl = document.getElementById('best');
    var errorsEl = document.getElementById('errors');
    var dotBtn = document.getElementById('center-dot');
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');
    var hintEl = document.getElementById('hint');

    var size = 5;
    var total = 25;
    var next = 1;
    var errors = 0;
    var started = false;
    var finished = false;
    var startTime = 0;
    var timerId = null;
    var dot = null;

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = (Math.random() * (i + 1)) | 0;
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function fmtTime(ms) {
        var s = ms / 1000;
        if (s < 60) return s.toFixed(2);
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2);
    }

    function bestKey() { return 'schulte-best-' + size; }

    function loadBest() {
        try {
            var v = localStorage.getItem(bestKey());
            return v ? parseInt(v, 10) : null;
        } catch (e) {
            return null;
        }
    }

    function saveBest(ms) {
        try { localStorage.setItem(bestKey(), String(ms)); } catch (e) { /* ignore */ }
    }

    function updateBestDisplay() {
        var b = loadBest();
        bestEl.textContent = b == null ? '--' : fmtTime(b);
    }

    function layout() {
        var w = boardEl.clientWidth;
        if (!w) return;
        var gap = 6;
        var pad = 8;
        var cs = (w - pad * 2 - gap * (size - 1)) / size;
        boardEl.style.setProperty('--cell', cs + 'px');
    }

    function build() {
        boardEl.textContent = '';
        boardEl.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
        boardEl.style.gridTemplateRows = 'repeat(' + size + ', 1fr)';

        dot = document.createElement('div');
        dot.className = 'dot';
        boardEl.appendChild(dot);

        var nums = [];
        for (var i = 1; i <= total; i++) nums.push(i);
        shuffle(nums);

        for (var k = 0; k < nums.length; k++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cell';
            b.textContent = nums[k];
            b.setAttribute('data-val', nums[k]);
            b.addEventListener('pointerdown', onCell);
            boardEl.appendChild(b);
        }
        layout();
    }

    function markDone(btn) {
        btn.classList.add('done');
    }

    function onCell(e) {
        e.preventDefault();
        var btn = e.currentTarget;
        if (finished || btn.classList.contains('done')) return;
        var v = parseInt(btn.getAttribute('data-val'), 10);

        if (!started) {
            if (v !== 1) return;
            started = true;
            startTimer();
            markDone(btn);
            next = 2;
            targetEl.textContent = next > total ? '✓' : next;
            if (next > total) finish();
            return;
        }

        if (v === next) {
            markDone(btn);
            next++;
            targetEl.textContent = next > total ? '✓' : next;
            if (next > total) finish();
        } else {
            errors++;
            errorsEl.textContent = errors;
            btn.classList.add('err');
            setTimeout(function () { btn.classList.remove('err'); }, 320);
        }
    }

    function startTimer() {
        stopTimer();
        startTime = Date.now();
        timerEl.textContent = '0.00';
        timerId = setInterval(tick, 30);
    }

    function tick() {
        timerEl.textContent = fmtTime(Date.now() - startTime);
    }

    function stopTimer() {
        if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function finish() {
        finished = true;
        stopTimer();
        var ms = Date.now() - startTime;
        timerEl.textContent = fmtTime(ms);

        var prev = loadBest();
        var isRecord = prev == null || ms < prev;
        if (isRecord) saveBest(ms);
        var bestMs = isRecord ? ms : prev;
        updateBestDisplay();

        ovTitle.textContent = isRecord ? '新纪录！' : '完成！';
        ovText.textContent = size + '×' + size + ' · 用时 ' + fmtTime(ms) + ' 秒 · 失误 ' + errors +
            (isRecord ? '' : ' · 最好 ' + fmtTime(bestMs));
        overlay.classList.remove('hidden');
    }

    function restart() {
        stopTimer();
        started = false;
        finished = false;
        next = 1;
        errors = 0;
        targetEl.textContent = '1';
        timerEl.textContent = '0.00';
        errorsEl.textContent = '0';
        overlay.classList.add('hidden');
        hintEl.textContent = '从 1 开始，按顺序点到 ' + total;
        build();
        updateBestDisplay();
    }

    function setSize(n) {
        size = n;
        total = n * n;
        restart();
    }

    sizeSeg.addEventListener('click', function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute('data-size')) return;
        size = parseInt(b.getAttribute('data-size'), 10);
        total = size * size;
        var all = sizeSeg.querySelectorAll('.seg-btn');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        b.classList.add('active');
        restart();
    });

    restartBtn.addEventListener('click', restart);
    ovBtn.addEventListener('click', restart);
    dotBtn.addEventListener('click', function () {
        boardEl.classList.toggle('show-dot');
        dotBtn.classList.toggle('active', boardEl.classList.contains('show-dot'));
    });

    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

    restart();
})();
