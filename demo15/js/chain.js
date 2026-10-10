(function () {
    'use strict';

    var LIVES_MAX = 3;
    var TURN_SECONDS = 20;
    var HINT_MAX = 3;
    var AI_THINK_MS = 900;
    var AI_FAIL = { easy: 0.35, normal: 0.18, hard: 0.05 };

    var livesEl = document.getElementById('lives');
    var aiHud = document.getElementById('ai-hud');
    var aiLivesEl = document.getElementById('ai-lives');
    var scoreEl = document.getElementById('score');
    var timeEl = document.getElementById('time');
    var bestEl = document.getElementById('best');
    var currentEl = document.getElementById('current');
    var needEl = document.getElementById('need');
    var chainEl = document.getElementById('chain');
    var feedEl = document.getElementById('feed');
    var turnEl = document.getElementById('turn');
    var answerEl = document.getElementById('answer');
    var submitBtn = document.getElementById('submit');
    var hintBtn = document.getElementById('hint');
    var soundBtn = document.getElementById('sound');
    var restartBtn = document.getElementById('restart');
    var modeSoloBtn = document.getElementById('mode-solo');
    var modeBattleBtn = document.getElementById('mode-battle');
    var diffEl = document.getElementById('diff');
    var diffEasyBtn = document.getElementById('diff-easy');
    var diffNormalBtn = document.getElementById('diff-normal');
    var diffHardBtn = document.getElementById('diff-hard');
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

    var mode = 'solo';
    var diff = 'normal';
    var lives = LIVES_MAX;
    var aiLives = LIVES_MAX;
    var score = 0;
    var chain = [];
    var used = {};
    var requiredChar = '';
    var hintUses = HINT_MAX;
    var locked = false;
    var turn = 'player';
    var turnLeft = TURN_SECONDS;
    var tickTimer = null;
    var aiTimer = null;
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
        ai: function () { [440, 554].forEach(function (f, i) { beep(f, 0.12, 'triangle', 0.05, i * 0.07); }); },
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

    function renderChain() {
        chainEl.textContent = '';
        chain.forEach(function (it) {
            var s = document.createElement('span');
            s.textContent = it.t;
            if (it.ai) s.className = 'ai';
            chainEl.appendChild(s);
        });
        if (chain.length) currentEl.textContent = chain[chain.length - 1].t;
    }

    function updateLives() {
        var s = '';
        for (var i = 0; i < lives; i++) s += '♥';
        livesEl.textContent = s || '—';
    }
    function updateAiLives() {
        var s = '';
        for (var i = 0; i < aiLives; i++) s += '♥';
        aiLivesEl.textContent = s || '—';
    }

    function feedback(text, cls) {
        feedEl.textContent = text || '';
        feedEl.className = 'feed' + (cls ? ' ' + cls : '');
    }

    function updateTurn() {
        if (mode === 'solo') { turnEl.classList.add('hide'); return; }
        turnEl.classList.remove('hide');
        var aiTurn = (turn === 'ai');
        turnEl.textContent = aiTurn ? '电脑回合 · 思考中…' : '轮到你';
        turnEl.classList.toggle('ai', aiTurn);
    }

    function setControls() {
        var playerTurn = (mode === 'solo') || (turn === 'player');
        answerEl.disabled = !playerTurn;
        submitBtn.disabled = !playerTurn;
    }

    function startTimer() {
        turnLeft = TURN_SECONDS;
        timeEl.textContent = turnLeft;
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = setInterval(function () {
            if (locked || !requiredChar) return;
            if (mode === 'battle' && turn !== 'player') return;
            turnLeft--;
            timeEl.textContent = Math.max(0, turnLeft);
            if (turnLeft <= 0) loseLife('超时了！');
        }, 1000);
    }

    function stopTimer() {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    }

    function loseLife(msg) {
        lives--;
        updateLives();
        sound.bad();
        if (lives <= 0) { gameOver(false); return; }
        feedback(msg + '　生命 -1', 'bad');
        locked = false;
        turn = 'player';
        updateTurn();
        setControls();
        startTimer();
    }

    function newChain(reason) {
        var start = null;
        for (var g = 0; g < 800; g++) {
            var w = WORDS[randInt(WORDS.length)];
            if (hasContinuation(w.charAt(3))) { start = w; break; }
        }
        if (!start) start = WORDS[0];
        chain = [{ t: start, ai: false }];
        used = {};
        used[start] = 1;
        requiredChar = start.charAt(3);
        renderChain();
        answerEl.value = '';
        locked = false;
        turn = 'player';
        updateTurn();
        setControls();
        if (reason) feedback(reason, 'bad');
        else feedback('请接以「' + requiredChar + '」开头（或同音字）的成语', '');
        answerEl.focus();
        startTimer();
    }

    function afterPlayerCorrect(w) {
        chain.push({ t: w, ai: false });
        score++;
        scoreEl.textContent = score;
        used[w] = 1;
        requiredChar = w.charAt(3);
        renderChain();
        answerEl.value = '';
        if (mode === 'battle') { aiTurn(); return; }
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

    function aiTurn() {
        turn = 'ai';
        locked = true;
        updateTurn();
        setControls();
        feedback('电脑思考中…', '');
        aiTimer = setTimeout(aiPlay, AI_THINK_MS);
    }

    function chooseAiMove(valid) {
        if (diff !== 'hard') return valid[randInt(valid.length)];
        var pool = valid;
        if (pool.length > 40) {
            var s = [];
            for (var k = 0; k < 40; k++) s.push(pool[randInt(pool.length)]);
            pool = s;
        }
        var best = pool[0], bestN = Infinity;
        for (var i = 0; i < pool.length; i++) {
            var n = validContinuations(pool[i].charAt(3)).length;
            if (n < bestN) { bestN = n; best = pool[i]; }
        }
        return best;
    }

    function aiPlay() {
        aiTimer = null;
        var valid = validContinuations(requiredChar);
        if (!valid.length || Math.random() < AI_FAIL[diff]) { aiConcede(); return; }
        var pick = chooseAiMove(valid);
        chain.push({ t: pick, ai: true });
        used[pick] = 1;
        requiredChar = pick.charAt(3);
        renderChain();
        feedback('电脑接了：' + pick, '');
        sound.ai();
        turn = 'player';
        locked = false;
        updateTurn();
        setControls();
        answerEl.focus();
        startTimer();
    }

    function aiConcede() {
        aiLives--;
        updateAiLives();
        sound.bad();
        if (aiLives <= 0) { gameOver(true); return; }
        feedback('电脑接不上，换一条新链！', 'ok');
        locked = true;
        setTimeout(function () { newChain('电脑接不上，换一条新链'); }, 800);
    }

    function submit() {
        if (locked) return;
        if (mode === 'battle' && turn !== 'player') return;
        var w = (answerEl.value || '').replace(/\s/g, '');
        if (!w) return;
        if (w.length !== 4) { feedback('要输入四字成语', 'bad'); return; }
        if (!sameSound(w.charAt(0), requiredChar)) {
            loseLife('要以「' + requiredChar + '」（或同音字）开头'); return;
        }
        if (!WORD_SET[w]) { feedback('词库未收录：' + w, 'bad'); return; }
        if (used[w]) { feedback('这个词已经用过啦', 'bad'); return; }
        sound.ok();
        afterPlayerCorrect(w);
    }

    function useHint() {
        if (locked || hintUses <= 0) return;
        if (mode === 'battle' && turn !== 'player') return;
        var valid = validContinuations(requiredChar);
        if (!valid.length) return;
        answerEl.value = valid[randInt(valid.length)];
        hintUses--;
        hintBtn.textContent = '提示 ' + hintUses;
        hintBtn.disabled = hintUses <= 0;
        feedback('已填入一个答案', '');
        answerEl.focus();
    }

    function endGame(title, text, isRecord) {
        locked = true;
        stopTimer();
        sound.end();
        ovTitle.textContent = title;
        ovText.innerHTML = text + (isRecord ? '　<b>新纪录！</b>' : '');
        showActions([{ text: '再来一局', primary: true, fn: newGame }]);
        overlay.classList.remove('hidden');
    }

    function gameOver(playerWon) {
        if (mode === 'solo') {
            var best = loadBest();
            var isRecord = score > best;
            if (isRecord) { saveBest(score); best = score; }
            bestEl.textContent = best;
            endGame('游戏结束', '共接 <b>' + score + '</b> 个成语', isRecord);
        } else {
            endGame(playerWon ? '你赢了！' : '你输了',
                '你接 <b>' + score + '</b> 个 · 剩余生命 ' + Math.max(0, lives), false);
        }
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
        stopTimer();
        overlay.classList.add('hidden');
        lives = LIVES_MAX;
        aiLives = LIVES_MAX;
        score = 0;
        chain = [];
        used = {};
        requiredChar = '';
        hintUses = HINT_MAX;
        locked = false;
        turn = 'player';
        updateLives();
        updateAiLives();
        scoreEl.textContent = '0';
        hintBtn.textContent = '提示 ' + hintUses;
        hintBtn.disabled = false;
        if (mode === 'battle') {
            aiHud.classList.remove('hide');
            diffEl.classList.remove('hide');
        } else {
            aiHud.classList.add('hide');
            diffEl.classList.add('hide');
        }
        loadBest();
        updateTurn();
        setControls();
        newChain();
    }

    function setMode(m) {
        if (mode === m) return;
        mode = m;
        modeSoloBtn.classList.toggle('active', m === 'solo');
        modeBattleBtn.classList.toggle('active', m === 'battle');
        newGame();
    }

    function setDiff(d) {
        if (diff === d) return;
        diff = d;
        diffEasyBtn.classList.toggle('active', d === 'easy');
        diffNormalBtn.classList.toggle('active', d === 'normal');
        diffHardBtn.classList.toggle('active', d === 'hard');
        newGame();
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
    modeSoloBtn.addEventListener('click', function () { setMode('solo'); });
    modeBattleBtn.addEventListener('click', function () { setMode('battle'); });
    diffEasyBtn.addEventListener('click', function () { setDiff('easy'); });
    diffNormalBtn.addEventListener('click', function () { setDiff('normal'); });
    diffHardBtn.addEventListener('click', function () { setDiff('hard'); });

    newGame();
})();
