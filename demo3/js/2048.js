(function () {
    'use strict';

    var SIZE = 4;
    var VECTORS = {
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 }
    };

    var boardEl = document.getElementById('board');
    var gridBg = document.getElementById('grid-bg');
    var tileLayer = document.getElementById('tile-layer');
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('best');
    var overlay = document.getElementById('overlay');
    var overlayTitle = document.getElementById('overlay-title');
    var overlayText = document.getElementById('overlay-text');
    var overlayPrimary = document.getElementById('overlay-primary');
    var overlaySecondary = document.getElementById('overlay-secondary');
    var newGameBtn = document.getElementById('new-game');

    var cells = [];
    var score = 0;
    var best = 0;
    var won = false;
    var over = false;
    var keepPlaying = false;
    var idSeq = 0;
    var tileEls = {};
    var animating = false;
    var cell = 0;
    var gap = 0;
    var pad = 0;

    function get(x, y) {
        if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return null;
        return cells[y * SIZE + x];
    }

    function set(x, y, t) {
        cells[y * SIZE + x] = t;
    }

    function eachTile(fn) {
        for (var i = 0; i < cells.length; i++) {
            if (cells[i]) fn(cells[i]);
        }
    }

    function newTile(x, y, value) {
        return {
            id: ++idSeq,
            x: x,
            y: y,
            value: value,
            prevX: x,
            prevY: y
        };
    }

    function buildGridBackground() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < SIZE * SIZE; i++) {
            var d = document.createElement('div');
            d.className = 'grid-cell';
            frag.appendChild(d);
        }
        gridBg.appendChild(frag);
    }

    function fontSizeFor(v) {
        if (v >= 1024) return cell * 0.30;
        if (v >= 128) return cell * 0.38;
        return cell * 0.46;
    }

    function placeEl(el, x, y, value) {
        el.style.width = cell + 'px';
        el.style.height = cell + 'px';
        el.style.transform = 'translate(' + (pad + x * (cell + gap)) + 'px,' +
            (pad + y * (cell + gap)) + 'px)';
        el.style.fontSize = fontSizeFor(value) + 'px';
    }

    function makeEl(tile, anim) {
        var el = document.createElement('div');
        el.className = 'tile tile-' + (tile.value > 2048 ? 'super' : tile.value);
        if (anim === 'new') el.classList.add('tile-new');
        else if (anim === 'merged') el.classList.add('tile-merged');
        var inner = document.createElement('div');
        inner.className = 'tile-inner';
        inner.textContent = tile.value;
        el.appendChild(inner);
        placeEl(el, tile.x, tile.y, tile.value);
        tileLayer.appendChild(el);
        tileEls[tile.id] = el;
        return el;
    }

    function removeEl(id) {
        var el = tileEls[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
        delete tileEls[id];
    }

    function computeLayout() {
        var w = boardEl.clientWidth;
        if (!w) return;
        pad = Math.round(w * 0.03);
        gap = pad;
        cell = (w - pad * 2 - gap * (SIZE - 1)) / SIZE;
        boardEl.style.setProperty('--pad', pad + 'px');
        boardEl.style.setProperty('--gap', gap + 'px');
    }

    function relayout() {
        computeLayout();
        tileLayer.classList.add('no-anim');
        eachTile(function (t) {
            if (tileEls[t.id]) placeEl(tileEls[t.id], t.x, t.y, t.value);
        });
        void tileLayer.offsetWidth;
        tileLayer.classList.remove('no-anim');
    }

    function addRandomTile() {
        var empties = [];
        for (var y = 0; y < SIZE; y++) {
            for (var x = 0; x < SIZE; x++) {
                if (!get(x, y)) empties.push({ x: x, y: y });
            }
        }
        if (!empties.length) return null;
        var pos = empties[Math.floor(Math.random() * empties.length)];
        var t = newTile(pos.x, pos.y, Math.random() < 0.9 ? 2 : 4);
        set(pos.x, pos.y, t);
        return t;
    }

    function buildTraversals(vec) {
        var x = [];
        var y = [];
        for (var i = 0; i < SIZE; i++) {
            x.push(i);
            y.push(i);
        }
        if (vec.x === 1) x.reverse();
        if (vec.y === 1) y.reverse();
        return { x: x, y: y };
    }

    function farthest(x, y, vec) {
        var cx = x;
        var cy = y;
        var nx = cx + vec.x;
        var ny = cy + vec.y;
        while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && !get(nx, ny)) {
            cx = nx;
            cy = ny;
            nx = cx + vec.x;
            ny = cy + vec.y;
        }
        return { farthest: { x: cx, y: cy }, next: { x: nx, y: ny } };
    }

    function movesAvailable() {
        for (var y = 0; y < SIZE; y++) {
            for (var x = 0; x < SIZE; x++) {
                var t = get(x, y);
                if (!t) return true;
                var r = get(x + 1, y);
                if (r && r.value === t.value) return true;
                var d = get(x, y + 1);
                if (d && d.value === t.value) return true;
            }
        }
        return false;
    }

    function move(dir) {
        if (over || animating || !overlay.classList.contains('hidden')) return;
        var vec = VECTORS[dir];
        var startTiles = [];
        eachTile(function (t) {
            startTiles.push(t);
            t.mergedFrom = null;
            t.prevX = t.x;
            t.prevY = t.y;
        });

        var traversals = buildTraversals(vec);
        var merges = [];
        var moved = false;

        traversals.x.forEach(function (x) {
            traversals.y.forEach(function (y) {
                var t = get(x, y);
                if (!t) return;
                var far = farthest(x, y, vec);
                var next = get(far.next.x, far.next.y);
                if (next && next.value === t.value && !next.mergedFrom) {
                    var merged = newTile(far.next.x, far.next.y, t.value * 2);
                    merged.mergedFrom = [t, next];
                    set(far.next.x, far.next.y, merged);
                    set(x, y, null);
                    t.x = far.next.x;
                    t.y = far.next.y;
                    merges.push(merged);
                    score += merged.value;
                    if (merged.value === 2048) won = true;
                    moved = true;
                } else if (far.farthest.x !== x || far.farthest.y !== y) {
                    set(x, y, null);
                    t.x = far.farthest.x;
                    t.y = far.farthest.y;
                    set(t.x, t.y, t);
                    moved = true;
                }
            });
        });

        if (!moved) return;

        var freshTile = addRandomTile();
        animate(startTiles, merges, freshTile);
        updateScore();
    }

    function animate(startTiles, merges, freshTile) {
        animating = merges.length > 0;

        startTiles.forEach(function (t) {
            var el = tileEls[t.id];
            if (el) placeEl(el, t.x, t.y, t.value);
        });

        if (freshTile) makeEl(freshTile, 'new');

        if (merges.length) {
            setTimeout(function () {
                merges.forEach(function (m) {
                    m.mergedFrom.forEach(function (src) { removeEl(src.id); });
                    makeEl(m, 'merged');
                });
                animating = false;
                finish();
            }, 110);
        } else {
            finish();
        }
    }

    function finish() {
        if (won && !keepPlaying) {
            won = false;
            showOverlay('你赢了！', '达成 2048，继续挑战更高分吧',
                '继续挑战', function () { keepPlaying = true; hideOverlay(); checkOver(); },
                '重新开始', newGame);
            return;
        }
        if (!movesAvailable()) {
            over = true;
            showOverlay('游戏结束', '本局得分 ' + score,
                '再来一局', newGame, null, null);
        }
    }

    function checkOver() {
        if (!movesAvailable()) {
            over = true;
            showOverlay('游戏结束', '本局得分 ' + score,
                '再来一局', newGame, null, null);
        }
    }

    function updateScore() {
        scoreEl.textContent = score;
        if (score > best) {
            best = score;
            bestEl.textContent = best;
            saveBest();
        }
    }

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('2048-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        bestEl.textContent = best;
    }

    function saveBest() {
        try {
            localStorage.setItem('2048-best', String(best));
        } catch (e) { /* ignore */ }
    }

    function showOverlay(title, text, primaryText, primaryFn, secondaryText, secondaryFn) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayPrimary.textContent = primaryText;
        overlayPrimary.onclick = primaryFn;
        if (secondaryText) {
            overlaySecondary.style.display = '';
            overlaySecondary.textContent = secondaryText;
            overlaySecondary.onclick = secondaryFn;
        } else {
            overlaySecondary.style.display = 'none';
            overlaySecondary.onclick = null;
        }
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
    }

    function newGame() {
        cells = new Array(SIZE * SIZE).fill(null);
        tileLayer.innerHTML = '';
        tileEls = {};
        score = 0;
        won = false;
        over = false;
        keepPlaying = false;
        animating = false;
        hideOverlay();
        computeLayout();
        addRandomTile();
        addRandomTile();
        eachTile(function (t) { makeEl(t, 'new'); });
        updateScore();
    }

    function handleSwipe(dx, dy) {
        var ax = Math.abs(dx);
        var ay = Math.abs(dy);
        if (Math.max(ax, ay) < 24) return;
        if (ax > ay) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }

    function bindInput() {
        var sx = 0;
        var sy = 0;
        var tracking = false;
        boardEl.addEventListener('pointerdown', function (e) {
            sx = e.clientX;
            sy = e.clientY;
            tracking = true;
        });
        boardEl.addEventListener('pointerup', function (e) {
            if (!tracking) return;
            tracking = false;
            handleSwipe(e.clientX - sx, e.clientY - sy);
        });
        boardEl.addEventListener('pointercancel', function () { tracking = false; });
        boardEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        window.addEventListener('keydown', function (e) {
            var k = e.key;
            var dir = null;
            if (k === 'ArrowLeft' || k === 'a' || k === 'A') dir = 'left';
            else if (k === 'ArrowRight' || k === 'd' || k === 'D') dir = 'right';
            else if (k === 'ArrowUp' || k === 'w' || k === 'W') dir = 'up';
            else if (k === 'ArrowDown' || k === 's' || k === 'S') dir = 'down';
            if (dir) {
                e.preventDefault();
                move(dir);
            }
        });
    }

    buildGridBackground();
    loadBest();
    newGame();
    bindInput();
    newGameBtn.addEventListener('click', newGame);

    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', function () {
        setTimeout(relayout, 250);
    });
})();
