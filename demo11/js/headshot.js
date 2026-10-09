(function () {
    'use strict';

    var DURATION = 30;
    var EXPIRE_MS = 2200;
    var HEAD_POINTS = 20;
    var BODY_POINTS = 10;

    var playEl = document.getElementById('play');
    var tipEl = document.getElementById('tip');
    var scoreEl = document.getElementById('score');
    var hsEl = document.getElementById('hs');
    var accEl = document.getElementById('acc');
    var timeEl = document.getElementById('time');
    var bestEl = document.getElementById('best');
    var startBtn = document.getElementById('start');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var score = 0;
    var headshots = 0;
    var hits = 0;
    var misses = 0;
    var timeLeft = DURATION;
    var best = 0;
    var playing = false;
    var targetEl = null;
    var expireTimer = null;
    var tickTimer = null;

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('headshot-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        bestEl.textContent = best;
    }

    function saveBest() {
        try { localStorage.setItem('headshot-best', String(best)); } catch (e) { /* ignore */ }
    }

    function accuracy() {
        var total = hits + misses;
        return total === 0 ? 100 : Math.round((hits / total) * 100);
    }

    function updateHud() {
        scoreEl.textContent = score;
        hsEl.textContent = headshots;
        accEl.textContent = accuracy() + '%';
        timeEl.textContent = timeLeft;
    }

    function removeTarget() {
        if (expireTimer) { clearTimeout(expireTimer); expireTimer = null; }
        if (targetEl && targetEl.parentNode) targetEl.parentNode.removeChild(targetEl);
        targetEl = null;
    }

    function spawnTarget() {
        if (!playing) return;
        removeTarget();
        var w = playEl.clientWidth;
        var h = playEl.clientHeight;
        var size = 72 + Math.round(Math.random() * 26);
        var r = size / 2 + 4;
        var x = r + Math.random() * (w - 2 * r);
        var y = r + Math.random() * (h - 2 * r);

        var t = document.createElement('div');
        t.className = 'target';
        t.style.width = size + 'px';
        t.style.height = size + 'px';
        t.style.left = (x - size / 2) + 'px';
        t.style.top = (y - size / 2) + 'px';

        var head = document.createElement('div');
        head.className = 'head';
        t.appendChild(head);

        head.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (!playing) return;
            clearTimeout(expireTimer);
            expireTimer = null;
            score += HEAD_POINTS;
            headshots++;
            hits++;
            showPop(e.clientX, e.clientY, '+' + HEAD_POINTS + ' 爆头', 'headshot');
            removeTarget();
            updateHud();
            spawnTarget();
        });

        t.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            if (!playing) return;
            clearTimeout(expireTimer);
            expireTimer = null;
            score += BODY_POINTS;
            hits++;
            showPop(e.clientX, e.clientY, '+' + BODY_POINTS, '');
            removeTarget();
            updateHud();
            spawnTarget();
        });

        playEl.appendChild(t);
        targetEl = t;

        expireTimer = setTimeout(function () {
            if (!playing) return;
            misses++;
            updateHud();
            spawnTarget();
        }, EXPIRE_MS);
    }

    function showPop(clientX, clientY, text, cls) {
        var rect = playEl.getBoundingClientRect();
        var p = document.createElement('div');
        p.className = 'pop' + (cls ? ' ' + cls : '');
        p.textContent = text;
        p.style.left = (clientX - rect.left) + 'px';
        p.style.top = (clientY - rect.top) + 'px';
        playEl.appendChild(p);
        setTimeout(function () {
            if (p.parentNode) p.parentNode.removeChild(p);
        }, 700);
    }

    function startGame() {
        overlay.classList.add('hidden');
        removeTarget();
        score = 0;
        headshots = 0;
        hits = 0;
        misses = 0;
        timeLeft = DURATION;
        playing = true;
        tipEl.classList.add('hidden');
        updateHud();
        loadBest();

        clearInterval(tickTimer);
        tickTimer = setInterval(function () {
            timeLeft--;
            if (timeLeft < 0) timeLeft = 0;
            updateHud();
            if (timeLeft <= 0) endGame();
        }, 1000);

        spawnTarget();
    }

    function endGame() {
        playing = false;
        clearInterval(tickTimer);
        tickTimer = null;
        removeTarget();

        var isRecord = score > best;
        if (isRecord) { best = score; saveBest(); }
        bestEl.textContent = best;

        ovTitle.textContent = isRecord ? '新纪录！' : '时间到！';
        ovText.innerHTML = '得分 <b>' + score + '</b> · 爆头 <b>' + headshots + '</b> · 命中率 <b>' +
            accuracy() + '%</b>' + (isRecord ? '' : ' · 最好 <b>' + best + '</b>');
        overlay.classList.remove('hidden');
    }

    playEl.addEventListener('pointerdown', function (e) {
        if (!playing) return;
        if (e.target !== playEl) return;
        misses++;
        showPop(e.clientX, e.clientY, '空枪', 'miss');
        updateHud();
    });
    playEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    startBtn.addEventListener('click', startGame);
    ovBtn.addEventListener('click', startGame);

    loadBest();
    updateHud();
})();
