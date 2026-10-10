/* 扑克牌记忆 · demo18 */
(function () {
    'use strict';

    var SUITS = [
        { sym: '\u2660', color: 'black' },
        { sym: '\u2665', color: 'red' },
        { sym: '\u2666', color: 'red' },
        { sym: '\u2663', color: 'black' }
    ];
    var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    var COUNT_OPTIONS = [5, 10, 20, 52];

    var count = 5, seq = [], poolOrder = [], place = [], marks = [], memoIndex = 0;

    var bestEl = document.getElementById('best');
    var setupScreen = document.getElementById('screen-setup');
    var memoScreen = document.getElementById('screen-memorize');
    var recallScreen = document.getElementById('screen-recall');
    var resultScreen = document.getElementById('screen-result');
    var countChips = document.getElementById('count-chips');
    var startBtn = document.getElementById('start-btn');
    var memoProg = document.getElementById('memo-prog');
    var bigwrap = document.getElementById('bigwrap');
    var memoPrev = document.getElementById('memo-prev');
    var memoNext = document.getElementById('memo-next');
    var memoQuit = document.getElementById('memo-quit');
    var slotsEl = document.getElementById('slots');
    var poolEl = document.getElementById('pool');
    var recallReset = document.getElementById('recall-reset');
    var recallSubmit = document.getElementById('recall-submit');
    var recallQuit = document.getElementById('recall-quit');
    var recallFeed = document.getElementById('recall-feed');
    var resStars = document.getElementById('res-stars');
    var resTitle = document.getElementById('res-title');
    var resText = document.getElementById('res-text');
    var resList = document.getElementById('res-list');
    var resAgain = document.getElementById('res-again');
    var resSetup = document.getElementById('res-setup');

    function randInt(n) { return Math.floor(Math.random() * n); }
    function shuffle(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = randInt(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function fullDeck() {
        var d = [];
        for (var s = 0; s < 4; s++) for (var r = 0; r < RANKS.length; r++) d.push({ s: s, r: r });
        return d;
    }
    function cid(c) { return c.s + '-' + c.r; }
    function show(el) {
        [setupScreen, memoScreen, recallScreen, resultScreen].forEach(function (x) { x.classList.add('hide'); });
        el.classList.remove('hide');
    }
    function loadBest() {
        var b = 0;
        try { b = parseInt(localStorage.getItem('cards-best') || '0', 10) || 0; } catch (e) { b = 0; }
        bestEl.textContent = b;
        return b;
    }
    function saveBest(v) { try { localStorage.setItem('cards-best', String(v)); } catch (e) { } }

    function renderCard(card, cls) {
        var d = document.createElement('div');
        d.className = 'pcard ' + SUITS[card.s].color + (cls ? ' ' + cls : '');
        var r = document.createElement('span'); r.className = 'r'; r.textContent = RANKS[card.r];
        var s = document.createElement('span'); s.className = 's'; s.textContent = SUITS[card.s].sym;
        var rb = document.createElement('span'); rb.className = 'rb'; rb.textContent = RANKS[card.r];
        d.appendChild(r); d.appendChild(s); d.appendChild(rb);
        return d;
    }

    function buildSetup() {
        countChips.textContent = '';
        COUNT_OPTIONS.forEach(function (c) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip-btn' + (c === count ? ' active' : '');
            b.textContent = c === 52 ? '整副 52 张' : c + ' 张';
            b.addEventListener('click', function () { count = c; buildSetup(); });
            countChips.appendChild(b);
        });
    }

    // ---- memorize ----
    function startMemorize() {
        seq = shuffle(fullDeck()).slice(0, count);
        memoIndex = 0;
        show(memoScreen);
        renderMemo();
    }
    function renderMemo() {
        bigwrap.textContent = '';
        bigwrap.appendChild(renderCard(seq[memoIndex], 'big'));
        memoProg.textContent = (memoIndex + 1) + ' / ' + seq.length;
        memoPrev.disabled = memoIndex === 0;
        memoNext.textContent = memoIndex === seq.length - 1 ? '开始回忆' : '下一张';
    }

    // ---- recall ----
    function startRecall() {
        poolOrder = shuffle(seq);
        place = new Array(seq.length).fill(null);
        marks = [];
        show(recallScreen);
        recallFeed.textContent = '';
        recallFeed.className = 'feed';
        renderRecall();
    }
    function placedIds() {
        var m = {};
        place.forEach(function (c) { if (c) m[cid(c)] = 1; });
        return m;
    }
    function renderRecall() {
        slotsEl.textContent = '';
        for (var i = 0; i < seq.length; i++) {
            (function (i) {
                var slot = document.createElement('div');
                slot.className = 'slot';
                if (marks[i]) slot.classList.add(marks[i]);
                if (place[i]) {
                    slot.appendChild(renderCard(place[i]));
                    slot.addEventListener('click', function () {
                        if (marks.length) return;
                        place[i] = null;
                        renderRecall();
                    });
                } else {
                    slot.textContent = (i + 1);
                }
                slotsEl.appendChild(slot);
            })(i);
        }
        poolEl.textContent = '';
        var used = placedIds();
        poolOrder.forEach(function (c) {
            if (used[cid(c)]) return;
            var el = renderCard(c);
            el.addEventListener('click', function () {
                if (marks.length) return;
                for (var k = 0; k < place.length; k++) { if (!place[k]) { place[k] = c; break; } }
                renderRecall();
            });
            poolEl.appendChild(el);
        });
    }
    function submitRecall() {
        if (place.indexOf(null) !== -1) { recallFeed.textContent = '还有位置没放牌'; recallFeed.className = 'feed bad'; return; }
        marks = place.map(function (c, i) { return cid(c) === cid(seq[i]) ? 'correct' : 'wrong'; });
        renderRecall();
        var correct = marks.filter(function (m) { return m === 'correct'; }).length;
        showResult(correct);
    }

    function showResult(correct) {
        var total = seq.length;
        var stars = correct === total ? 3 : (correct >= total * 0.7 ? 2 : (correct >= total * 0.4 ? 1 : 0));
        var s = '';
        for (var i = 1; i <= 3; i++) s += '<span class="star' + (i <= stars ? ' on' : '') + '">★</span>';
        resStars.innerHTML = s;
        resTitle.textContent = correct === total ? '全对！' : '完成';
        var best = loadBest();
        var isRecord = correct === total && total > best;
        if (isRecord) { saveBest(total); best = total; }
        bestEl.textContent = best;
        resText.textContent = '答对 ' + correct + ' / ' + total + ' 张' + (isRecord ? '　新纪录！' : '');
        resList.textContent = '';
        for (var k = 0; k < seq.length; k++) {
            var row = document.createElement('div');
            row.className = 'lrow ' + (marks[k] === 'correct' ? 'good' : 'bad');
            var b = document.createElement('b'); b.textContent = '#' + (k + 1);
            var mid = document.createElement('div'); mid.className = 'mid';
            if (place[k]) { var pc = renderCard(place[k], 'mini'); mid.appendChild(pc); }
            row.appendChild(b); row.appendChild(mid);
            var r = document.createElement('span'); r.className = 'r';
            if (marks[k] === 'correct') { r.textContent = '对'; }
            else {
                var wrap = document.createElement('span');
                wrap.textContent = '应记 ';
                var sc = renderCard(seq[k], 'mini');
                wrap.appendChild(sc);
                r.appendChild(wrap);
            }
            row.appendChild(r);
            resList.appendChild(row);
        }
        show(resultScreen);
    }

    // ---- bindings ----
    startBtn.addEventListener('click', startMemorize);
    memoPrev.addEventListener('click', function () { if (memoIndex > 0) { memoIndex--; renderMemo(); } });
    memoNext.addEventListener('click', function () {
        if (memoIndex < seq.length - 1) { memoIndex++; renderMemo(); } else { startRecall(); }
    });
    memoQuit.addEventListener('click', function () { show(setupScreen); });
    recallQuit.addEventListener('click', function () { show(memoScreen); });
    recallReset.addEventListener('click', function () { place = new Array(seq.length).fill(null); marks = []; recallFeed.textContent = ''; recallFeed.className = 'feed'; renderRecall(); });
    recallSubmit.addEventListener('click', submitRecall);
    resAgain.addEventListener('click', startMemorize);
    resSetup.addEventListener('click', function () { show(setupScreen); });

    loadBest();
    buildSetup();
    show(setupScreen);
})();
