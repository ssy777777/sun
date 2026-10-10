(function () {
    'use strict';

    // 身份（按过关数）——古代科举
    var RANKS = [
        '白丁', '平民', '书生', '秀才·县试', '秀才·府试', '秀才·院试',
        '案首', '举人', '解元', '贡士', '会元', '进士', '状元',
        '九品官', '八品官', '七品官', '六品官', '五品官', '四品官',
        '三品官', '二品官', '一品官', '丞相', '皇帝'
    ];
    var TRAY_MAX = 4;
    var OUT_USES = 1, SHUFFLE_USES = 1, ERASE_USES = 1;
    var HINT_SECONDS = 15;

    var boardEl = document.getElementById('board');
    var subBoardsEl = document.getElementById('sub-boards');
    var trayEl = document.getElementById('tray');
    var holdEl = document.getElementById('hold');
    var rankEl = document.getElementById('rank');
    var levelEl = document.getElementById('level');
    var leftEl = document.getElementById('left');
    var slotnEl = document.getElementById('slotn');
    var soundBtn = document.getElementById('sound');
    var propOutBtn = document.getElementById('prop-out');
    var propShuffleBtn = document.getElementById('prop-shuffle');
    var propEraseBtn = document.getElementById('prop-erase');
    var outCountEl = propOutBtn ? propOutBtn.querySelector('b') : null;
    var shuffleCountEl = propShuffleBtn ? propShuffleBtn.querySelector('b') : null;
    var eraseCountEl = propEraseBtn ? propEraseBtn.querySelector('b') : null;
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovActions = document.getElementById('ov-actions');
    var consoleEl = document.getElementById('console');
    var consoleNow = document.getElementById('console-now');
    var consoleToggle = document.getElementById('console-toggle');
    var consoleList = document.getElementById('console-list');

    var WORDS = window.WORDS || [];
    var WORD_SET = window.WORD_SET || {};
    var DICT = window.DICT || {};

    var level = 1;
    var tiles = [];
    var boards = [];
    var tray = [];
    var hold = [];
    var trayCells = [];
    var inflight = 0;
    var cleared = 0;
    var over = false;
    var outUses = OUT_USES, shuffleUses = SHUFFLE_USES, eraseUses = ERASE_USES;
    var pickingErase = false;
    var soundOn = true;
    var audioCtx = null;
    var TS = 56;
    var idle = 0;
    var hintTimer = null;
    var history = [];

    function randInt(n) { return Math.floor(Math.random() * n); }
    function rankFor(lv) { return RANKS[Math.min(lv - 1, RANKS.length - 1)]; }
    function nextRankAfter(lv) { return RANKS[Math.min(lv, RANKS.length - 1)]; }

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
        place: function () { beep(620, 0.06, 'sine', 0.04); },
        clear: function () { [587, 740, 880, 1175].forEach(function (f, i) { beep(f, 0.16, 'sine', 0.07, i * 0.06); }); },
        win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.2, 'triangle', 0.07, i * 0.12); }); },
        lose: function () { [400, 300, 200].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.06, i * 0.14); }); }
    };

    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = randInt(i + 1);
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
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
        if (a.board !== b.board) return false;
        var ts = (a.ts + b.ts) / 2;
        return Math.abs(a.x - b.x) < ts * 0.6 && Math.abs(a.y - b.y) < ts * 0.6;
    }

    function isCovered(tile) {
        for (var i = 0; i < tiles.length; i++) {
            var o = tiles[i];
            if (o.removed || o === tile || o.board !== tile.board) continue;
            if (o.layer > tile.layer && overlap(o, tile)) return true;
        }
        return false;
    }

    function planBoards(totalTiles) {
        var specs;
        if (level * 10 >= 50) {
            var small = Math.max(2, Math.round(totalTiles * 0.10));
            specs = [{ small: false, count: totalTiles - 2 * small }, { small: true, count: small }, { small: true, count: small }];
        } else {
            specs = [{ small: false, count: totalTiles }];
        }
        return specs;
    }

    function placeBoard(b, count) {
        var step = b.ts / 2;
        var cols = Math.max(2, Math.floor((b.W - b.ts) / step) + 1);
        var rows = Math.max(2, Math.floor((b.H - b.ts) / step) + 1);
        var placed = 0, layer = 0;
        while (placed < count && layer < 80) {
            var cells = [];
            for (var gx = 0; gx < cols; gx++) {
                for (var gy = 0; gy < rows; gy++) cells.push([gx, gy]);
            }
            shuffle(cells);
            var used = [];
            for (var c = 0; c < cells.length && placed < count; c++) {
                var x = cells[c][0], y = cells[c][1];
                var clash = false;
                for (var u = 0; u < used.length; u++) {
                    if (Math.abs(used[u][0] - x) < 2 && Math.abs(used[u][1] - y) < 2) { clash = true; break; }
                }
                if (clash) continue;
                used.push([x, y]);
                tiles.push({ board: b.id, ts: b.ts, x: x * step, y: y * step, layer: layer, removed: false, text: '', word: '' });
                placed++;
            }
            layer++;
        }
        return placed;
    }

    function generate() {
        var wordCount = Math.min(level * 10, WORDS.length);
        var totalTiles = wordCount * 2;

        subBoardsEl.textContent = '';
        boardEl.classList.remove('small');
        boards = [];
        var specs = planBoards(totalTiles);
        for (var i = 0; i < specs.length; i++) {
            var el;
            if (i === 0) {
                el = boardEl;
            } else {
                el = document.createElement('div');
                el.className = 'board small';
                subBoardsEl.appendChild(el);
            }
            boards.push({ el: el, id: i, small: specs[i].small, count: specs[i].count, W: 0, H: 0, ts: 56 });
        }

        tiles = [];
        for (var b = 0; b < boards.length; b++) {
            var bd = boards[b];
            bd.W = bd.el.clientWidth;
            bd.H = bd.el.clientHeight;
            bd.ts = Math.max(34, Math.round(bd.W / 7));
            placeBoard(bd, bd.count);
        }

        if (tiles.length % 2 !== 0) tiles.pop();
        var wc = Math.floor(tiles.length / 2);
        var pool = shuffle(WORDS.slice());
        if (!pool.length) return;
        var flat = [];
        for (var k = 0; k < wc; k++) {
            var w = pool[k % pool.length];
            flat.push({ text: w.slice(0, 2), word: w });
            flat.push({ text: w.slice(2, 4), word: w });
        }
        shuffle(flat);
        for (var t = 0; t < tiles.length; t++) {
            tiles[t].text = flat[t].text;
            tiles[t].word = flat[t].word;
        }
    }

    function renderTiles() {
        boardEl.textContent = '';
        for (var b = 1; b < boards.length; b++) boards[b].el.textContent = '';
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            var el = document.createElement('div');
            el.className = 'tile';
            el.style.width = t.ts + 'px';
            el.style.height = t.ts + 'px';
            el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)';
            el.style.fontSize = Math.round(t.ts * 0.30) + 'px';
            el.style.zIndex = String(t.layer * 1000 + i);
            el.textContent = t.text;
            (function (tile, node) {
                node.addEventListener('pointerdown', function (e) {
                    e.preventDefault();
                    tryTap(tile);
                });
            })(t, el);
            t.el = el;
            boards[t.board].el.appendChild(el);
        }
        updateCovered();
    }

    function updateCovered() {
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            if (t.removed || !t.el) continue;
            t.el.classList.toggle('covered', isCovered(t));
        }
    }

    function renderTray() {
        trayEl.textContent = '';
        trayCells = [];
        for (var i = 0; i < TRAY_MAX; i++) {
            var c = document.createElement('div');
            c.className = 'tray-cell';
            if (i < tray.length) {
                c.classList.add('filled');
                c.textContent = tray[i].text;
                if (pickingErase) {
                    c.classList.add('pick');
                    (function (idx) {
                        c.addEventListener('pointerdown', function (e) { e.preventDefault(); eraseAt(idx); });
                    })(i);
                }
            }
            trayEl.appendChild(c);
            trayCells.push(c);
        }
    }

    function renderHold() {
        holdEl.textContent = '';
        for (var i = 0; i < 2; i++) {
            var c = document.createElement('div');
            c.className = 'hold-cell';
            if (i < hold.length) {
                c.classList.add('filled');
                c.textContent = hold[i].text;
                (function (idx) {
                    c.addEventListener('pointerdown', function (e) { e.preventDefault(); returnHeld(idx); });
                })(i);
            }
            holdEl.appendChild(c);
        }
    }

    function updateProps() {
        if (propOutBtn) propOutBtn.disabled = outUses <= 0 || over;
        if (propShuffleBtn) propShuffleBtn.disabled = shuffleUses <= 0 || over;
        if (propEraseBtn) propEraseBtn.disabled = eraseUses <= 0 || over;
        if (outCountEl) outCountEl.textContent = outUses;
        if (shuffleCountEl) shuffleCountEl.textContent = shuffleUses;
        if (eraseCountEl) eraseCountEl.textContent = eraseUses;
        if (propEraseBtn) propEraseBtn.classList.toggle('picking', pickingErase);
    }

    function updateHud() {
        levelEl.textContent = level;
        rankEl.textContent = rankFor(level);
        leftEl.textContent = remaining();
        slotnEl.textContent = tray.length + '/' + TRAY_MAX;
    }

    function remaining() {
        var n = 0;
        for (var i = 0; i < tiles.length; i++) if (!tiles[i].removed) n++;
        return n;
    }

    function freeTiles() {
        var out = [];
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            if (!t.removed && !isCovered(t)) out.push(t);
        }
        return out;
    }

    function showMeaning(word) {
        var e = DICT[word] || { m: '', o: '' };
        history.push({ word: word, m: e.m, o: e.o });
        renderConsole(word, e);
    }

    function renderConsole(word, e) {
        if (consoleNow) {
            consoleNow.textContent = '';
            if (word) {
                var b = document.createElement('b');
                b.textContent = word;
                consoleNow.appendChild(b);
                consoleNow.appendChild(document.createTextNode('：' + (e.m || '')));
                if (e.o) {
                    var o = document.createElement('i');
                    o.textContent = '　出处：' + e.o;
                    consoleNow.appendChild(o);
                }
            } else {
                consoleNow.textContent = '';
            }
        }
        if (consoleToggle) consoleToggle.textContent = '记录 ' + history.length + ' ▾';
        if (consoleList) {
            consoleList.textContent = '';
            for (var i = history.length - 1; i >= 0; i--) {
                var it = history[i];
                var d = document.createElement('div');
                d.className = 'item';
                var wb = document.createElement('b');
                wb.textContent = it.word;
                d.appendChild(wb);
                d.appendChild(document.createTextNode('：' + (it.m || '')));
                if (it.o) {
                    var oi = document.createElement('i');
                    oi.textContent = '出处：' + it.o;
                    d.appendChild(oi);
                }
                consoleList.appendChild(d);
            }
        }
    }

    function onAction() { resetIdle(); }

    function resetIdle() {
        idle = 0;
        clearHint();
    }

    function clearHint() {
        if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].el) tiles[i].el.classList.remove('hint');
        }
    }

    function tickIdle() {
        if (over) return;
        idle++;
        if (idle >= HINT_SECONDS) {
            idle = 0;
            showHint();
        }
    }

    function showHint() {
        var free = freeTiles();
        for (var i = 0; i < free.length; i++) {
            for (var j = i + 1; j < free.length; j++) {
                var a = free[i], b = free[j];
                if (WORD_SET[a.text + b.text] || WORD_SET[b.text + a.text]) {
                    if (a.el) a.el.classList.add('hint');
                    if (b.el) b.el.classList.add('hint');
                    if (hintTimer) clearTimeout(hintTimer);
                    hintTimer = setTimeout(clearHint, 4000);
                    return;
                }
            }
        }
    }

    function tryTap(tile) {
        if (over || tile.removed) return;
        if (isCovered(tile)) return;
        onAction();
        tile.removed = true;
        startFlight(tile);
        updateCovered();
    }

    function startFlight(tile) {
        var el = tile.el;
        var from = el.getBoundingClientRect();
        el.style.visibility = 'hidden';

        var idx = Math.min(tray.length + inflight, TRAY_MAX - 1);
        var cell = trayCells[idx];
        var to = cell ? cell.getBoundingClientRect() : from;
        inflight++;

        var clone = document.createElement('div');
        clone.className = 'fly';
        clone.style.left = from.left + 'px';
        clone.style.top = from.top + 'px';
        clone.style.width = from.width + 'px';
        clone.style.height = from.height + 'px';
        clone.style.fontSize = Math.round(tile.ts * 0.30) + 'px';
        clone.textContent = tile.text;
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
            addToTray(tile);
        }, 300);
    }

    function findPair() {
        for (var i = 0; i < tray.length; i++) {
            for (var j = i + 1; j < tray.length; j++) {
                var c1 = tray[i].text + tray[j].text;
                var c2 = tray[j].text + tray[i].text;
                if (WORD_SET[c1]) return { i: i, j: j, word: c1 };
                if (WORD_SET[c2]) return { i: i, j: j, word: c2 };
            }
        }
        return null;
    }

    function addToTray(tile) {
        tray.push(tile);
        renderTray();

        var pair = findPair();
        if (pair) {
            if (trayCells[pair.i]) trayCells[pair.i].classList.add('clearing');
            if (trayCells[pair.j]) trayCells[pair.j].classList.add('clearing');
            if (trayCells[pair.j]) burstAt(trayCells[pair.j]);
            showMeaning(pair.word);
            cleared += 2;
            sound.clear();
            updateHud();
            setTimeout(function () {
                tray.splice(pair.j, 1);
                tray.splice(pair.i, 1);
                renderTray();
                checkEnd();
            }, 340);
        } else {
            sound.place();
            updateHud();
            checkEnd();
        }
    }

    function checkEnd() {
        if (over) return;
        if (tray.length >= TRAY_MAX) { gameOver(); return; }
        if (remaining() === 0 && tray.length === 0) levelClear();
    }

    function levelClear() {
        over = true;
        sound.win();
        var promoted = nextRankAfter(level);
        ovTitle.textContent = '过关！';
        ovText.innerHTML = '晋升为 <b>' + promoted + '</b>';
        showActions([{ text: '进入第 ' + (level + 1) + ' 关', primary: true, fn: function () { level++; newGame(); } }]);
        overlay.classList.remove('hidden');
        updateProps();
    }

    function gameOver() {
        over = true;
        sound.lose();
        ovTitle.textContent = '卡槽满了';
        ovText.innerHTML = '当前身份 <b>' + rankFor(level) + '</b> · 第 <b>' + level + '</b> 关';
        showActions([
            { text: '重试本关', primary: true, fn: function () { newGame(); } },
            { text: '从头再来', fn: function () { level = 1; newGame(); } }
        ]);
        overlay.classList.remove('hidden');
        updateProps();
    }

    function showActions(list) {
        ovActions.textContent = '';
        for (var i = 0; i < list.length; i++) {
            (function (item) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = item.primary ? 'primary' : 'act';
                b.textContent = item.text;
                b.addEventListener('click', item.fn);
                ovActions.appendChild(b);
            })(list[i]);
        }
    }

    function returnHeld(idx) {
        if (over || idx < 0 || idx >= hold.length) return;
        onAction();
        var tile = hold.splice(idx, 1)[0];
        renderHold();
        addToTray(tile);
    }

    function propOut() {
        if (over || outUses <= 0 || tray.length === 0) return;
        onAction();
        var moved = 0;
        while (moved < 2 && tray.length > 0) { hold.push(tray.pop()); moved++; }
        outUses--;
        pickingErase = false;
        renderTray();
        renderHold();
        updateProps();
        updateHud();
        sound.place();
    }

    function propShuffle() {
        if (over || shuffleUses <= 0) return;
        onAction();
        var remain = tiles.filter(function (t) { return !t.removed; });
        var datas = remain.map(function (t) { return { text: t.text, word: t.word }; });
        shuffle(datas);
        remain.forEach(function (t, idx) {
            t.text = datas[idx].text;
            t.word = datas[idx].word;
            if (t.el) t.el.textContent = t.text;
        });
        shuffleUses--;
        pickingErase = false;
        updateProps();
        sound.place();
    }

    function propErase() {
        if (over || eraseUses <= 0) return;
        if (tray.length === 0) return;
        onAction();
        pickingErase = !pickingErase;
        updateProps();
        renderTray();
    }

    function eraseAt(i) {
        if (!pickingErase || i < 0 || i >= tray.length) return;
        onAction();
        var tile = tray[i];
        var cell = trayCells[i];
        var rect = cell ? cell.getBoundingClientRect() : null;

        var partner = null, word = null;
        var board = tiles.filter(function (t) { return !t.removed; });
        for (var k = 0; k < board.length; k++) {
            var c1 = tile.text + board[k].text;
            var c2 = board[k].text + tile.text;
            if (WORD_SET[c1]) { partner = board[k]; word = c1; break; }
            if (WORD_SET[c2]) { partner = board[k]; word = c2; break; }
        }
        pickingErase = false;
        eraseUses--;
        if (rect) burstAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (partner) {
            partner.removed = true;
            if (partner.el) {
                partner.el.classList.add('taken');
                (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200); })(partner.el);
            }
        }
        if (word) showMeaning(word);
        tray.splice(i, 1);
        cleared += 2;
        renderTray();
        updateCovered();
        updateProps();
        updateHud();
        sound.clear();
        checkEnd();
    }

    function burstAtPoint(cx, cy) {
        for (var i = 0; i < 9; i++) {
            var p = document.createElement('span');
            p.className = 'particle';
            p.textContent = (i % 3 === 0) ? '✿' : '★';
            p.style.left = cx + 'px';
            p.style.top = cy + 'px';
            document.body.appendChild(p);
            (function (el) {
                var ang = Math.random() * Math.PI * 2;
                var dist = 24 + Math.random() * 44;
                var dx = Math.round(Math.cos(ang) * dist);
                var dy = Math.round(Math.sin(ang) * dist - 16);
                requestAnimationFrame(function () {
                    el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.3) rotate(' + Math.floor(Math.random() * 360) + 'deg)';
                    el.style.opacity = '0';
                });
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
            })(p);
        }
    }

    function burstAt(cell) {
        var r = cell.getBoundingClientRect();
        burstAtPoint(r.left + r.width / 2, r.top + r.height / 2);
    }

    function newGame() {
        over = false;
        tray = [];
        hold = [];
        inflight = 0;
        cleared = 0;
        outUses = OUT_USES;
        shuffleUses = SHUFFLE_USES;
        eraseUses = ERASE_USES;
        pickingErase = false;
        resetIdle();
        history = [];
        if (consoleEl) consoleEl.classList.remove('open');
        renderConsole('', null);
        overlay.classList.add('hidden');
        generate();
        renderTiles();
        renderTray();
        renderHold();
        updateProps();
        updateHud();
    }

    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
        if (soundOn) sound.place();
    });
    restartBtn.addEventListener('click', function () { level = 1; newGame(); });
    if (propOutBtn) propOutBtn.addEventListener('click', propOut);
    if (propShuffleBtn) propShuffleBtn.addEventListener('click', propShuffle);
    if (propEraseBtn) propEraseBtn.addEventListener('click', propErase);
    if (consoleEl) consoleEl.addEventListener('click', function () { consoleEl.classList.toggle('open'); });

    setInterval(tickIdle, 1000);

    newGame();
})();
