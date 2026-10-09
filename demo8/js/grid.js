(function () {
    'use strict';

    var bestEl = document.getElementById('best');
    var gridEl = document.getElementById('grid');
    var promptEl = document.getElementById('prompt');
    var barEl = document.getElementById('bar');
    var progressEl = document.getElementById('progress');
    var startBtn = document.getElementById('start');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var best = 0;
    var level = 1;
    var phase = 'idle';
    var cells = [];
    var targets = new Set();
    var foundSet = new Set();
    var gridSize = 3;
    var cellCount = 3;
    var hideTimer = null;
    var nextTimer = null;

    function gridSizeFor(lv) {
        return Math.min(3 + Math.floor((lv - 1) / 3), 6);
    }

    function cellCountFor(lv, g) {
        return Math.min(3 + Math.floor((lv - 1) / 2), g * g - 2);
    }

    function showMsFor(count) {
        return 600 + count * 120;
    }

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('grid-memory-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        bestEl.textContent = best;
    }

    function saveBest() {
        try { localStorage.setItem('grid-memory-best', String(best)); } catch (e) { /* ignore */ }
    }

    function setBar(ms) {
        barEl.style.transition = 'none';
        barEl.style.width = '100%';
        void barEl.offsetWidth;
        if (ms > 0) {
            barEl.style.transition = 'width ' + ms + 'ms linear';
            barEl.style.width = '0%';
        }
    }

    function buildGrid(g) {
        gridEl.textContent = '';
        gridEl.style.gridTemplateColumns = 'repeat(' + g + ', 1fr)';
        gridEl.style.gridTemplateRows = 'repeat(' + g + ', 1fr)';
        cells = [];
        var total = g * g;
        for (var i = 0; i < total; i++) {
            var c = document.createElement('div');
            c.className = 'cell';
            c.setAttribute('data-i', i);
            c.addEventListener('pointerdown', onCell);
            gridEl.appendChild(c);
            cells.push(c);
        }
    }

    function onCell(e) {
        e.preventDefault();
        if (phase !== 'input') return;
        var c = e.currentTarget;
        var i = parseInt(c.getAttribute('data-i'), 10);
        if (foundSet.has(i)) return;

        if (targets.has(i)) {
            c.classList.add('found');
            foundSet.add(i);
            if (foundSet.size === targets.size) success();
        } else {
            c.classList.add('miss');
            fail();
        }
    }

    function startGame() {
        overlay.classList.add('hidden');
        level = 1;
        loadBest();
        nextRound();
    }

    function nextRound() {
        clearTimeout(nextTimer);
        phase = 'showing';
        gridSize = gridSizeFor(level);
        cellCount = cellCountFor(level, gridSize);
        progressEl.textContent = '第 ' + level + ' 关 · ' + gridSize + '×' + gridSize + ' · ' + cellCount + ' 格';

        buildGrid(gridSize);
        promptEl.classList.add('hidden');

        targets = new Set();
        foundSet = new Set();
        var total = gridSize * gridSize;
        while (targets.size < cellCount) {
            targets.add(Math.floor(Math.random() * total));
        }
        targets.forEach(function (idx) { cells[idx].classList.add('lit'); });

        var ms = showMsFor(cellCount);
        setBar(ms);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideLit, ms);
    }

    function hideLit() {
        phase = 'input';
        targets.forEach(function (idx) { cells[idx].classList.remove('lit'); });
        promptEl.textContent = '点击刚才亮起的格子';
        promptEl.classList.remove('hidden');
        setTimeout(function () { promptEl.classList.add('hidden'); }, 900);
    }

    function success() {
        phase = 'flash';
        if (level > best) {
            best = level;
            saveBest();
        }
        bestEl.textContent = best;
        promptEl.textContent = '正确！';
        promptEl.classList.remove('hidden');
        level++;
        nextTimer = setTimeout(nextRound, 700);
    }

    function fail() {
        phase = 'over';
        clearTimeout(hideTimer);
        promptEl.classList.add('hidden');
        ovTitle.textContent = '游戏结束';
        ovText.innerHTML = '本次通过 <b>' + best + '</b> 关';
        overlay.classList.remove('hidden');
    }

    startBtn.addEventListener('click', startGame);
    ovBtn.addEventListener('click', startGame);

    loadBest();
    buildGrid(gridSize);
})();
