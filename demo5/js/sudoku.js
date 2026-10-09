(function () {
    'use strict';

    var BITS = 0x3FE; // 1111111110 (bits 1..9)
    var BIT_VALUE = {};
    for (var vv = 1; vv <= 9; vv++) BIT_VALUE[1 << vv] = vv;

    var DIFF_TARGET = { easy: 42, medium: 34, hard: 27 };
    var DIFF_NAME = { easy: '简单', medium: '中等', hard: '困难' };

    var boardEl = document.getElementById('board');
    var numsEl = document.getElementById('nums');
    var diffSeg = document.getElementById('diff-seg');
    var timerEl = document.getElementById('timer');
    var mistakesEl = document.getElementById('mistakes');
    var notesBtn = document.getElementById('notes');
    var eraseBtn = document.getElementById('erase');
    var newBtn = document.getElementById('new');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var puzzle = new Array(81).fill(0);
    var solution = new Array(81).fill(0);
    var grid = new Array(81).fill(0);
    var notes = [];
    for (var ni = 0; ni < 81; ni++) notes.push(new Set());

    var cells = [];
    var selected = -1;
    var notesMode = false;
    var mistakes = 0;
    var difficulty = 'medium';
    var solved = false;
    var startTime = 0;
    var timerId = null;

    function popcount(m) {
        var c = 0;
        while (m) { m &= m - 1; c++; }
        return c;
    }

    function shuffled(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = (Math.random() * (i + 1)) | 0;
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function unitMasks(g, rows, cols, boxes) {
        for (var i = 0; i < 81; i++) {
            var v = g[i];
            if (!v) continue;
            var r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
            var bit = 1 << v;
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        }
    }

    function fillGrid(g) {
        var rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
        unitMasks(g, rows, cols, boxes);

        function recurse() {
            var best = -1, bestMask = 0, bestCnt = 10;
            for (var i = 0; i < 81; i++) {
                if (g[i]) continue;
                var r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
                var avail = (~(rows[r] | cols[c] | boxes[b])) & BITS;
                var cnt = popcount(avail);
                if (cnt === 0) return false;
                if (cnt < bestCnt) { bestCnt = cnt; best = i; bestMask = avail; if (cnt === 1) break; }
            }
            if (best === -1) return true;
            var r2 = (best / 9) | 0, c2 = best % 9, b2 = ((r2 / 3) | 0) * 3 + ((c2 / 3) | 0);
            var opts = [];
            var m = bestMask;
            while (m) { var bit = m & -m; m ^= bit; opts.push(bit); }
            shuffled(opts);
            for (var o = 0; o < opts.length; o++) {
                var bt = opts[o];
                g[best] = BIT_VALUE[bt];
                rows[r2] |= bt; cols[c2] |= bt; boxes[b2] |= bt;
                if (recurse()) return true;
                g[best] = 0;
                rows[r2] ^= bt; cols[c2] ^= bt; boxes[b2] ^= bt;
            }
            return false;
        }
        recurse();
        return g;
    }

    function countSolutions(g, limit) {
        var work = g.slice();
        var rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
        unitMasks(work, rows, cols, boxes);
        var count = 0;

        function recurse() {
            var best = -1, bestMask = 0, bestCnt = 10;
            for (var i = 0; i < 81; i++) {
                if (work[i]) continue;
                var r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
                var avail = (~(rows[r] | cols[c] | boxes[b])) & BITS;
                var cnt = popcount(avail);
                if (cnt === 0) return;
                if (cnt < bestCnt) { bestCnt = cnt; best = i; bestMask = avail; if (cnt === 1) break; }
            }
            if (best === -1) { count++; return; }
            var r2 = (best / 9) | 0, c2 = best % 9, b2 = ((r2 / 3) | 0) * 3 + ((c2 / 3) | 0);
            var m = bestMask;
            while (m) {
                var bit = m & -m; m ^= bit;
                work[best] = BIT_VALUE[bit];
                rows[r2] |= bit; cols[c2] |= bit; boxes[b2] |= bit;
                recurse();
                work[best] = 0;
                rows[r2] ^= bit; cols[c2] ^= bit; boxes[b2] ^= bit;
                if (count >= limit) return;
            }
        }
        recurse();
        return count;
    }

    function generatePuzzle(diff) {
        var sol = new Array(81).fill(0);
        fillGrid(sol);
        var puz = sol.slice();
        var target = DIFF_TARGET[diff] || 34;
        var order = shuffled(Array.from({ length: 81 }, function (_, i) { return i; }));
        var givens = 81;
        for (var k = 0; k < order.length && givens > target; k++) {
            var i = order[k];
            var backup = puz[i];
            if (!backup) continue;
            puz[i] = 0;
            if (countSolutions(puz, 2) !== 1) {
                puz[i] = backup;
            } else {
                givens--;
            }
        }
        return { puzzle: puz, solution: sol };
    }

    // ---------- DOM ----------
    function buildBoard() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < 81; i++) {
            var r = (i / 9) | 0, c = i % 9;
            var cell = document.createElement('div');
            cell.className = 'cell';
            if (c % 3 === 2 && c !== 8) cell.classList.add('box-right');
            if (r % 3 === 2 && r !== 8) cell.classList.add('box-bottom');

            var v = document.createElement('div');
            v.className = 'v';
            cell.appendChild(v);

            var n = document.createElement('div');
            n.className = 'n';
            for (var k = 1; k <= 9; k++) {
                var it = document.createElement('i');
                it.textContent = k;
                n.appendChild(it);
            }
            cell.appendChild(n);

            (function (idx) {
                cell.addEventListener('pointerdown', function (e) {
                    e.preventDefault();
                    select(idx);
                });
            })(i);

            cells.push(cell);
            frag.appendChild(cell);
        }
        boardEl.appendChild(frag);
    }

    function buildNums() {
        for (var k = 1; k <= 9; k++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = k;
            b.setAttribute('data-num', k);
            numsEl.appendChild(b);
        }
    }

    function select(i) {
        selected = i;
        render();
    }

    function computeConflicts() {
        var bad = new Array(81).fill(false);
        for (var i = 0; i < 81; i++) {
            var v = grid[i];
            if (!v) continue;
            var r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
            for (var j = 0; j < 81; j++) {
                if (j === i || grid[j] !== v) continue;
                var r2 = (j / 9) | 0, c2 = j % 9, b2 = ((r2 / 3) | 0) * 3 + ((c2 / 3) | 0);
                if (r2 === r || c2 === c || b2 === b) { bad[i] = true; bad[j] = true; }
            }
        }
        return bad;
    }

    function render() {
        var bad = computeConflicts();
        var selVal = selected >= 0 ? grid[selected] : 0;
        var sr = selected >= 0 ? (selected / 9) | 0 : -1;
        var sc = selected >= 0 ? selected % 9 : -1;
        var sb = selected >= 0 ? ((sr / 3) | 0) * 3 + ((sc / 3) | 0) : -1;

        for (var i = 0; i < 81; i++) {
            var cell = cells[i];
            var r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
            var val = grid[i];

            cell.classList.toggle('given', puzzle[i] !== 0);
            cell.classList.toggle('bad', !!bad[i] && val !== 0);
            cell.classList.remove('sel', 'rel', 'same');

            if (i === selected) cell.classList.add('sel');
            else if (selected >= 0 && (r === sr || c === sc || b === sb)) cell.classList.add('rel');
            if (val && selVal && val === selVal && i !== selected) cell.classList.add('same');

            cell.querySelector('.v').textContent = val ? val : '';

            var noteEls = cell.querySelectorAll('.n i');
            var showNotes = val === 0;
            for (var k = 1; k <= 9; k++) {
                noteEls[k - 1].classList.toggle('on', showNotes && notes[i].has(k));
            }
        }
    }

    // ---------- 操作 ----------
    function place(n) {
        if (solved || selected < 0) return;
        var i = selected;
        if (puzzle[i] !== 0) return;

        if (notesMode) {
            if (grid[i] !== 0) return;
            if (notes[i].has(n)) notes[i].delete(n);
            else notes[i].add(n);
        } else {
            if (grid[i] === n) {
                grid[i] = 0;
            } else {
                grid[i] = n;
                notes[i].clear();
                if (n !== solution[i]) {
                    mistakes++;
                    mistakesEl.textContent = mistakes;
                }
            }
        }
        render();
        checkWin();
    }

    function erase() {
        if (solved || selected < 0) return;
        if (puzzle[selected] !== 0) return;
        grid[selected] = 0;
        notes[selected].clear();
        render();
    }

    function toggleNotes() {
        notesMode = !notesMode;
        notesBtn.classList.toggle('active', notesMode);
    }

    function checkWin() {
        for (var i = 0; i < 81; i++) {
            if (grid[i] === 0) return;
            if (grid[i] !== solution[i]) return;
        }
        solved = true;
        stopTimer();
        ovTitle.textContent = '完成！';
        ovText.textContent = '难度 ' + DIFF_NAME[difficulty] + ' · 用时 ' + timerEl.textContent + ' · 错误 ' + mistakes;
        overlay.classList.remove('hidden');
    }

    function formatTime(sec) {
        var m = (sec / 60) | 0;
        var s = sec % 60;
        return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    function startTimer() {
        stopTimer();
        startTime = Date.now();
        timerEl.textContent = '00:00';
        timerId = setInterval(function () {
            var sec = ((Date.now() - startTime) / 1000) | 0;
            timerEl.textContent = formatTime(sec);
        }, 250);
    }

    function stopTimer() {
        if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function newGame() {
        overlay.classList.add('hidden');
        var gen = generatePuzzle(difficulty);
        puzzle = gen.puzzle;
        solution = gen.solution;
        grid = puzzle.slice();
        notes = [];
        for (var i = 0; i < 81; i++) notes.push(new Set());
        selected = -1;
        mistakes = 0;
        solved = false;
        mistakesEl.textContent = '0';
        render();
        startTimer();
    }

    // ---------- 事件 ----------
    function bindEvents() {
        numsEl.addEventListener('click', function (e) {
            var b = e.target;
            if (!b || !b.getAttribute) return;
            var n = b.getAttribute('data-num');
            if (n) place(parseInt(n, 10));
        });

        notesBtn.addEventListener('click', toggleNotes);
        eraseBtn.addEventListener('click', erase);
        newBtn.addEventListener('click', newGame);
        ovBtn.addEventListener('click', newGame);

        diffSeg.addEventListener('click', function (e) {
            var b = e.target;
            if (!b || !b.getAttribute || !b.getAttribute('data-diff')) return;
            difficulty = b.getAttribute('data-diff');
            var all = diffSeg.querySelectorAll('.seg-btn');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
            b.classList.add('active');
            newGame();
        });

        window.addEventListener('keydown', function (e) {
            var k = e.key;
            if (k >= '1' && k <= '9') { e.preventDefault(); place(parseInt(k, 10)); return; }
            if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); erase(); return; }
            if (k === 'n' || k === 'N') { e.preventDefault(); toggleNotes(); return; }
            if (selected >= 0 && k.indexOf('Arrow') === 0) {
                e.preventDefault();
                var r = (selected / 9) | 0, c = selected % 9;
                if (k === 'ArrowLeft') c = (c + 8) % 9;
                else if (k === 'ArrowRight') c = (c + 1) % 9;
                else if (k === 'ArrowUp') r = (r + 8) % 9;
                else if (k === 'ArrowDown') r = (r + 1) % 9;
                select(r * 9 + c);
            }
        });
    }

    buildBoard();
    buildNums();
    bindEvents();
    newGame();
})();
