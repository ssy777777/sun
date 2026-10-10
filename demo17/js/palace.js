/* 记忆宫殿（地点法）· demo17 */
(function () {
    'use strict';

    var PALACES = [
        {
            name: '我的家',
            nodes: [
                { name: '门口', x: 0.12, y: 0.62 }, { name: '鞋柜', x: 0.20, y: 0.80 },
                { name: '客厅', x: 0.32, y: 0.50 }, { name: '沙发', x: 0.44, y: 0.74 },
                { name: '茶几', x: 0.44, y: 0.42 }, { name: '电视', x: 0.58, y: 0.52 },
                { name: '餐桌', x: 0.68, y: 0.74 }, { name: '冰箱', x: 0.82, y: 0.52 },
                { name: '厨房', x: 0.88, y: 0.76 }, { name: '楼梯', x: 0.80, y: 0.24 },
                { name: '卧室', x: 0.60, y: 0.15 }, { name: '床头', x: 0.40, y: 0.18 }
            ]
        },
        {
            name: '校园',
            nodes: [
                { name: '校门', x: 0.12, y: 0.72 }, { name: '操场', x: 0.24, y: 0.50 },
                { name: '旗杆', x: 0.32, y: 0.74 }, { name: '教学楼', x: 0.44, y: 0.40 },
                { name: '楼梯口', x: 0.50, y: 0.66 }, { name: '教室', x: 0.62, y: 0.44 },
                { name: '讲台', x: 0.66, y: 0.74 }, { name: '图书馆', x: 0.80, y: 0.44 },
                { name: '书架', x: 0.86, y: 0.72 }, { name: '食堂', x: 0.66, y: 0.15 },
                { name: '小卖部', x: 0.42, y: 0.15 }, { name: '宿舍', x: 0.22, y: 0.24 }
            ]
        },
        {
            name: '公园',
            nodes: [
                { name: '大门', x: 0.12, y: 0.50 }, { name: '小径', x: 0.20, y: 0.30 },
                { name: '长椅', x: 0.30, y: 0.54 }, { name: '花坛', x: 0.42, y: 0.32 },
                { name: '喷泉', x: 0.52, y: 0.56 }, { name: '凉亭', x: 0.62, y: 0.34 },
                { name: '池塘', x: 0.72, y: 0.58 }, { name: '小桥', x: 0.80, y: 0.36 },
                { name: '树林', x: 0.88, y: 0.58 }, { name: '假山', x: 0.70, y: 0.15 },
                { name: '健身区', x: 0.46, y: 0.15 }, { name: '出口', x: 0.22, y: 0.15 }
            ]
        }
    ];

    var ITEMS = ['苹果', '雨伞', '钥匙', '书本', '小猫', '手机', '花瓶', '帽子', '面包', '吉他',
        '足球', '眼镜', '牛奶', '蜡烛', '报纸', '气球', '相机', '铅笔', '领带', '闹钟',
        '剪刀', '胶带', '邮票', '手表', '手套', '围巾', '背包', '钱包', '地图', '望远镜',
        '收音机', '电风扇', '台灯', '茶杯', '盘子', '筷子', '勺子', '锅铲', '灭火器', '弓箭',
        '奖杯', '风筝', '灯笼', '锣鼓', '算盘', '印章', '墨镜', '口罩', '药瓶', '跳绳'];

    var ASSOC = [
        '在【{loc}】，想象一个巨大的{word}，大到把这里都占满了。',
        '走到【{loc}】，忽然看到{word}在发光、还会动。',
        '【{loc}】上摆着一个{word}，颜色特别鲜艳，还很夸张。',
        '想象{word}从【{loc}】里蹦了出来，发出很大的声音。',
        '把{word}和【{loc}】粘在一起，越离奇越好记。'
    ];

    var COUNT_OPTIONS = [5, 8, 12];

    var palaceIndex = 0, count = 5, items = [], place = [], marks = [], memoIndex = 0, selected = null;

    var bestEl = document.getElementById('best');
    var setupScreen = document.getElementById('screen-setup');
    var memoScreen = document.getElementById('screen-memorize');
    var recallScreen = document.getElementById('screen-recall');
    var resultScreen = document.getElementById('screen-result');
    var palaceChips = document.getElementById('palace-chips');
    var countChips = document.getElementById('count-chips');
    var customEl = document.getElementById('custom');
    var startBtn = document.getElementById('start-btn');
    var mapMemo = document.getElementById('map-memo');
    var memoProg = document.getElementById('memo-prog');
    var memoLoc = document.getElementById('memo-loc');
    var memoWord = document.getElementById('memo-word');
    var memoAssoc = document.getElementById('memo-assoc');
    var memoPrev = document.getElementById('memo-prev');
    var memoNext = document.getElementById('memo-next');
    var memoQuit = document.getElementById('memo-quit');
    var mapRecall = document.getElementById('map-recall');
    var trayEl = document.getElementById('tray');
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

    function palace() { return PALACES[palaceIndex]; }
    function randInt(n) { return Math.floor(Math.random() * n); }
    function shuffle(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = randInt(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function show(el) {
        [setupScreen, memoScreen, recallScreen, resultScreen].forEach(function (s) { s.classList.add('hide'); });
        el.classList.remove('hide');
    }
    function loadBest() {
        var b = 0;
        try { b = parseInt(localStorage.getItem('palace-best') || '0', 10) || 0; } catch (e) { b = 0; }
        bestEl.textContent = b;
        return b;
    }
    function saveBest(v) { try { localStorage.setItem('palace-best', String(v)); } catch (e) { } }

    function parseCustom(text) {
        return (text || '').split(/[\s,，、;；]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    }

    function buildSetup() {
        palaceChips.textContent = '';
        PALACES.forEach(function (p, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip-btn' + (i === palaceIndex ? ' active' : '');
            b.textContent = p.name;
            b.addEventListener('click', function () { palaceIndex = i; buildSetup(); });
            palaceChips.appendChild(b);
        });
        countChips.textContent = '';
        COUNT_OPTIONS.forEach(function (c) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip-btn' + (c === count ? ' active' : '');
            b.textContent = c + ' 站';
            b.addEventListener('click', function () { count = c; buildSetup(); });
            countChips.appendChild(b);
        });
    }

    // ---- memorize ----
    function startMemorize() {
        var nodes = palace().nodes;
        var pool = ITEMS;
        var custom = parseCustom(customEl.value);
        if (custom.length >= 3) pool = custom;
        var n = Math.min(count, nodes.length, pool.length);
        if (n < 3) n = Math.min(3, pool.length);
        count = n;
        items = shuffle(pool).slice(0, n);
        memoIndex = 0;
        show(memoScreen);
        renderMemo();
    }

    function renderMemo() {
        buildMap(mapMemo, items.length, { current: memoIndex });
        memoProg.textContent = (memoIndex + 1) + ' / ' + items.length;
        var node = palace().nodes[memoIndex];
        memoLoc.textContent = '第 ' + (memoIndex + 1) + ' 站 · ' + node.name;
        memoWord.textContent = items[memoIndex];
        memoAssoc.textContent = ASSOC[randInt(ASSOC.length)].replace('{loc}', node.name).replace('{word}', items[memoIndex]);
        memoPrev.disabled = memoIndex === 0;
        memoNext.textContent = memoIndex === items.length - 1 ? '开始回忆' : '下一站';
    }

    // ---- recall ----
    function startRecall() {
        place = new Array(items.length).fill(null);
        marks = [];
        selected = null;
        show(recallScreen);
        recallFeed.textContent = '';
        recallFeed.className = 'feed';
        renderRecall();
    }
    function renderRecall() {
        buildMap(mapRecall, items.length, { placements: place, onNodeClick: onNodeClick });
        renderTray();
    }
    function renderTray() {
        trayEl.textContent = '';
        var placed = {};
        place.forEach(function (v) { if (v) placed[v] = 1; });
        var remaining = items.filter(function (w) { return !placed[w]; });
        remaining.forEach(function (w) {
            var c = document.createElement('div');
            c.className = 'tchip' + (selected === w ? ' sel' : '');
            c.textContent = w;
            c.addEventListener('click', function () { selected = (selected === w ? null : w); renderTray(); });
            trayEl.appendChild(c);
        });
        if (!remaining.length) {
            var d = document.createElement('div');
            d.style.color = 'var(--muted)';
            d.style.fontSize = '13px';
            d.textContent = '都放好啦，点「提交」检查';
            trayEl.appendChild(d);
        }
    }
    function onNodeClick(i) {
        if (selected) {
            if (place[i]) return;
            place[i] = selected;
            selected = null;
        } else if (place[i]) {
            place[i] = null;
        }
        renderRecall();
    }
    function submitRecall() {
        if (place.indexOf(null) !== -1) { recallFeed.textContent = '还有地点没放词语'; recallFeed.className = 'feed bad'; return; }
        marks = place.map(function (v, i) { return v === items[i] ? 'correct' : 'wrong'; });
        buildMap(mapRecall, items.length, { placements: place, marks: marks });
        var correct = marks.filter(function (m) { return m === 'correct'; }).length;
        showResult(correct);
    }

    function showResult(correct) {
        var total = items.length;
        var stars = correct === total ? 3 : (correct >= total * 0.7 ? 2 : (correct >= total * 0.4 ? 1 : 0));
        var s = '';
        for (var i = 1; i <= 3; i++) s += '<span class="star' + (i <= stars ? ' on' : '') + '">★</span>';
        resStars.innerHTML = s;
        resTitle.textContent = correct === total ? '全对！' : '完成';
        var best = loadBest();
        var isRecord = correct === total && total > best;
        if (isRecord) { saveBest(total); best = total; }
        bestEl.textContent = best;
        resText.textContent = '答对 ' + correct + ' / ' + total + ' 站' + (isRecord ? '　新纪录！' : '');
        resList.textContent = '';
        for (var k = 0; k < items.length; k++) {
            var row = document.createElement('div');
            row.className = 'lrow ' + (marks[k] === 'correct' ? 'good' : 'bad');
            row.innerHTML = '<b>' + (k + 1) + '. ' + palace().nodes[k].name + '</b>' +
                '<span>' + (place[k] || '—') + '</span>' +
                '<span class="r">' + (marks[k] === 'correct' ? '对' : '应记：' + items[k]) + '</span>';
            resList.appendChild(row);
        }
        show(resultScreen);
    }

    // ---- map builder ----
    function buildMap(container, n, opts) {
        opts = opts || {};
        container.innerHTML = '';
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        var pts = [];
        for (var i = 0; i < n; i++) { var nn = palace().nodes[i]; pts.push((nn.x * 100) + ',' + (nn.y * 100)); }
        var poly = document.createElementNS(svgNS, 'polyline');
        poly.setAttribute('points', pts.join(' '));
        svg.appendChild(poly);
        container.appendChild(svg);

        for (var k = 0; k < n; k++) {
            (function (k) {
                var nd = palace().nodes[k];
                var node = document.createElement('div');
                node.className = 'node';
                node.style.left = (nd.x * 100) + '%';
                node.style.top = (nd.y * 100) + '%';
                var dot = document.createElement('div'); dot.className = 'dot'; dot.textContent = (k + 1);
                var nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = nd.name;
                var slot = document.createElement('div'); slot.className = 'slot';
                if (opts.current === k) node.classList.add('cur');
                if (opts.placements) { if (opts.placements[k]) slot.textContent = opts.placements[k]; }
                if (opts.marks && opts.marks[k]) node.classList.add(opts.marks[k]);
                node.appendChild(dot); node.appendChild(nm); node.appendChild(slot);
                if (opts.onNodeClick) node.addEventListener('click', function () { opts.onNodeClick(k); });
                container.appendChild(node);
            })(k);
        }
    }

    // ---- bindings ----
    startBtn.addEventListener('click', startMemorize);
    memoPrev.addEventListener('click', function () { if (memoIndex > 0) { memoIndex--; renderMemo(); } });
    memoNext.addEventListener('click', function () {
        if (memoIndex < items.length - 1) { memoIndex++; renderMemo(); } else { startRecall(); }
    });
    memoQuit.addEventListener('click', function () { show(setupScreen); });
    recallQuit.addEventListener('click', function () { show(memoScreen); });
    recallReset.addEventListener('click', function () { place = new Array(items.length).fill(null); selected = null; marks = []; recallFeed.textContent = ''; recallFeed.className = 'feed'; renderRecall(); });
    recallSubmit.addEventListener('click', submitRecall);
    resAgain.addEventListener('click', function () { startMemorize(); });
    resSetup.addEventListener('click', function () { show(setupScreen); });

    loadBest();
    buildSetup();
    show(setupScreen);
})();
