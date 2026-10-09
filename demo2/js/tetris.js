(function () {
    'use strict';

    var COLS = 10;
    var ROWS = 20;
    var BLOCK = 30;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    var boardCanvas = document.getElementById('board');
    var ctx = boardCanvas.getContext('2d');
    var nextCanvas = document.getElementById('next');
    var nctx = nextCanvas.getContext('2d');
    var holdCanvas = document.getElementById('hold');
    var hctx = holdCanvas.getContext('2d');

    var overlay = document.getElementById('overlay');
    var overlayTitle = document.getElementById('overlay-title');
    var overlayText = document.getElementById('overlay-text');
    var overlayBtn = document.getElementById('overlay-btn');
    var pauseBtn = document.getElementById('pause-btn');
    var restartBtn = document.getElementById('restart-btn');
    var soundBtn = document.getElementById('sound-btn');
    var comboEl = document.getElementById('combo');
    var overlayStats = document.getElementById('overlay-stats');

    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('best');
    var levelEl = document.getElementById('level');
    var linesEl = document.getElementById('lines');

    setupCanvas(boardCanvas, ctx, COLS * BLOCK, ROWS * BLOCK);
    setupCanvas(nextCanvas, nctx, 120, 120);
    setupCanvas(holdCanvas, hctx, 120, 120);

    var COLORS = {
        I: '#3ad6f0',
        J: '#4d7cff',
        L: '#ffa63d',
        O: '#ffe14d',
        S: '#43e08a',
        T: '#b45cff',
        Z: '#ff5b6e'
    };

    var SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        O: [[1, 1], [1, 1]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };

    var TYPES = Object.keys(SHAPES);
    var LINE_POINTS = [0, 100, 300, 500, 800];

    var board;
    var piece;
    var nextType;
    var holdType = null;
    var canHold = true;
    var bag = [];
    var score = 0;
    var lines = 0;
    var level = 1;
    var best = 0;
    var dropCounter = 0;
    var dropInterval = 800;
    var lastTime = 0;
    var state = 'idle';
    var rafId = null;
    var clearingRows = [];
    var clearAnimStart = 0;
    var clearTimer = null;
    var soundOn = true;
    var audioCtx = null;
    var combo = -1;
    var maxCombo = 0;
    var pieceStats = { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 };
    var pieceCount = 0;
    var comboTimer = null;

    function setupCanvas(canvas, c, w, h) {
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function createBoard() {
        var rows = [];
        for (var y = 0; y < ROWS; y++) {
            rows.push(new Array(COLS).fill(null));
        }
        return rows;
    }

    function pull() {
        if (bag.length === 0) {
            bag = TYPES.slice();
            for (var i = bag.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = bag[i];
                bag[i] = bag[j];
                bag[j] = t;
            }
        }
        return bag.pop();
    }

    function collide(b, p) {
        var m = p.matrix;
        for (var y = 0; y < m.length; y++) {
            for (var x = 0; x < m[y].length; x++) {
                if (!m[y][x]) continue;
                var bx = p.x + x;
                var by = p.y + y;
                if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                if (by >= 0 && b[by][bx]) return true;
            }
        }
        return false;
    }

    function spawnPiece(forcedType) {
        var type;
        if (forcedType) {
            type = forcedType;
        } else {
            type = nextType;
            nextType = pull();
            drawNext();
        }
        var shape = SHAPES[type];
        piece = {
            type: type,
            matrix: shape.map(function (row) { return row.slice(); }),
            x: Math.floor((COLS - shape[0].length) / 2),
            y: 0
        };
        canHold = true;
        if (collide(board, piece)) {
            gameOver();
        }
    }

    function holdPiece() {
        if (state !== 'running' || !canHold) return;
        var current = piece.type;
        if (holdType === null) {
            holdType = current;
            spawnPiece();
        } else {
            var swap = holdType;
            holdType = current;
            spawnPiece(swap);
        }
        canHold = false;
        drawHold();
        sound.hold();
        draw();
    }

    function rotateMatrix(m, dir) {
        var n = m.length;
        var res = [];
        for (var y = 0; y < n; y++) {
            res.push(new Array(n).fill(0));
        }
        for (var yy = 0; yy < n; yy++) {
            for (var xx = 0; xx < n; xx++) {
                if (dir > 0) {
                    res[xx][n - 1 - yy] = m[yy][xx];
                } else {
                    res[n - 1 - xx][yy] = m[yy][xx];
                }
            }
        }
        return res;
    }

    function merge() {
        for (var y = 0; y < piece.matrix.length; y++) {
            for (var x = 0; x < piece.matrix[y].length; x++) {
                if (piece.matrix[y][x]) {
                    var by = piece.y + y;
                    var bx = piece.x + x;
                    if (by >= 0) board[by][bx] = piece.type;
                }
            }
        }
    }

    function getFullRows() {
        var rows = [];
        for (var y = 0; y < ROWS; y++) {
            var full = true;
            for (var x = 0; x < COLS; x++) {
                if (!board[y][x]) { full = false; break; }
            }
            if (full) rows.push(y);
        }
        return rows;
    }

    function removeRows(rows) {
        var set = {};
        for (var i = 0; i < rows.length; i++) set[rows[i]] = true;
        var next = [];
        for (var y = 0; y < ROWS; y++) {
            if (!set[y]) next.push(board[y]);
        }
        while (next.length < ROWS) next.unshift(new Array(COLS).fill(null));
        board = next;
    }

    function lock() {
        pieceStats[piece.type]++;
        pieceCount++;
        merge();
        var full = getFullRows();
        if (full.length > 0) {
            clearingRows = full;
            clearAnimStart = performance.now();
            state = 'clearing';
            sound.clear(full.length);
            clearTimer = setTimeout(finishClear, 280);
        } else {
            combo = -1;
            sound.lock();
            spawnPiece();
        }
    }

    function finishClear() {
        var n = clearingRows.length;
        removeRows(clearingRows);
        clearingRows = [];
        clearTimer = null;
        lines += n;
        score += LINE_POINTS[n] * level;
        level = Math.floor(lines / 10) + 1;
        combo++;
        if (combo > 0) {
            score += 50 * combo * level;
            if (combo + 1 > maxCombo) maxCombo = combo + 1;
            showCombo(combo + 1);
        }
        dropInterval = Math.max(90, 800 * Math.pow(0.82, level - 1));
        updateStats();
        state = 'running';
        lastTime = 0;
        dropCounter = 0;
        spawnPiece();
        draw();
    }

    function move(dir) {
        piece.x += dir;
        if (collide(board, piece)) {
            piece.x -= dir;
        } else {
            sound.move();
        }
    }

    function rotate() {
        var rotated = rotateMatrix(piece.matrix, 1);
        var kicks = [0, 1, -1, 2, -2];
        var oldX = piece.x;
        var oldMatrix = piece.matrix;
        piece.matrix = rotated;
        for (var i = 0; i < kicks.length; i++) {
            piece.x = oldX + kicks[i];
            if (!collide(board, piece)) {
                sound.rotate();
                return;
            }
        }
        piece.matrix = oldMatrix;
        piece.x = oldX;
    }

    function softDrop(manual) {
        piece.y++;
        if (collide(board, piece)) {
            piece.y--;
            lock();
        } else if (manual) {
            score += 1;
            updateStats();
        }
        dropCounter = 0;
    }

    function hardDrop() {
        var dist = 0;
        while (!collide(board, piece)) {
            piece.y++;
            dist++;
        }
        piece.y--;
        score += Math.max(0, dist - 1) * 2;
        lock();
        updateStats();
    }

    function updateStats() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = lines;
        if (score > best) {
            best = score;
            bestEl.textContent = best;
        }
    }

    function updateBest() {
        bestEl.textContent = best;
    }

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('tetris-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        updateBest();
    }

    function saveBest() {
        try {
            localStorage.setItem('tetris-best', String(best));
        } catch (e) { /* ignore */ }
    }

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function beep(freq, dur, type, vol, delay) {
        if (!soundOn) return;
        var ac = getAudio();
        if (!ac) return;
        var t0 = ac.currentTime + (delay || 0);
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(vol || 0.05, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
    }

    var sound = {
        move: function () { beep(220, 0.05, 'square', 0.035); },
        rotate: function () { beep(330, 0.06, 'square', 0.045); },
        lock: function () { beep(150, 0.08, 'triangle', 0.07); },
        hold: function () { beep(520, 0.07, 'sine', 0.05); },
        clear: function (n) {
            var seq = [523, 659, 784, 1047];
            for (var i = 0; i < n; i++) {
                beep(seq[Math.min(i, seq.length - 1)], 0.14, 'sine', 0.07, i * 0.06);
            }
        },
        over: function () {
            var seq = [440, 330, 247, 165];
            for (var i = 0; i < seq.length; i++) {
                beep(seq[i], 0.28, 'sawtooth', 0.07, i * 0.16);
            }
        }
    };

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function drawCell(c, px, py, size, color, alpha) {
        c.save();
        c.globalAlpha = alpha == null ? 1 : alpha;
        var r = Math.max(3, size * 0.14);
        c.fillStyle = color;
        roundRect(c, px + 1, py + 1, size - 2, size - 2, r);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.28)';
        roundRect(c, px + 3, py + 3, size - 6, Math.max(2, size * 0.26), r);
        c.fill();
        c.restore();
    }

    function ghostY() {
        var ghost = { matrix: piece.matrix, x: piece.x, y: piece.y };
        while (!collide(board, ghost)) {
            ghost.y++;
        }
        return ghost.y - 1;
    }

    function draw() {
        var W = COLS * BLOCK;
        var H = ROWS * BLOCK;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0b0e1e';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (var x = 1; x < COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK + 0.5, 0);
            ctx.lineTo(x * BLOCK + 0.5, H);
            ctx.stroke();
        }
        for (var y = 1; y < ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK + 0.5);
            ctx.lineTo(W, y * BLOCK + 0.5);
            ctx.stroke();
        }

        for (var by = 0; by < ROWS; by++) {
            for (var bx = 0; bx < COLS; bx++) {
                if (board[by][bx]) {
                    drawCell(ctx, bx * BLOCK, by * BLOCK, BLOCK, COLORS[board[by][bx]], 1);
                }
            }
        }

        if (state === 'clearing' && clearingRows.length) {
            var prog = Math.min(1, (performance.now() - clearAnimStart) / 280);
            var alpha = 0.85 * (1 - prog);
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
            for (var ci = 0; ci < clearingRows.length; ci++) {
                ctx.fillRect(0, clearingRows[ci] * BLOCK, W, BLOCK);
            }
            ctx.restore();
        }

        if (piece && (state === 'running' || state === 'paused')) {
            var gy = ghostY();
            for (var py = 0; py < piece.matrix.length; py++) {
                for (var px = 0; px < piece.matrix[py].length; px++) {
                    if (piece.matrix[py][px]) {
                        var xx = (piece.x + px) * BLOCK;
                        var yy = (gy + py) * BLOCK;
                        if (gy + py >= 0) {
                            ctx.save();
                            ctx.globalAlpha = 0.22;
                            ctx.strokeStyle = COLORS[piece.type];
                            ctx.lineWidth = 2;
                            roundRect(ctx, xx + 3, yy + 3, BLOCK - 6, BLOCK - 6, 4);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }
        }

        if (piece && (state === 'running' || state === 'paused')) {
            for (var ry = 0; ry < piece.matrix.length; ry++) {
                for (var rx = 0; rx < piece.matrix[ry].length; rx++) {
                    if (piece.matrix[ry][rx]) {
                        var cellY = piece.y + ry;
                        if (cellY >= 0) {
                            drawCell(ctx, (piece.x + rx) * BLOCK, cellY * BLOCK, BLOCK, COLORS[piece.type], 1);
                        }
                    }
                }
            }
        }
    }

    function renderPreview(c, type) {
        c.clearRect(0, 0, 120, 120);
        if (!type) return;
        var m = SHAPES[type];
        var minR = 99, maxR = -1, minC = 99, maxC = -1;
        for (var y = 0; y < m.length; y++) {
            for (var x = 0; x < m[y].length; x++) {
                if (m[y][x]) {
                    if (y < minR) minR = y;
                    if (y > maxR) maxR = y;
                    if (x < minC) minC = x;
                    if (x > maxC) maxC = x;
                }
            }
        }
        var cell = 24;
        var w = (maxC - minC + 1) * cell;
        var h = (maxR - minR + 1) * cell;
        var ox = (120 - w) / 2;
        var oy = (120 - h) / 2;
        for (var yy = minR; yy <= maxR; yy++) {
            for (var xx = minC; xx <= maxC; xx++) {
                if (m[yy][xx]) {
                    drawCell(c, ox + (xx - minC) * cell, oy + (yy - minR) * cell, cell, COLORS[type], 1);
                }
            }
        }
    }

    function drawNext() {
        renderPreview(nctx, nextType);
    }

    function drawHold() {
        renderPreview(hctx, holdType);
    }

    function update(time) {
        if (state === 'running') {
            if (!lastTime) lastTime = time;
            var delta = time - lastTime;
            lastTime = time;
            dropCounter += delta;
            if (dropCounter > dropInterval) {
                softDrop(false);
            }
        }
        if (state !== 'running' && state !== 'clearing') return;
        draw();
        rafId = requestAnimationFrame(update);
    }

    function loop() {
        lastTime = 0;
        dropCounter = 0;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(update);
    }

    function doAction(action) {
        if (state !== 'running') return;
        switch (action) {
            case 'left': move(-1); break;
            case 'right': move(1); break;
            case 'down': softDrop(true); break;
            case 'rotate': rotate(); break;
            case 'drop': hardDrop(); break;
            case 'hold': holdPiece(); break;
        }
        draw();
    }

    function showOverlay(title, text, btnText) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayBtn.textContent = btnText;
        overlayStats.innerHTML = '';
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
        overlayStats.innerHTML = '';
    }

    function showCombo(n) {
        comboEl.textContent = '连击 ×' + n;
        comboEl.classList.remove('show');
        void comboEl.offsetWidth;
        comboEl.classList.add('show');
        if (comboTimer) clearTimeout(comboTimer);
        comboTimer = setTimeout(function () {
            comboEl.classList.remove('show');
        }, 900);
    }

    function renderStats() {
        var order = TYPES;
        var html = '<div class="stats-title">方块统计</div><div class="stats-grid">';
        for (var i = 0; i < order.length; i++) {
            var t = order[i];
            html += '<div class="stats-item"><span class="dot" style="background:' +
                COLORS[t] + '"></span><span>' + t + '</span><b>' + pieceStats[t] + '</b></div>';
        }
        html += '</div>';
        html += '<div class="stats-total">共 ' + pieceCount + ' 块 · 最高连击 ×' + maxCombo + '</div>';
        overlayStats.innerHTML = html;
    }

    function updatePauseBtn() {
        if (state === 'running') {
            pauseBtn.disabled = false;
            pauseBtn.textContent = '暂停';
        } else if (state === 'paused') {
            pauseBtn.disabled = false;
            pauseBtn.textContent = '继续';
        } else {
            pauseBtn.disabled = true;
            pauseBtn.textContent = '暂停';
        }
    }

    function startGame() {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }
        clearingRows = [];
        board = createBoard();
        bag = [];
        holdType = null;
        canHold = true;
        combo = -1;
        maxCombo = 0;
        pieceCount = 0;
        pieceStats = { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 };
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 800;
        nextType = pull();
        state = 'running';
        hideOverlay();
        if (comboTimer) { clearTimeout(comboTimer); comboTimer = null; }
        comboEl.classList.remove('show');
        updatePauseBtn();
        updateStats();
        getAudio();
        spawnPiece();
        drawNext();
        drawHold();
        draw();
        loop();
    }

    function togglePause() {
        if (state === 'running') {
            state = 'paused';
            showOverlay('已暂停', '点击继续，或按 P 键', '继续游戏');
            updatePauseBtn();
        } else if (state === 'paused') {
            state = 'running';
            hideOverlay();
            updatePauseBtn();
            loop();
        }
    }

    function gameOver() {
        state = 'over';
        saveBest();
        updatePauseBtn();
        sound.over();
        draw();
        showOverlay('游戏结束', '本次得分 ' + score + '　最高 ' + best, '再来一局');
        renderStats();
    }

    function toggleSound() {
        soundOn = !soundOn;
        soundBtn.textContent = soundOn ? '音效开' : '音效关';
        if (soundOn) {
            getAudio();
            sound.rotate();
        }
    }

    function handleOverlayBtn() {
        if (state === 'paused') {
            togglePause();
        } else {
            startGame();
        }
    }

    function bindControls() {
        var buttons = document.querySelectorAll('[data-action]');
        Array.prototype.forEach.call(buttons, function (btn) {
            var action = btn.getAttribute('data-action');
            var holdTimer = null;
            var repeatTimer = null;

            function fire() { doAction(action); }

            function start(e) {
                e.preventDefault();
                fire();
                if (action === 'left' || action === 'right' || action === 'down') {
                    holdTimer = setTimeout(function () {
                        repeatTimer = setInterval(fire, 70);
                    }, 200);
                }
            }

            function stop() {
                clearTimeout(holdTimer);
                clearInterval(repeatTimer);
                holdTimer = null;
                repeatTimer = null;
            }

            btn.addEventListener('pointerdown', start);
            btn.addEventListener('pointerup', stop);
            btn.addEventListener('pointerleave', stop);
            btn.addEventListener('pointercancel', stop);
            btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
            btn.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
            btn.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
        });
    }

    function bindKeyboard() {
        window.addEventListener('keydown', function (e) {
            var k = e.key;
            if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' ||
                k === 'ArrowDown' || k === ' ') {
                e.preventDefault();
            }
            if (k === 'p' || k === 'P') { togglePause(); return; }
            if (k === 'r' || k === 'R') { startGame(); return; }
            if (state === 'idle' || state === 'over') {
                if (k === ' ' || k === 'Enter') startGame();
                return;
            }
            if (state !== 'running') return;
            if (k === 'ArrowLeft') doAction('left');
            else if (k === 'ArrowRight') doAction('right');
            else if (k === 'ArrowDown') doAction('down');
            else if (k === 'ArrowUp') doAction('rotate');
            else if (k === ' ') doAction('drop');
            else if (k === 'c' || k === 'C' || k === 'Shift') doAction('hold');
        });
    }

    function bindSwipe() {
        var start = null;
        boardCanvas.addEventListener('pointerdown', function (e) {
            start = { x: e.clientX, y: e.clientY, t: Date.now() };
        });
        boardCanvas.addEventListener('pointerup', function (e) {
            if (!start) return;
            var dx = e.clientX - start.x;
            var dy = e.clientY - start.y;
            var dt = Date.now() - start.t;
            start = null;
            if (state !== 'running') return;
            if (Math.abs(dx) < 18 && Math.abs(dy) < 18 && dt < 260) {
                doAction('rotate');
                return;
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                var steps = Math.max(1, Math.round(Math.abs(dx) / 24));
                for (var i = 0; i < steps; i++) doAction(dx > 0 ? 'right' : 'left');
            } else if (dy > 24) {
                doAction('drop');
            }
        });
        boardCanvas.addEventListener('pointercancel', function () { start = null; });
        boardCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    function isMobileLayout() {
        return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
            window.innerWidth <= 560;
    }

    function updateLayout() {
        var mobile = isMobileLayout();
        document.documentElement.classList.toggle('mobile', mobile);

        var game = document.querySelector('.game');
        var panel = document.querySelector('.panel');
        var boardWrap = document.querySelector('.board-wrap');
        var previewRow = document.querySelector('.preview-row');
        var panelActions = document.querySelector('.panel-actions');

        if (previewRow && boardWrap && panel) {
            if (mobile) {
                if (previewRow.parentNode !== boardWrap) boardWrap.appendChild(previewRow);
            } else if (panelActions && previewRow.parentNode !== panel) {
                panel.insertBefore(previewRow, panelActions);
            }
        }

        if (!mobile || !game) {
            boardCanvas.style.width = '';
            boardCanvas.style.height = '';
            return;
        }

        var gameW = game.clientWidth;
        var gameH = game.clientHeight;
        if (!gameW || !gameH) return;

        var statsEl = document.querySelector('.game .stats');
        var actionsEl = document.querySelector('.game .panel-actions');
        var statsH = statsEl ? statsEl.offsetHeight : 0;
        var actionsH = actionsEl ? actionsEl.offsetHeight : 0;

        var gap = 6;
        var cellW = gameW;
        var cellH = gameH - statsH - actionsH - gap * 2;

        var h = Math.min(cellH, cellW * 2);
        if (h < 40) h = 40;
        var w = h / 2;
        boardCanvas.style.width = w + 'px';
        boardCanvas.style.height = h + 'px';
    }

    board = createBoard();
    nextType = pull();
    loadBest();
    draw();
    drawNext();
    drawHold();
    updatePauseBtn();
    showOverlay('准备好了吗？', '消除方块，挑战最高分', '开始游戏');

    overlayBtn.addEventListener('click', handleOverlayBtn);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', startGame);
    soundBtn.addEventListener('click', toggleSound);

    document.addEventListener('selectstart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    bindControls();
    bindKeyboard();
    bindSwipe();

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', function () {
        setTimeout(updateLayout, 250);
    });
})();
