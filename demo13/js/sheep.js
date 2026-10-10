(function () {
    'use strict';

    var DIFF = {
        easy: { total: 30, layers: 4, palette: 6 },
        mid: { total: 45, layers: 5, palette: 9 },
        hard: { total: 60, layers: 6, palette: 12 }
    };

    // 12 生肖 Q版小动物（内联 SVG，viewBox 100x100）
    var ANIMALS = [
        // 鼠
        '<svg viewBox="0 0 100 100"><circle cx="26" cy="26" r="15" fill="#b9bec9"/><circle cx="74" cy="26" r="15" fill="#b9bec9"/><circle cx="26" cy="26" r="8" fill="#f2b8c6"/><circle cx="74" cy="26" r="8" fill="#f2b8c6"/><ellipse cx="50" cy="56" rx="30" ry="28" fill="#c9cdd6"/><circle cx="40" cy="52" r="4" fill="#33323f"/><circle cx="60" cy="52" r="4" fill="#33323f"/><circle cx="50" cy="64" r="5" fill="#f2a8b8"/><path d="M30 60q-8 2-10 8M70 60q8 2 10 8" stroke="#9aa0ab" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
        // 牛
        '<svg viewBox="0 0 100 100"><path d="M20 30q-10-14 2-18 6 8 10 16Z" fill="#efe3d2"/><path d="M80 30q10-14-2-18-6 8-10 16Z" fill="#efe3d2"/><ellipse cx="50" cy="58" rx="32" ry="28" fill="#c58a5a"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#e6b98f"/><circle cx="38" cy="52" r="4" fill="#33323f"/><circle cx="62" cy="52" r="4" fill="#33323f"/><circle cx="44" cy="66" r="2.5" fill="#8a5a34"/><circle cx="56" cy="66" r="2.5" fill="#8a5a34"/></svg>',
        // 虎
        '<svg viewBox="0 0 100 100"><circle cx="26" cy="28" r="13" fill="#f0a63c"/><circle cx="74" cy="28" r="13" fill="#f0a63c"/><circle cx="26" cy="28" r="6" fill="#f7d3a0"/><circle cx="74" cy="28" r="6" fill="#f7d3a0"/><ellipse cx="50" cy="58" rx="31" ry="28" fill="#f5b552"/><path d="M40 34v8M50 32v9M60 34v8" stroke="#5a3b16" stroke-width="3" stroke-linecap="round"/><circle cx="39" cy="56" r="4" fill="#33323f"/><circle cx="61" cy="56" r="4" fill="#33323f"/><path d="M46 66q4 4 8 0" stroke="#5a3b16" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="44" cy="64" r="4" fill="#f3a0a0" opacity=".7"/><circle cx="56" cy="64" r="4" fill="#f3a0a0" opacity=".7"/></svg>',
        // 兔
        '<svg viewBox="0 0 100 100"><ellipse cx="38" cy="24" rx="9" ry="20" fill="#f4f4f7"/><ellipse cx="38" cy="24" rx="4.5" ry="13" fill="#f2b8c6"/><ellipse cx="62" cy="24" rx="9" ry="20" fill="#f4f4f7"/><ellipse cx="62" cy="24" rx="4.5" ry="13" fill="#f2b8c6"/><ellipse cx="50" cy="62" rx="30" ry="28" fill="#ffffff"/><circle cx="40" cy="58" r="4" fill="#33323f"/><circle cx="60" cy="58" r="4" fill="#33323f"/><circle cx="50" cy="68" r="4" fill="#f2a8b8"/><path d="M46 72q4 4 8 0" stroke="#c98aa0" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
        // 龙
        '<svg viewBox="0 0 100 100"><path d="M26 26l6-16 8 12Z" fill="#e8c86a"/><path d="M74 26l-6-16-8 12Z" fill="#e8c86a"/><ellipse cx="50" cy="58" rx="31" ry="28" fill="#5fbf6a"/><circle cx="39" cy="54" r="4.5" fill="#22331f"/><circle cx="61" cy="54" r="4.5" fill="#22331f"/><ellipse cx="50" cy="66" rx="14" ry="8" fill="#8fe08f"/><circle cx="45" cy="66" r="2.5" fill="#2f6b34"/><circle cx="55" cy="66" r="2.5" fill="#2f6b34"/><path d="M40 32v6M50 30v8M60 32v6" stroke="#2f8a3e" stroke-width="2.5" stroke-linecap="round"/></svg>',
        // 蛇
        '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="52" rx="32" ry="30" fill="#7bd08a"/><circle cx="38" cy="48" r="4.5" fill="#22331f"/><circle cx="62" cy="48" r="4.5" fill="#22331f"/><path d="M50 64v8M50 72l-6 6M50 72l6 6" stroke="#e5566a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="34" cy="60" r="3" fill="#4fa85f"/><circle cx="66" cy="60" r="3" fill="#4fa85f"/></svg>',
        // 马
        '<svg viewBox="0 0 100 100"><path d="M34 24l-6-14 14 6Z" fill="#c98a4b"/><path d="M66 24l6-14-14 6Z" fill="#c98a4b"/><ellipse cx="50" cy="56" rx="29" ry="29" fill="#d9a06b"/><path d="M50 28q10 0 12 14-12-6-24 0Q40 28 50 28Z" fill="#7a4f2a"/><circle cx="40" cy="56" r="4" fill="#33323f"/><circle cx="60" cy="56" r="4" fill="#33323f"/><ellipse cx="50" cy="70" rx="12" ry="9" fill="#c98a4b"/><circle cx="45" cy="70" r="2.5" fill="#5a3b20"/><circle cx="55" cy="70" r="2.5" fill="#5a3b20"/></svg>',
        // 羊
        '<svg viewBox="0 0 100 100"><circle cx="30" cy="30" r="12" fill="#fbf8f0"/><circle cx="70" cy="30" r="12" fill="#fbf8f0"/><circle cx="42" cy="24" r="11" fill="#fbf8f0"/><circle cx="58" cy="24" r="11" fill="#fbf8f0"/><ellipse cx="50" cy="60" rx="30" ry="27" fill="#f2ede0"/><path d="M28 40q-6-8 2-12M72 40q6-8-2-12" stroke="#d9c9a8" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="40" cy="58" r="4" fill="#4a4638"/><circle cx="60" cy="58" r="4" fill="#4a4638"/><circle cx="50" cy="68" r="4" fill="#d9b0a0"/></svg>',
        // 猴
        '<svg viewBox="0 0 100 100"><circle cx="22" cy="50" r="12" fill="#a9713f"/><circle cx="78" cy="50" r="12" fill="#a9713f"/><ellipse cx="50" cy="56" rx="30" ry="29" fill="#b97f4a"/><ellipse cx="50" cy="60" rx="20" ry="19" fill="#e6c19a"/><circle cx="41" cy="54" r="4" fill="#33323f"/><circle cx="59" cy="54" r="4" fill="#33323f"/><circle cx="46" cy="66" r="2" fill="#7a4f2a"/><circle cx="54" cy="66" r="2" fill="#7a4f2a"/><path d="M44 70q6 4 12 0" stroke="#7a4f2a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
        // 鸡
        '<svg viewBox="0 0 100 100"><path d="M36 20q4-12 10-6 4-10 8 0 6-6 10 6Z" fill="#e5566a"/><ellipse cx="50" cy="58" rx="30" ry="28" fill="#f0c94a"/><circle cx="40" cy="54" r="4" fill="#33323f"/><circle cx="60" cy="54" r="4" fill="#33323f"/><path d="M50 62l-8 8 16 0Z" fill="#f0913a"/><circle cx="44" cy="64" r="3" fill="#e5566a" opacity=".5"/><circle cx="56" cy="64" r="3" fill="#e5566a" opacity=".5"/></svg>',
        // 狗
        '<svg viewBox="0 0 100 100"><ellipse cx="22" cy="46" rx="12" ry="20" fill="#a9713f"/><ellipse cx="78" cy="46" rx="12" ry="20" fill="#a9713f"/><ellipse cx="50" cy="58" rx="30" ry="28" fill="#d29a5c"/><circle cx="40" cy="54" r="4" fill="#33323f"/><circle cx="60" cy="54" r="4" fill="#33323f"/><ellipse cx="50" cy="68" rx="12" ry="9" fill="#f0e2d0"/><ellipse cx="50" cy="63" rx="5" ry="4" fill="#33323f"/><path d="M50 67v6M50 73q-5 4-9 1M50 73q5 4 9 1" stroke="#33323f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
        // 猪
        '<svg viewBox="0 0 100 100"><path d="M26 30l-4-16 16 8Z" fill="#f2a0b4"/><path d="M74 30l4-16-16 8Z" fill="#f2a0b4"/><ellipse cx="50" cy="58" rx="31" ry="28" fill="#f7b8c6"/><circle cx="39" cy="52" r="4" fill="#33323f"/><circle cx="61" cy="52" r="4" fill="#33323f"/><ellipse cx="50" cy="68" rx="13" ry="10" fill="#f497ac"/><circle cx="45" cy="68" r="2.5" fill="#b3607a"/><circle cx="55" cy="68" r="2.5" fill="#b3607a"/></svg>'
    ];
    var COLORS = ['#ef5350', '#ffa726', '#ffca28', '#66bb6a', '#26c6da', '#42a5f5', '#7e57c2', '#ec407a', '#8d6e63', '#26a69a', '#9ccc65', '#ab47bc'];

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
    var slotCells = [];
    var inflight = 0;
    var cleared = 0;
    var over = false;
    var TS = 56;
    var LAST_ORDER = [];

    function randInt(n) { return Math.floor(Math.random() * n); }

    function tint(type) {
        var hex = COLORS[type].replace('#', '');
        var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
        function mix(c) { return Math.round(c + (255 - c) * 0.74); }
        return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
    }

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

        while (tiles.length % 3 !== 0 && tiles.length) tiles.pop();

        // 合法的“依次点出”顺序
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
            el.style.background = tint(t.type);
            el.style.borderColor = COLORS[t.type];
            el.style.zIndex = String(t.layer * 1000 + i);
            el.innerHTML = ANIMALS[t.type];
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

    function renderSlots() {
        slotEl.textContent = '';
        slotCells = [];
        for (var i = 0; i < SLOT_MAX; i++) {
            var c = document.createElement('div');
            c.className = 'slot-cell';
            if (i < bar.length) {
                c.classList.add('filled');
                c.style.background = tint(bar[i]);
                c.style.borderColor = COLORS[bar[i]];
                c.innerHTML = ANIMALS[bar[i]];
            }
            slotEl.appendChild(c);
            slotCells.push(c);
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
        startFlight(tile);
        updateCovered();
    }

    function startFlight(tile) {
        var el = tile.el;
        var from = el.getBoundingClientRect();
        el.style.visibility = 'hidden';

        var idx = Math.min(bar.length + inflight, SLOT_MAX - 1);
        var cell = slotCells[idx];
        var to = cell ? cell.getBoundingClientRect() : from;
        inflight++;

        var clone = document.createElement('div');
        clone.className = 'fly';
        clone.style.left = from.left + 'px';
        clone.style.top = from.top + 'px';
        clone.style.width = from.width + 'px';
        clone.style.height = from.height + 'px';
        clone.style.background = tint(tile.type);
        clone.style.borderColor = COLORS[tile.type];
        clone.innerHTML = ANIMALS[tile.type];
        document.body.appendChild(clone);

        requestAnimationFrame(function () {
            var dx = (to.left - from.left) + (to.width - from.width) / 2;
            var dy = (to.top - from.top) + (to.height - from.height) / 2;
            var sc = from.width ? (to.width * 0.92) / from.width : 0.6;
            clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')';
            clone.style.opacity = '0.9';
        });

        setTimeout(function () {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
            if (el.parentNode) el.parentNode.removeChild(el);
            inflight--;
            addToBar(tile.type);
        }, 300);
    }

    function addToBar(type) {
        bar.push(type);
        renderSlots();

        var idxs = [];
        for (var i = 0; i < bar.length; i++) if (bar[i] === type) idxs.push(i);

        if (idxs.length >= 3) {
            var three = idxs.slice(0, 3);
            for (var k = 0; k < three.length; k++) {
                if (slotCells[three[k]]) slotCells[three[k]].classList.add('clearing');
            }
            cleared += 3;
            updateHud();
            setTimeout(function () {
                three.sort(function (a, b) { return b - a; }).forEach(function (i) { bar.splice(i, 1); });
                renderSlots();
                checkEnd();
            }, 340);
        } else {
            updateHud();
            checkEnd();
        }
    }

    function checkEnd() {
        if (over) return;
        if (bar.length >= SLOT_MAX) { gameOver(); return; }
        if (remaining() === 0 && bar.length === 0) win();
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
        inflight = 0;
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
