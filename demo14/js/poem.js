(function () {
    'use strict';

    // 成语/词语拆成两份（每份 2 字，全局不重复，配对唯一）
    var IDIOMS = [
        ['画蛇', '添足'], ['守株', '待兔'], ['亡羊', '补牢'], ['掩耳', '盗铃'],
        ['塞翁', '失马'], ['对牛', '弹琴'], ['狐假', '虎威'], ['杯弓', '蛇影'],
        ['刻舟', '求剑'], ['井底', '之蛙'], ['叶公', '好龙'], ['滥竽', '充数'],
        ['望梅', '止渴'], ['破釜', '沉舟'], ['卧薪', '尝胆'], ['纸上', '谈兵'],
        ['惊弓', '之鸟'], ['完璧', '归赵'], ['负荆', '请罪'], ['三顾', '茅庐'],
        ['高山', '流水'], ['风花', '雪月'], ['江郎', '才尽'], ['四面', '楚歌']
    ];

    // 身份（按过关数）——古代科举
    var RANKS = [
        '白丁', '平民', '书生', '秀才·县试', '秀才·府试', '秀才·院试',
        '案首', '举人', '解元', '贡士', '会元', '进士', '状元',
        '九品官', '八品官', '七品官', '六品官', '五品官', '四品官',
        '三品官', '二品官', '一品官', '丞相', '皇帝'
    ];

    var TRAY_MAX = 4;

    var boardEl = document.getElementById('board');
    var trayEl = document.getElementById('tray');
    var holdEl = document.getElementById('hold');
    var propOutBtn = document.getElementById('prop-out');
    var propShuffleBtn = document.getElementById('prop-shuffle');
    var propEraseBtn = document.getElementById('prop-erase');
    var outCountEl = propOutBtn ? propOutBtn.querySelector('b') : null;
    var shuffleCountEl = propShuffleBtn ? propShuffleBtn.querySelector('b') : null;
    var eraseCountEl = propEraseBtn ? propEraseBtn.querySelector('b') : null;
    var rankEl = document.getElementById('rank');
    var levelEl = document.getElementById('level');
    var leftEl = document.getElementById('left');
    var slotnEl = document.getElementById('slotn');
    var soundBtn = document.getElementById('sound');
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovActions = document.getElementById('ov-actions');

    var OUT_USES = 1;
    var SHUFFLE_USES = 1;
    var ERASE_USES = 1;

    var level = 1;
    var tiles = [];
    var tray = [];
    var hold = [];
    var trayCells = [];
    var inflight = 0;
    var cleared = 0;
    var over = false;
    var outUses = OUT_USES;
    var shuffleUses = SHUFFLE_USES;
    var eraseUses = ERASE_USES;
    var pickingErase = false;
    var TS = 56;
    var soundOn = true;
    var audioCtx = null;

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
        clear: function () {
            var seq = [587, 740, 880, 1175];
            for (var i = 0; i < seq.length; i++) beep(seq[i], 0.16, 'sine', 0.07, i * 0.06);
        },
        win: function () {
            var seq = [523, 659, 784, 1047, 1319];
            for (var i = 0; i < seq.length; i++) beep(seq[i], 0.2, 'triangle', 0.07, i * 0.12);
        },
        lose: function () {
            [400, 300, 200].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.06, i * 0.14); });
        }
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
        var entries = Math.min(3 + level, 10);
        var layers = Math.min(3 + Math.floor(level / 2), 6);
        var boardW = boardEl.clientWidth;
        var boardH = boardEl.clientHeight;
        TS = Math.max(44, Math.round(boardW / 6.6));
        var step = TS / 2;
        var cols = Math.floor((boardW - TS) / step) + 1;
        var rows = Math.floor((boardH - TS) / step) + 1;

        var total = entries * 2;
        var counts = distribute(total, layers);
        tiles = [];

        for (var l = 0; l < layers; l++) {
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
                tiles.push({ x: gx * step, y: gy * step, layer: l, removed: false, entryId: 0, part: 'a', text: '' });
                made++;
            }
        }
        // 需要恰好 total 个，多了裁掉，少了补在最上层
        while (tiles.length > total) tiles.pop();
        var guard2 = 0;
        while (tiles.length < total && guard2 < 4000) {
            guard2++;
            var gx2 = randInt(cols), gy2 = randInt(rows);
            tiles.push({ x: gx2 * step, y: gy2 * step, layer: layers - 1, removed: false, entryId: 0, part: 'a', text: '' });
        }

        // 选成语并生成两半
        var pool = shuffle(IDIOMS.slice());
        var parts = [];
        for (var e = 0; e < entries; e++) {
            var idiom = pool[e % pool.length];
            parts.push({ id: e, part: 'a', text: idiom[0] });
            parts.push({ id: e, part: 'b', text: idiom[1] });
        }
        shuffle(parts);
        for (var k = 0; k < tiles.length; k++) {
            tiles[k].entryId = parts[k].id;
            tiles[k].part = parts[k].part;
            tiles[k].text = parts[k].text;
        }
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
            el.style.fontSize = Math.round(TS * 0.30) + 'px';
            el.style.zIndex = String(t.layer * 1000 + i);
            el.textContent = t.text;
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
                        c.addEventListener('pointerdown', function (e) {
                            e.preventDefault();
                            eraseAt(idx);
                        });
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
        var tile = hold.splice(idx, 1)[0];
        renderHold();
        addToTray(tile);
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

    function propOut() {
        if (over || outUses <= 0 || tray.length === 0) return;
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
        var remain = tiles.filter(function (t) { return !t.removed; });
        var datas = remain.map(function (t) { return { entryId: t.entryId, part: t.part, text: t.text }; });
        shuffle(datas);
        remain.forEach(function (t, idx) {
            t.entryId = datas[idx].entryId;
            t.part = datas[idx].part;
            t.text = datas[idx].text;
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
        pickingErase = !pickingErase;
        updateProps();
        renderTray();
    }

    function eraseAt(i) {
        if (!pickingErase || i < 0 || i >= tray.length) return;
        var tile = tray[i];
        var cell = trayCells[i];
        var rect = cell ? cell.getBoundingClientRect() : null;
        var partner = null;
        for (var k = 0; k < tiles.length; k++) {
            var t = tiles[k];
            if (!t.removed && t.entryId === tile.entryId && t.part !== tile.part) { partner = t; break; }
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
        tray.splice(i, 1);
        cleared += 2;
        renderTray();
        updateCovered();
        updateProps();
        updateHud();
        sound.clear();
        checkEnd();
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
        clone.style.fontSize = Math.round(TS * 0.30) + 'px';
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

    function addToTray(tile) {
        tray.push(tile);
        renderTray();

        var pair = null;
        for (var i = 0; i < tray.length && !pair; i++) {
            for (var j = i + 1; j < tray.length; j++) {
                if (tray[i].entryId === tray[j].entryId && tray[i].part !== tray[j].part) {
                    pair = [i, j];
                    break;
                }
            }
        }

        if (pair) {
            var a = pair[0], b = pair[1];
            if (trayCells[a]) trayCells[a].classList.add('clearing');
            if (trayCells[b]) trayCells[b].classList.add('clearing');
            if (trayCells[b]) burstAt(trayCells[b]);
            cleared += 2;
            sound.clear();
            updateHud();
            setTimeout(function () {
                tray.splice(b, 1);
                tray.splice(a, 1);
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
        showActions([
            { text: '进入第 ' + (level + 1) + ' 关', primary: true, fn: function () { level++; newGame(); } }
        ]);
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

    newGame();
})();
