(function () {
    'use strict';

    var bestEl = document.getElementById('best');
    var promptEl = document.getElementById('prompt');
    var bigEl = document.getElementById('big');
    var answerEl = document.getElementById('answer');
    var barEl = document.getElementById('bar');
    var inputRow = document.getElementById('input-row');
    var inp = document.getElementById('inp');
    var submitBtn = document.getElementById('submit');
    var progressEl = document.getElementById('progress');
    var startBtn = document.getElementById('start');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');

    var best = 0;
    var level = 1;
    var number = '';
    var phase = 'idle';
    var hideTimer = null;
    var nextTimer = null;

    function genNumber(len) {
        var s = String(1 + Math.floor(Math.random() * 9));
        for (var i = 1; i < len; i++) {
            s += Math.floor(Math.random() * 10);
        }
        return s;
    }

    function showMsFor(len) {
        return Math.min(1000 + len * 650, 9000);
    }

    function loadBest() {
        try {
            best = parseInt(localStorage.getItem('number-memory-best') || '0', 10) || 0;
        } catch (e) {
            best = 0;
        }
        bestEl.textContent = best;
    }

    function saveBest() {
        try { localStorage.setItem('number-memory-best', String(best)); } catch (e) { /* ignore */ }
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

    function startGame() {
        overlay.classList.add('hidden');
        level = 1;
        loadBest();
        nextRound();
    }

    function nextRound() {
        clearTimeout(nextTimer);
        phase = 'showing';
        number = genNumber(level);
        progressEl.textContent = '第 ' + level + ' 关 · ' + level + ' 位数字';

        promptEl.classList.add('hidden');
        answerEl.textContent = '';
        answerEl.className = 'answer';
        inputRow.classList.add('hidden');
        bigEl.textContent = number;
        bigEl.classList.remove('hidden');

        var ms = showMsFor(level);
        setBar(ms);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(startInput, ms);
    }

    function startInput() {
        phase = 'input';
        bigEl.textContent = '';
        bigEl.classList.add('hidden');
        promptEl.textContent = '输入刚才的数字';
        promptEl.classList.remove('hidden');
        inputRow.classList.remove('hidden');
        inp.value = '';
        try { inp.focus(); } catch (e) { /* ignore */ }
    }

    function submit() {
        if (phase !== 'input') return;
        var v = inp.value.replace(/\D/g, '');
        if (v === '') return;

        if (v === number) {
            phase = 'flash';
            if (level > best) {
                best = level;
                saveBest();
            }
            bestEl.textContent = best;
            answerEl.textContent = '正确！';
            answerEl.className = 'answer ok';
            inputRow.classList.add('hidden');
            level++;
            nextTimer = setTimeout(nextRound, 650);
        } else {
            fail();
        }
    }

    function fail() {
        phase = 'over';
        clearTimeout(hideTimer);
        inputRow.classList.add('hidden');
        bigEl.classList.add('hidden');
        promptEl.classList.add('hidden');
        answerEl.innerHTML = '正确答案：<b>' + number + '</b>';
        answerEl.className = 'answer bad';

        ovTitle.textContent = '游戏结束';
        ovText.innerHTML = '本次记住 <b>' + best + '</b> 位数字';
        overlay.classList.remove('hidden');
    }

    startBtn.addEventListener('click', startGame);
    ovBtn.addEventListener('click', startGame);
    submitBtn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    loadBest();
    progressEl.textContent = '第 1 关 · 1 位数字';
})();
