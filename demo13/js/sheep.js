(function () {
    'use strict';

    var DIFF = {
        easy: { total: 30, layers: 4, palette: 6 },
        mid: { total: 45, layers: 5, palette: 8 },
        hard: { total: 60, layers: 6, palette: 10 }
    };
    var COLORS = ['#ef5350', '#ffa726', '#ffca28', '#66bb6a', '#26c6da', '#42a5f5', '#7e57c2', '#ec407a', '#8d6e63', '#26a69a'];
    var LETTERS = 'ABCDEFGHIJ';
    var SLOT_MAX = 7;

    var boardEl = document.getElementById('board');
    var slotEl = document.getElementById('slot');
    var diffSeg = document.getElementById('diff-seg');
    var leftEl = document.getElementById('left');
    var clearedEl = document.getElementById('cleared');
    var slotnEl = document.getElementById('slotn');
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var diff = 'mid';
    var tiles = [];
    var bar = [];
    var cleared = 0;
    var over = false;
    var TS = 56;
    var LAST_ORDER = [];

    function randInt(n) { return Math.floor(Math.random() * n); }

    function distribute(total, layers) {
        var w = [], sum = 0, l;
        for (l = 0; l < layers; l++) { w[l] = layers - l; sum += w[l]; }
        var c = [], used = 0;
        for (l = 0; l < layers; l++) { c[l] = Math.floor(total * w[l] / sum); used += c[l]; }
        var rem = total - used, l2 = 0;
        while (rem > 0) { c[l2 % layers]++; rem--; l2++; }
        return c;
    }

    function overlap(a, b) {
        return Math.abs(a.x - b.x) < TS * 0.6 && Math.abs(a.y - b.y) < TS * 0.6;
    }

    function isCovered(tile) {
        for (var i = 0; i < tiles.length; i++) {
            var o = tiles[i];
            if (o.removed || o === tile) continue;
            if (o.layer > tile.layer && overlap(o, tile)) return true;
        }
        return false;
    }

    function freeTiles() {
        return tiles.filter(function (t) { return !t.removed && !isCovered(t); });
    }

    function generate() {
        var cfg = DIFF[diff];
        var boardW = boardEl.clientWidth;
        var boardH = boardEl.clientHeight;
        TS = Math.max(40, Math.round(boardW / 7));
        var step = TS / 2;
        var cols = Math.floor((boardW - TS) / step) + 1;
        var rows = Math.floor((boardH - TS) / step) + 1;

        var counts = distribute(cfg.total, cfg.layers);
        tiles = [];

        for (var l = 0; l < cfg.layers; l++) {
            var used = [];
            var made = 0, guard = 0;
            while (made < counts[l] && guard < 8000) {
                guard++;
                var gx = randInt(cols), gy = randInt(rows);
                var clash = false;
                for (var u = 0; u < used.length; u++) {
                    if (Math.abs(used[u][0] - gx) < 2 && Math.abs(used[u][1] - gy) < 2) { clash = true; break; }
                }
                if (clash) continue;
                used.push([gx, gy]);
                tiles.push({ x: gx * step, y: gy * step, layer: l, removed: false, type: 0 });
                made++;
            }
        }

        // 保证总数是 3 的倍数（从最上层裁掉多余）
        while (tiles.length % 3 !== 0 && tiles.length) {
            var top = tiles[tiles.length - 1];
            tiles.splice(tiles.length - 1, 1);
            void top;
        }

        // 求一个合法的“依次点出”顺序（每次取一个当前可点的）
        var order = [];
        var remain = tiles.slice();
        while (remain.length) {
            var free = [];
            for (var i = 0; i < remain.length; i++) {
                var t = remain[i];
                var cov = false;
                for (var j = 0; j < remain.length; j++) {
                    var o = remain[j];
                    if (o !== t && o.layer > t.layer && overlap(o, t)) { cov = true; break; }
                }
                if (!cov) free.push(i);
            }
            if (!free.length) break;
            var pick = free[randInt(free.length)];
            order.push(remain[pick]);
            remain.splice(pick, 1);
        }

        // 沿该顺序每 3 个赋同一种类型 → 按顺序点必然可消除
        for (var k = 0; k < order.length; k++) {
            order[k].type = Math.floor(k / 3) % cfg.palette;
        }
        LAST_ORDER = order;
    }

    function renderTiles() {
        boardEl.textContent = '';
        var frag = document.createDocumentFragment();
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            var el = document.createElement('div');
            el.className = 'tile';
            el.style.width = TS + 'px';
            el.style.height = TS + 'px';
            el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)';
            el.style.background = COLORS[t.type];
            el.style.fontSize = Math.round(TS * 0.5) + 'px';
            el.textContent = LETTERS[t.type];
            el.style.zIndex = String(t.layer * 1000 + i);
            (function (tile, node) {
                node.addEventListener('pointerdown', function (e) {
                    e.preventDefault();
                    tryTap(tile);
                });
            })(t, el);
            t.el = el;
            frag.appendChild(el);
        }
        boardEl.appendChild(frag);
        updateCovered();
    }

    function updateCovered() {
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            if (t.removed || !t.el) continue;
            t.el.classList.toggle('covered', isCovered(t));
        }
    }

    function renderSlots(popIndex) {
        slotEl.textContent = '';
        for (var i = 0; i < SLOT_MAX; i++) {
            var c = document.createElement('div');
            c.className = 'slot-cell';
            if (i < bar.length) {
                c.classList.add('filled');
                c.style.background = COLORS[bar[i]];
                c.style.borderColor = 'rgba(255,255,255,0.75)';
                c.textContent = LETTERS[bar[i]];
                if (popIndex === i) c.classList.add('pop');
            }
            slotEl.appendChild(c);
        }
    }

    function updateHud() {
        leftEl.textContent = remaining();
        clearedEl.textContent = cleared;
        slotnEl.textContent = bar.length + '/' + SLOT_MAX;
    }

    function remaining() {
        var n = 0;
        for (var i = 0; i < tiles.length; i++) if (!tiles[i].removed) n++;
        return n;
    }

    function tryTap(tile) {
        if (over || tile.removed) return;
        if (isCovered(tile)) return;
        tile.removed = true;
        if (tile.el) {
            tile.el.classList.add('taken');
            (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200); })(tile.el);
        }
        updateCovered();
        addToBar(tile.type);
    }

    function addToBar(type) {
        bar.push(type);
        var cnt = 0;
        for (var i = 0; i < bar.length; i++) if (bar[i] === type) cnt++;
        if (cnt >= 3) {
            var removed = 0;
            for (var j = bar.length - 1; j >= 0 && removed < 3; j--) {
                if (bar[j] === type) { bar.splice(j, 1); removed++; }
            }
            cleared += 3;
            renderSlots();
        } else {
            renderSlots(bar.length - 1);
        }
        updateHud();

        if (bar.length >= SLOT_MAX) { gameOver(false); return; }
        if (remaining() === 0 && bar.length === 0) { win(); }
    }

    function win() {
        over = true;
        ovTitle.textContent = '通关！';
        ovText.innerHTML = '难度 ' + diffName() + ' · 消除 <b>' + cleared + '</b> 个';
        overlay.classList.remove('hidden');
    }

    function gameOver() {
        over = true;
        ovTitle.textContent = '槽位满了';
        ovText.innerHTML = '剩余 <b>' + remaining() + '</b> 个 · 已消 <b>' + cleared + '</b> 个';
        overlay.classList.remove('hidden');
    }

    function diffName() { return diff === 'easy' ? '简单' : diff === 'hard' ? '困难' : '中等'; }

    function newGame() {
        over = false;
        bar = [];
        cleared = 0;
        overlay.classList.add('hidden');
        generate();
        renderTiles();
        renderSlots();
        updateHud();
    }

    diffSeg.addEventListener('click', function (e) {
        var b = e.target;
        if (!b || !b.getAttribute || !b.getAttribute('data-diff')) return;
        diff = b.getAttribute('data-diff');
        var all = diffSeg.querySelectorAll('.seg-btn');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        b.classList.add('active');
        newGame();
    });

    restartBtn.addEventListener('click', newGame);
    ovBtn.addEventListener('click', newGame);

    newGame();
})();
