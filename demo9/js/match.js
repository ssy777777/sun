(function () {
    'use strict';

    var DIFF = {
        easy: { cols: 4, rows: 4 },
        medium: { cols: 4, rows: 6 },
        hard: { cols: 6, rows: 6 }
    };
    var SYMS = 'ABCDEFGHIJKLMNOPQR';

    var boardEl = document.getElementById('board');
    var diffSeg = document.getElementById('diff-seg');
    var movesEl = document.getElementById('moves');
    var timerEl = document.getElementById('timer');
    var bestEl = document.getElementById('best');
    var progressEl = document.getElementById('progress');
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var difficulty = 'easy';
    var cols = 4;
    var rows = 4;
    var pairs = 8;
    var deck = [];
    var cardEls = [];
    var flipped = [];
    var matched = 0;
    var moves = 0;
    var lock = false;
    var started = false;
    var startTime = 0;
    var timerId = null;

    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = (Math.random() * (i + 1)) | 0;
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function loadBest() {
        var v = null;
        try { v = localStorage.getItem('match-best-' + difficulty); } catch (e) { v = null; }
        bestEl.textContent = v ? v + ' 步' : '--';
        return v ? parseInt(v, 10) : null;
    }

    function saveBest(m) {
        try { localStorage.setItem('match-best-' + difficulty, String(m)); } catch (e) { /* ignore */ }
    }

    function fmtTime(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

    function startTimer() {
        stopTimer();
        startTime = Date.now();
        timerEl.textContent = '0:00';
        timerId = setInterval(function () {
            timerEl.textContent = fmtTime(Date.now() - startTime);
        }, 200);
    }

    function stopTimer() {
        if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function layout() {
        var w = Math.min(window.innerWidth - 32, 460);
        var maxH = window.innerHeight - 240;
        var byH = maxH * cols / rows;
        if (byH > 0) w = Math.min(w, byH);
        if (w < 200) w = 200;
        boardEl.style.width = Math.round(w) + 'px';
        var gap = 8;
        var card = (w - gap * (cols - 1)) / cols;
        boardEl.style.setProperty('--card', card + 'px');
    }

    function build() {
        boardEl.textContent = '';
        boardEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        cardEls = [];

        for (var i = 0; i < deck.length; i++) {
            (function (idx) {
                var card = document.createElement('button');
                card.type = 'button';
                card.className = 'card';
                card.setAttribute('data-i', idx);

                var inner = document.createElement('div');
                inner.className = 'card-inner';
                var back = document.createElement('div');
                back.className = 'face back';
                var front = document.createElement('div');
                front.className = 'face front';
                var item = deck[idx];
                front.textContent = item.sym;
                front.style.background = 'hsl(' + item.hue + ', 72%, 91%)';
                front.style.color = 'hsl(' + item.hue + ', 58%, 34%)';
                front.style.border = '1px solid hsl(' + item.hue + ', 60%, 82%)';

                inner.appendChild(back);
                inner.appendChild(front);
                card.appendChild(inner);
                card.addEventListener('pointerdown', onCard);
                boardEl.appendChild(card);
                cardEls.push(card);
            })(i);
        }
        layout();
    }

    function onCard(e) {
        e.preventDefault();
        if (lock) return;
        var card = e.currentTarget;
        var i = parseInt(card.getAttribute('data-i'), 10);
        if (card.classList.contains('matched') || card.classList.contains('flipped')) return;

        if (!started) { started = true; startTimer(); }

        card.classList.add('flipped');
        flipped.push(i);

        if (flipped.length === 2) {
            moves++;
            movesEl.textContent = moves;
            lock = true;
            var a = flipped[0], b = flipped[1];
            if (deck[a].sym === deck[b].sym) {
                cardEls[a].classList.add('matched');
                cardEls[b].classList.add('matched');
                matched++;
                flipped = [];
                lock = false;
                if (matched === pairs) win();
            } else {
                cardEls[a].classList.add('miss');
                cardEls[b].classList.add('miss');
                setTimeout(function () {
                    cardEls[a].classList.remove('flipped', 'miss');
                    cardEls[b].classList.remove('flipped', 'miss');
                    flipped = [];
                    lock = false;
                }, 750);
            }
        }
    }

    function win() {
        stopTimer();
        var ms = Date.now() - startTime;
        var prev = loadBest();
        var isRecord = prev == null || moves < prev;
        if (isRecord) saveBest(moves);
        loadBest();

        ovTitle.textContent = isRecord ? '新纪录！' : '完成！';
        ovText.textContent = fmtTime(ms) + ' · ' + moves + ' 步' + (isRecord ? '' : ' · 最好 ' + prev + ' 步');
        overlay.classList.remove('hidden');
    }

    function newGame() {
        var cfg = DIFF[difficulty];
        cols = cfg.cols;
        rows = cfg.rows;
        pairs = (cols * rows) / 2;

        deck = [];
        for (var p = 0; p < pairs; p++) {
            var item = { sym: SYMS[p], hue: Math.round(p * (360 / pairs)) };
            deck.push(item, { sym: item.sym, hue: item.hue });
        }
        shuffle(deck);

        flipped = [];
        matched = 0;
        moves = 0;
        lock = false;
        started = false;
        stopTimer();

        movesEl.textContent = '0';
        timerEl.textContent = '0:00';
        progressEl.textContent = cols + '×' + rows + ' · ' + pairs + ' 对';
        overlay.classList.add('hidden');

        build();
        loadBest();
    }

    diffSeg.addEventListener('click', function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute('data-diff')) return;
        difficulty = b.getAttribute('data-diff');
        var all = diffSeg.querySelectorAll('.seg-btn');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        b.classList.add('active');
        newGame();
    });

    restartBtn.addEventListener('click', newGame);
    ovBtn.addEventListener('click', newGame);
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

    newGame();
})();
