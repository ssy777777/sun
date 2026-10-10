(function () {
    'use strict';

    var LIVES_MAX = 3;
    var TURN_SECONDS = 20;
    var HINT_MAX = 3;

    var livesEl = document.getElementById('lives');
    var scoreEl = document.getElementById('score');
    var timeEl = document.getElementById('time');
    var bestEl = document.getElementById('best');
    var currentEl = document.getElementById('current');
    var needEl = document.getElementById('need');
    var chainEl = document.getElementById('chain');
    var feedEl = document.getElementById('feed');
    var answerEl = document.getElementById('answer');
    var submitBtn = document.getElementById('submit');
    var hintBtn = document.getElementById('hint');
    var soundBtn = document.getElementById('sound');
    var restartBtn = document.getElementById('restart');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovActions = document.getElementById('ov-actions');

    var WORDS = window.WORDS || [];
    var WORD_SET = window.WORD_SET || {};
    var PINYIN = window.PINYIN || {};
    var pinyinCache = {};
    function pinyinOf(ch) {
        if (pinyinCache[ch] !== undefined) return pinyinCache[ch];
        var raw = PINYIN[ch];
        var arr = raw ? raw.split(/\s+/) : [];
        pinyinCache[ch] = arr;
        return arr;
    }
    function sameSound(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        var pa = pinyinOf(a), pb = pinyinOf(b);
        if (!pa.length || !pb.length) return false;
        for (var i = 0; i < pa.length; i++) {
            if (pb.indexOf(pa[i]) !== -1) return true;
        }
        return false;
    }
    var byPinyin = {};
    WORDS.forEach(function (w) {
        var ps = pinyinOf(w.charAt(0));
        if (!ps.length) ps = [w.charAt(0)];
        for (var i = 0; i < ps.length; i++) {
            (byPinyin[ps[i]] = byPinyin[ps[i]] || []).push(w);
        }
    });
    function hasContinuation(char) {
        var ps = pinyinOf(char);
        if (!ps.length) return false;
        for (var i = 0; i < ps.length; i++) {
            var bucket = byPinyin[ps[i]];
            if (bucket && bucket.length) return true;
        }
        return false;
    }

    var lives = LIVES_MAX;
    var score = 0;
    var chain = [];
    var used = {};
    var requiredChar = '';
    var hintUses = HINT_MAX;
    var locked = false;
    var turnLeft = TURN_SECONDS;
    var tickTimer = null;
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
        ok: function () { [660, 880, 1175].forEach(function (f, i) { beep(f, 0.12, 'sine', 0.07, i * 0.05); }); },
        bad: function () { beep(170, 0.25, 'sawtooth', 0.07); },
        end: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.2, 'triangle', 0.07, i * 0.12); }); }
    };

    function loadBest() {
        var b = 0;
        try { b = parseInt(localStorage.getItem('chain-best') || '0', 10) || 0; } catch (e) { b = 0; }
        bestEl.textContent = b;
        return b;
    }
    function saveBest(v) {
        try { localStorage.setItem('chain-best', String(v)); } catch (e) { /* ignore */ }
    }

    function validContinuations(char) {
        var ps = pinyinOf(char);
        if (!ps.length) ps = [char];
        var out = [], seen = {};
        for (var i = 0; i < ps.length; i++) {
            var bucket = byPinyin[ps[i]];
            if (!bucket) continue;
            for (var j = 0; j < bucket.length; j++) {
                var w = bucket[j];
                if (used[w] || seen[w]) continue;
                seen[w] = 1;
                out.push(w);
            }
        }
        return out;
    }

    function renderChain() {
        chainEl.textContent = '';
        chain.forEach(function (w) {
            var s = document.createElement('span');
            s.textContent = w;
            chainEl.appendChild(s);
        });
    }

    function updateLives() {
        var s = '';
        for (var i = 0; i < lives; i++) s += '♥';
        livesEl.textContent = s || '—';
    }

    function feedback(text, cls) {
        feedEl.textContent = text || '';
        feedEl.className = 'feed' + (cls ? ' ' + cls : '');
    }

    function startTimer() {
        turnLeft = TURN_SECONDS;
        timeEl.textContent = turnLeft;
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = setInterval(function () {
            if (locked || !requiredChar) return;
            turnLeft--;
            timeEl.textContent = Math.max(0, turnLeft);
            if (turnLeft <= 0) {
                loseLife('超时了！');
            }
        }, 1000);
    }

    function loseLife(msg) {
        lives--;
        updateLives();
        sound.bad();
        if (lives <= 0) { gameOver(); return; }
        feedback(msg + '　生命 -1', 'bad');
        startTimer();
    }

    function newChain(reason) {
        var start = null;
        for (var g = 0; g < 800; g++) {
            var w = WORDS[randInt(WORDS.length)];
            if (hasContinuation(w.charAt(3))) { start = w; break; }
        }
        if (!start) start = WORDS[0];
        chain = [start];
        used = {};
        used[start] = 1;
        requiredChar = start.charAt(3);
        renderChain();
        answerEl.value = '';
        locked = false;
        if (reason) feedback(reason, 'bad');
        else feedback('请接以「' + requiredChar + '」开头（或同音字）的成语', '');
        answerEl.focus();
        startTimer();
    }

    function afterCorrect(w) {
        chain.push(w);
        score++;
        scoreEl.textContent = score;
        used[w] = 1;
        requiredChar = w.charAt(3);
        renderChain();
        answerEl.value = '';
        var valid = validContinuations(requiredChar);
        if (!valid.length) {
            feedback('「' + requiredChar + '」接不上了，换一条新链', '');
            locked = true;
            setTimeout(function () { newChain(); }, 700);
        } else {
            feedback('接得好！', 'ok');
            answerEl.focus();
            startTimer();
        }
    }

    function submit() {
        if (locked) return;
        var w = (answerEl.value || '').replace(/\s/g, '');
        if (!w) return;
        if (w.length !== 4) { feedback('要输入四字成语', 'bad'); return; }
        if (!sameSound(w.charAt(0), requiredChar)) {
            loseLife('要以「' + requiredChar + '」（或同音字）开头'); return;
        }
        if (!WORD_SET[w]) { feedback('词库未收录：' + w, 'bad'); return; }
        if (used[w]) { feedback('这个词已经用过啦', 'bad'); return; }
        sound.ok();
        afterCorrect(w);
    }

    function useHint() {
        if (locked || hintUses <= 0) return;
        var valid = validContinuations(requiredChar);
        if (!valid.length) return;
        answerEl.value = valid[randInt(valid.length)];
        hintUses--;
        hintBtn.textContent = '提示 ' + hintUses;
        hintBtn.disabled = hintUses <= 0;
        feedback('已填入一个答案', '');
        answerEl.focus();
    }

    function endGame(title, text) {
        locked = true;
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        sound.end();
        var best = loadBest();
        var isRecord = score > best;
        if (isRecord) { saveBest(score); best = score; }
        bestEl.textContent = best;
        ovTitle.textContent = title;
        ovText.innerHTML = text + (isRecord ? '　<b>新纪录！</b>' : '');
        showActions([{ text: '再来一局', primary: true, fn: newGame }]);
        overlay.classList.remove('hidden');
    }

    function gameOver() {
        endGame('游戏结束', '共接 <b>' + score + '</b> 个成语');
    }

    function showActions(list) {
        ovActions.textContent = '';
        list.forEach(function (item) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = item.primary ? 'primary' : 'act';
            b.textContent = item.text;
            b.addEventListener('click', item.fn);
            ovActions.appendChild(b);
        });
    }

    function newGame() {
        overlay.classList.add('hidden');
        lives = LIVES_MAX;
        score = 0;
        chain = [];
        used = {};
        requiredChar = '';
        hintUses = HINT_MAX;
        locked = false;
        updateLives();
        scoreEl.textContent = '0';
        hintBtn.textContent = '提示 ' + hintUses;
        hintBtn.disabled = false;
        loadBest();
        newChain();
    }

    submitBtn.addEventListener('click', submit);
    answerEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    hintBtn.addEventListener('click', useHint);
    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
        if (soundOn) sound.ok();
    });
    restartBtn.addEventListener('click', newGame);

    newGame();
})();
