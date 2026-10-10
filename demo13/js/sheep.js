(function () {
    'use strict';

    var DIFF = {
        easy: { total: 30, layers: 4, palette: 6 },
        mid: { total: 45, layers: 5, palette: 9 },
        hard: { total: 60, layers: 6, palette: 12 }
    };

    // ---------- 12 生肖 Q版小人（头 + 身体 + 夸张表情）----------
    function chibi(c) {
        var s = '<svg viewBox="0 0 100 100">';
        if (c.ears) s += c.ears;
        s += '<rect x="33" y="62" width="34" height="30" rx="16" fill="' + c.body + '"/>';
        s += '<circle cx="28" cy="76" r="7.5" fill="' + c.body + '"/><circle cx="72" cy="76" r="7.5" fill="' + c.body + '"/>';
        s += '<rect x="39" y="87" width="10" height="10" rx="5" fill="' + (c.foot || c.body) + '"/><rect x="51" y="87" width="10" height="10" rx="5" fill="' + (c.foot || c.body) + '"/>';
        s += '<ellipse cx="50" cy="44" rx="31" ry="29" fill="' + c.head + '"/>';
        if (c.faceTop) s += c.faceTop;
        s += '<ellipse cx="38.5" cy="42" rx="7.5" ry="8.5" fill="#fff"/><ellipse cx="61.5" cy="42" rx="7.5" ry="8.5" fill="#fff"/>';
        s += '<circle cx="40" cy="43" r="4.2" fill="#2b2b38"/><circle cx="60" cy="43" r="4.2" fill="#2b2b38"/>';
        s += '<circle cx="38" cy="40.5" r="1.7" fill="#fff"/><circle cx="58" cy="40.5" r="1.7" fill="#fff"/>';
        s += '<ellipse cx="26" cy="52" rx="6" ry="4" fill="#f7a6b8" opacity=".6"/><ellipse cx="74" cy="52" rx="6" ry="4" fill="#f7a6b8" opacity=".6"/>';
        if (c.nose) s += c.nose;
        s += (c.mouth || '<path d="M45 56q5 5 10 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>');
        s += '</svg>';
        return s;
    }

    var M = '<path d="M45 56q5 5 10 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>';

    var ANIMALS = [
        // 鼠
        chibi({
            head: '#c9cdd6', body: '#c9cdd6',
            ears: '<circle cx="23" cy="23" r="14" fill="#c9cdd6"/><circle cx="77" cy="23" r="14" fill="#c9cdd6"/><circle cx="23" cy="23" r="7.5" fill="#f2b8c6"/><circle cx="77" cy="23" r="7.5" fill="#f2b8c6"/>',
            nose: '<circle cx="50" cy="52" r="4" fill="#f2a8b8"/>'
        }),
        // 牛
        chibi({
            head: '#c58a5a', body: '#c58a5a',
            ears: '<path d="M20 28q-12-14-2-20 5 9 13 15Z" fill="#efe3d2"/><path d="M80 28q12-14 2-20-5 9-13 15Z" fill="#efe3d2"/>',
            nose: '<ellipse cx="50" cy="54" rx="13" ry="9" fill="#e6b98f"/><circle cx="45" cy="54" r="2.4" fill="#8a5a34"/><circle cx="55" cy="54" r="2.4" fill="#8a5a34"/>',
            mouth: ''
        }),
        // 虎
        chibi({
            head: '#f5b552', body: '#f5b552',
            ears: '<circle cx="23" cy="24" r="12" fill="#f5b552"/><circle cx="77" cy="24" r="12" fill="#f5b552"/><circle cx="23" cy="24" r="6" fill="#f7d3a0"/><circle cx="77" cy="24" r="6" fill="#f7d3a0"/>',
            faceTop: '<path d="M40 24v9M50 22v10M60 24v9" stroke="#5a3b16" stroke-width="3" stroke-linecap="round"/>',
            nose: '<path d="M45 51l5 4 5-4Z" fill="#8a1f1f"/>',
            mouth: '<path d="M50 55v5M50 60q-5 4-9 0M50 60q5 4 9 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>'
        }),
        // 兔
        chibi({
            head: '#ffffff', body: '#ffffff', foot: '#eceaf2',
            ears: '<ellipse cx="37" cy="13" rx="8" ry="21" fill="#ffffff"/><ellipse cx="37" cy="13" rx="4" ry="14" fill="#f2b8c6"/><ellipse cx="63" cy="13" rx="8" ry="21" fill="#ffffff"/><ellipse cx="63" cy="13" rx="4" ry="14" fill="#f2b8c6"/>',
            nose: '<circle cx="50" cy="52" r="4" fill="#f2a8b8"/>'
        }),
        // 龙
        chibi({
            head: '#5fbf6a', body: '#5fbf6a',
            ears: '<path d="M26 26l6-18 9 13Z" fill="#e8c86a"/><path d="M74 26l-6-18-9 13Z" fill="#e8c86a"/>',
            nose: '<ellipse cx="50" cy="53" rx="10" ry="6" fill="#8fe08f"/><circle cx="45.5" cy="53" r="2" fill="#2f6b34"/><circle cx="54.5" cy="53" r="2" fill="#2f6b34"/>',
            mouth: '<path d="M44 60q6 4 12 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>'
        }),
        // 蛇
        chibi({
            head: '#7bd08a', body: '#7bd08a',
            mouth: '<path d="M50 52v8M50 60l-6 6M50 60l6 6" stroke="#e5566a" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        }),
        // 马
        chibi({
            head: '#d9a06b', body: '#d9a06b',
            ears: '<path d="M30 26l-8-16 15 6Z" fill="#c98a4b"/><path d="M70 26l8-16-15 6Z" fill="#c98a4b"/>',
            faceTop: '<path d="M50 16q14 0 16 17-14-8-32 0Q36 16 50 16Z" fill="#7a4f2a"/>',
            nose: '<ellipse cx="50" cy="55" rx="11" ry="8" fill="#c98a4b"/><circle cx="45.5" cy="55" r="2.2" fill="#5a3b20"/><circle cx="54.5" cy="55" r="2.2" fill="#5a3b20"/>',
            mouth: ''
        }),
        // 羊
        chibi({
            head: '#f2ede0', body: '#ffffff', foot: '#e8e1d2',
            ears: '<circle cx="28" cy="27" r="12" fill="#fbf8f0"/><circle cx="72" cy="27" r="12" fill="#fbf8f0"/><circle cx="40" cy="21" r="11" fill="#fbf8f0"/><circle cx="60" cy="21" r="11" fill="#fbf8f0"/><path d="M20 33q-8-8 0-14M80 33q8-8 0-14" stroke="#d9c9a8" stroke-width="4" fill="none" stroke-linecap="round"/>',
            nose: '<circle cx="50" cy="53" r="3.4" fill="#d9b0a0"/>'
        }),
        // 猴
        chibi({
            head: '#b97f4a', body: '#b97f4a',
            ears: '<circle cx="20" cy="46" r="12" fill="#a9713f"/><circle cx="80" cy="46" r="12" fill="#a9713f"/>',
            faceTop: '<ellipse cx="50" cy="48" rx="22" ry="20" fill="#e6c19a"/>',
            mouth: '<path d="M44 57q6 5 12 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>'
        }),
        // 鸡
        chibi({
            head: '#f0c94a', body: '#f0c94a',
            ears: '<path d="M35 20q4-13 10-7 4-11 9 0 6-7 10 7Z" fill="#e5566a"/>',
            nose: '<path d="M50 50l-8 8 16 0Z" fill="#f0913a"/>',
            mouth: ''
        }),
        // 狗
        chibi({
            head: '#d29a5c', body: '#d29a5c',
            ears: '<ellipse cx="20" cy="46" rx="11" ry="20" fill="#a9713f"/><ellipse cx="80" cy="46" rx="11" ry="20" fill="#a9713f"/>',
            nose: '<ellipse cx="50" cy="55" rx="12" ry="9" fill="#f0e2d0"/><ellipse cx="50" cy="50" rx="5" ry="4" fill="#33323f"/>',
            mouth: '<path d="M50 54v5M50 59q-5 4-9 1M50 59q5 4 9 1" stroke="#33323f" stroke-width="2" fill="none" stroke-linecap="round"/>'
        }),
        // 猪
        chibi({
            head: '#f7b8c6', body: '#f7b8c6',
            ears: '<path d="M28 26l-4-16 16 8Z" fill="#f2a0b4"/><path d="M72 26l4-16-16 8Z" fill="#f2a0b4"/>',
            nose: '<ellipse cx="50" cy="54" rx="12" ry="9" fill="#f497ac"/><circle cx="45.5" cy="54" r="2.3" fill="#b3607a"/><circle cx="54.5" cy="54" r="2.3" fill="#b3607a"/>',
            mouth: ''
        })
    ];

    var COLORS = ['#ef5350', '#ffa726', '#ffca28', '#66bb6a', '#26c6da', '#42a5f5', '#7e57c2', '#ec407a', '#8d6e63', '#26a69a', '#9ccc65', '#ab47bc'];

    var SLOT_MAX = 7;

    var boardEl = document.getElementById('board');
    var slotEl = document.getElementById('slot');
    var holdEl = document.getElementById('hold');
    var diffSeg = document.getElementById('diff-seg');
    var leftEl = document.getElementById('left');
    var clearedEl = document.getElementById('cleared');
    var slotnEl = document.getElementById('slotn');
    var soundBtn = document.getElementById('sound');
    var propOutBtn = document.getElementById('prop-out');
    var propShuffleBtn = document.getElementById('prop-shuffle');
    var outCountEl = propOutBtn ? propOutBtn.querySelector('b') : null;
    var shuffleCountEl = propShuffleBtn ? propShuffleBtn.querySelector('b') : null;
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var OUT_USES = 1;
    var SHUFFLE_USES = 1;

    var diff = 'mid';
    var tiles = [];
    var bar = [];
    var hold = [];
    var slotCells = [];
    var inflight = 0;
    var cleared = 0;
    var over = false;
    var outUses = OUT_USES;
    var shuffleUses = SHUFFLE_USES;
    var TS = 56;
    var LAST_ORDER = [];
    var soundOn = true;
    var audioCtx = null;

    function randInt(n) { return Math.floor(Math.random() * n); }

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function beep(freq, dur, type, vol, delay) {
        if (!soundOn) return;
        var ac = getAudio();
        if (!ac) return;
        var t0 = ac.currentTime + (delay || 0);
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(vol || 0.06, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
    }

    var sound = {
        place: function () { beep(660, 0.06, 'sine', 0.04); },
        clear: function () {
            var seq = [523, 659, 784, 1047];
            for (var i = 0; i < seq.length; i++) beep(seq[i], 0.16, 'sine', 0.07, i * 0.06);
        },
        win: function () {
            var seq = [523, 659, 784, 1047, 1319];
            for (var i = 0; i < seq.length; i++) beep(seq[i], 0.2, 'triangle', 0.07, i * 0.12);
        },
        lose: function () {
            var seq = [400, 300, 200];
            for (var i = 0; i < seq.length; i++) beep(seq[i], 0.25, 'sawtooth', 0.06, i * 0.14);
        }
    };

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

    function renderHold() {
        holdEl.textContent = '';
        for (var i = 0; i < 3; i++) {
            var c = document.createElement('div');
            c.className = 'hold-cell';
            if (i < hold.length) {
                c.classList.add('filled');
                c.style.background = tint(hold[i]);
                c.style.borderColor = COLORS[hold[i]];
                c.innerHTML = ANIMALS[hold[i]];
                (function (idx) {
                    c.addEventListener('pointerdown', function (e) {
                        e.preventDefault();
                        returnHeld(idx);
                    });
                })(i);
            }
            holdEl.appendChild(c);
        }
    }

    function returnHeld(idx) {
        if (over || idx < 0 || idx >= hold.length) return;
        var type = hold.splice(idx, 1)[0];
        renderHold();
        addToBar(type);
    }

    function updateProps() {
        if (propOutBtn) propOutBtn.disabled = outUses <= 0 || over;
        if (propShuffleBtn) propShuffleBtn.disabled = shuffleUses <= 0 || over;
        if (outCountEl) outCountEl.textContent = outUses;
        if (shuffleCountEl) shuffleCountEl.textContent = shuffleUses;
    }

    function propOut() {
        if (over || outUses <= 0 || bar.length === 0) return;
        var moved = 0;
        while (moved < 3 && bar.length > 0) { hold.push(bar.pop()); moved++; }
        outUses--;
        renderSlots();
        renderHold();
        updateProps();
        updateHud();
        sound.place();
    }

    function propShuffle() {
        if (over || shuffleUses <= 0) return;
        var remain = tiles.filter(function (t) { return !t.removed; });
        var types = remain.map(function (t) { return t.type; });
        for (var i = types.length - 1; i > 0; i--) {
            var j = randInt(i + 1);
            var tmp = types[i]; types[i] = types[j]; types[j] = tmp;
        }
        remain.forEach(function (t, idx) {
            t.type = types[idx];
            if (t.el) {
                t.el.innerHTML = ANIMALS[t.type];
                t.el.style.background = tint(t.type);
                t.el.style.borderColor = COLORS[t.type];
            }
        });
        shuffleUses--;
        updateProps();
        sound.place();
    }

    function burstAt(cell, color) {
        var r = cell.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        for (var i = 0; i < 10; i++) {
            var p = document.createElement('span');
            p.className = 'particle';
            p.textContent = '★';
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            p.style.color = (i % 2 === 0) ? color : '#ffd54f';
            document.body.appendChild(p);
            (function (el) {
                var ang = Math.random() * Math.PI * 2;
                var dist = 26 + Math.random() * 46;
                var dx = Math.round(Math.cos(ang) * dist);
                var dy = Math.round(Math.sin(ang) * dist - 18);
                requestAnimationFrame(function () {
                    el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.3) rotate(' + Math.floor(Math.random() * 360) + 'deg)';
                    el.style.opacity = '0';
                });
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
            })(p);
        }
    }

    function tryTap(tile) {
        if (over || tile.removed) return;
        if (isCovered(tile)) return;
        tile.removed = true;
        sound.place();
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
                if (slotCells[three[k]]) {
                    slotCells[three[k]].classList.add('clearing');
                    burstAt(slotCells[three[k]], COLORS[type]);
                }
            }
            cleared += 3;
            sound.clear();
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
        sound.win();
        ovTitle.textContent = '通关！';
        ovText.innerHTML = '难度 ' + diffName() + ' · 消除 <b>' + cleared + '</b> 个';
        overlay.classList.remove('hidden');
        updateProps();
    }

    function gameOver() {
        over = true;
        sound.lose();
        ovTitle.textContent = '槽位满了';
        ovText.innerHTML = '剩余 <b>' + remaining() + '</b> 个 · 已消 <b>' + cleared + '</b> 个';
        overlay.classList.remove('hidden');
        updateProps();
    }

    function diffName() { return diff === 'easy' ? '简单' : diff === 'hard' ? '困难' : '中等'; }

    function newGame() {
        over = false;
        bar = [];
        hold = [];
        inflight = 0;
        cleared = 0;
        outUses = OUT_USES;
        shuffleUses = SHUFFLE_USES;
        overlay.classList.add('hidden');
        generate();
        renderTiles();
        renderSlots();
        renderHold();
        updateProps();
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

    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
        if (soundOn) sound.place();
    });

    if (propOutBtn) propOutBtn.addEventListener('click', propOut);
    if (propShuffleBtn) propShuffleBtn.addEventListener('click', propShuffle);

    restartBtn.addEventListener('click', newGame);
    ovBtn.addEventListener('click', newGame);

    newGame();
})();
