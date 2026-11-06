/* 保护王中王 —— 纯原生 Canvas 塔防
 * 玩法参考「保卫萝卜」：在偷冠大军的必经之路上建塔，别让它们碰到王中王。
 * 王中王由真人照片出演：满血是照片 1，被偷几次后换成照片 3，失败弹窗用照片 2。
 * 无依赖，手机 / 电脑双端。 */
(function () {
    'use strict';

    /* ================= 常量 ================= */
    var TAU = Math.PI * 2;
    var COLS = 10, ROWS = 14;
    var TOTAL_WAVES = 20;
    var START_GOLD = 260;
    var START_HEARTS = 10;
    var SELL_RATE = 0.6;
    var TOWER_SCALE = 1.3;
    var ANGRY_AT = 7;                       // 王冠 <= 7 时换成“不爽”照片
    var KING = { x: 8.78, y: 12.18 };
    var BEST_KEY = 'king-best';
    var BEST_WAVE_KEY = 'king-best-wave';
    var SOUND_KEY = 'king-sound';

    var PATH = [
        { x: -0.7, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 3.5, y: 4.5 },
        { x: 1.5, y: 4.5 }, { x: 1.5, y: 7.5 }, { x: 4.5, y: 7.5 },
        { x: 4.5, y: 5.5 }, { x: 7.5, y: 5.5 }, { x: 7.5, y: 9.5 },
        { x: 5.5, y: 9.5 }, { x: 5.5, y: 12.5 }, { x: 7.5, y: 12.5 }
    ];

    var PAD_POS = [
        [2.5, 2.5], [4.5, 2.5], [0.5, 3.5], [2.5, 5.5],
        [5.5, 4.5], [6.5, 6.5], [8.5, 4.5], [8.5, 6.5],
        [8.5, 8.5], [6.5, 8.5], [3.5, 8.5], [4.5, 10.5],
        [4.5, 12.5], [6.5, 10.5]
    ];

    var TOWERS = {
        arrow: {
            name: '箭塔', color: '#e4b56a', cost: 70,
            levels: [
                { dmg: 12, rate: 1.6, range: 3.0, up: 70 },
                { dmg: 22, rate: 2.0, range: 3.2, up: 110 },
                { dmg: 40, rate: 2.4, range: 3.5, up: 0 }
            ]
        },
        cannon: {
            name: '炮塔', color: '#b0bec5', cost: 120,
            levels: [
                { dmg: 40, rate: 0.55, range: 2.8, splash: 1.1, up: 100 },
                { dmg: 68, rate: 0.65, range: 3.0, splash: 1.3, up: 150 },
                { dmg: 108, rate: 0.75, range: 3.2, splash: 1.5, up: 0 }
            ]
        },
        frost: {
            name: '冰塔', color: '#7fe3ff', cost: 90,
            levels: [
                { dmg: 8, rate: 1.0, range: 2.8, slow: 0.45, slowDur: 1.6, up: 80 },
                { dmg: 14, rate: 1.2, range: 3.0, slow: 0.55, slowDur: 1.9, up: 120 },
                { dmg: 22, rate: 1.4, range: 3.3, slow: 0.65, slowDur: 2.2, up: 0 }
            ]
        },
        tesla: {
            name: '电塔', color: '#c4a7ff', cost: 150,
            levels: [
                { dmg: 26, rate: 0.75, range: 3.0, chains: 2, up: 120 },
                { dmg: 44, rate: 0.9, range: 3.2, chains: 3, up: 180 },
                { dmg: 70, rate: 1.05, range: 3.5, chains: 4, up: 0 }
            ]
        }
    };
    var TOWER_KEYS = ['arrow', 'cannon', 'frost', 'tesla'];

    var ENEMIES = {
        slime: { name: '偷冠小怪', hp: 45, speed: 1.2, gold: 7, life: 1, r: 0.32, color: '#6cc551', dark: '#3e8f37' },
        runner: { name: '快跑蟊贼', hp: 30, speed: 1.9, gold: 8, life: 1, r: 0.28, color: '#ff9f43', dark: '#d9741f' },
        tank: { name: '铁甲大盗', hp: 150, speed: 0.72, gold: 20, life: 1, r: 0.42, color: '#90a4ae', dark: '#455a64' },
        flyer: { name: '飞天蝙蝠', hp: 38, speed: 1.55, gold: 10, life: 1, r: 0.30, color: '#b388ff', dark: '#6a3fd1', fly: true },
        boss: { name: '偷冠大王', hp: 600, speed: 0.55, gold: 70, life: 2, r: 0.55, color: '#ff5252', dark: '#b71c1c', boss: true }
    };

    function wv(type, count, gap, delay) {
        return { type: type, count: count, gap: gap, delay: delay || 0 };
    }

    var WAVES = [
        [wv('slime', 6, 0.9)],
        [wv('slime', 8, 0.8), wv('runner', 2, 1.2, 6)],
        [wv('slime', 8, 0.7), wv('runner', 4, 0.9, 4)],
        [wv('runner', 6, 0.65), wv('tank', 2, 2.4, 4)],
        [wv('slime', 4, 0.8), wv('runner', 5, 0.8, 3), wv('boss', 1, 0, 5)],
        [wv('flyer', 8, 0.75), wv('slime', 5, 0.8, 4)],
        [wv('runner', 10, 0.55), wv('tank', 2, 2.2, 5)],
        [wv('flyer', 8, 0.6), wv('tank', 3, 2.0, 3), wv('slime', 4, 0.9, 9)],
        [wv('runner', 10, 0.5), wv('flyer', 6, 0.7, 5), wv('tank', 3, 2.2, 9)],
        [wv('slime', 8, 0.6), wv('flyer', 6, 0.8, 3), wv('tank', 4, 2.0, 5), wv('boss', 1, 0, 6)],
        [wv('tank', 5, 1.8), wv('runner', 10, 0.5, 3)],
        [wv('flyer', 12, 0.5), wv('slime', 8, 0.6, 4), wv('tank', 3, 2.0, 8)],
        [wv('runner', 14, 0.45), wv('tank', 5, 1.7, 4), wv('flyer', 8, 0.6, 8)],
        [wv('tank', 6, 1.6), wv('flyer', 10, 0.55, 3), wv('runner', 8, 0.5, 7)],
        [wv('slime', 8, 0.55), wv('flyer', 8, 0.55, 3), wv('tank', 5, 1.8, 5), wv('boss', 1, 0, 7)],
        [wv('slime', 12, 0.45), wv('tank', 6, 1.5, 4), wv('flyer', 10, 0.5, 8)],
        [wv('runner', 16, 0.4), wv('tank', 7, 1.4, 4), wv('flyer', 12, 0.45, 8)],
        [wv('tank', 8, 1.3), wv('flyer', 12, 0.45, 3), wv('runner', 12, 0.4, 7)],
        [wv('slime', 10, 0.5), wv('tank', 9, 1.2, 3), wv('flyer', 14, 0.4, 6), wv('runner', 16, 0.35, 10)],
        [wv('tank', 8, 1.2), wv('flyer', 12, 0.4, 4), wv('runner', 14, 0.35, 7), wv('boss', 2, 8, 10), wv('slime', 10, 0.45, 14)]
    ];

    var QUOTES_HIT = ['哎哟！', '就这？', '我的会员卡！', '你们是真不守啊', '疼疼疼', '我记住你们了'];
    var QUOTES_WAVE = ['又来一波？', '守住啊各位', '我先把卡收好', '别让它们碰我'];
    var QUOTES_CLEAR = ['还行，继续', '就这？', '下一波放马过来', '稳住'];

    var CROP = {
        happy: { x: 40 / 828, y: 200 / 1445, w: 788 / 828, h: 788 / 1445 },
        angry: { x: 110 / 440, y: 0, w: 304 / 440, h: 304 / 304 }
    };

    /* ================= DOM ================= */
    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');
    var stageWrap = document.getElementById('stage-wrap');
    var shopEl = document.getElementById('shop');
    var towerPanel = document.getElementById('tower-panel');
    var tpName = document.getElementById('tp-name');
    var tpLv = document.getElementById('tp-lv');
    var tpStats = document.getElementById('tp-stats');
    var tpUp = document.getElementById('tp-up');
    var tpSell = document.getElementById('tp-sell');
    var tpClose = document.getElementById('tp-close');
    var waveEl = document.getElementById('hud-wave');
    var goldEl = document.getElementById('hud-gold');
    var heartsEl = document.getElementById('hud-hearts');
    var heartsChip = document.getElementById('hearts-chip');
    var speedBtn = document.getElementById('speed-btn');
    var soundBtn = document.getElementById('sound-btn');
    var pauseBtn = document.getElementById('pause-btn');
    var rankBtn = document.getElementById('rank-btn');
    var waveBtn = document.getElementById('wave-btn');
    var waveBtnLabel = document.getElementById('wave-btn-label');
    var waveBtnSub = document.getElementById('wave-btn-sub');
    var toastEl = document.getElementById('toast');
    var bannerEl = document.getElementById('banner');
    var bannerTitle = document.getElementById('banner-title');
    var bannerSub = document.getElementById('banner-sub');
    var stageHint = document.getElementById('stage-hint');
    var startOverlay = document.getElementById('start-overlay');
    var pauseOverlay = document.getElementById('pause-overlay');
    var endOverlay = document.getElementById('end-overlay');
    var startBtn = document.getElementById('start-btn');
    var startRank = document.getElementById('start-rank');
    var bestLine = document.getElementById('best-line');
    var resumeBtn = document.getElementById('resume-btn');
    var pauseRestart = document.getElementById('pause-restart');
    var pauseRank = document.getElementById('pause-rank');
    var endImg = document.getElementById('end-img');
    var endBanner = document.getElementById('end-banner');
    var endTag = document.getElementById('end-tag');
    var endTitle = document.getElementById('end-title');
    var endCaption = document.getElementById('end-caption');
    var endStats = document.getElementById('end-stats');
    var endBest = document.getElementById('end-best');
    var endRestart = document.getElementById('end-restart');
    var endRank = document.getElementById('end-rank');

    /* ================= 图片 ================= */
    var IMG = { happy: new Image(), angry: new Image() };
    IMG.happy.src = './img/king-1.jpg';
    IMG.angry.src = './img/king-3.jpg';

    /* ================= 状态 ================= */
    var W = 0, H = 0, DPR = 1, S = 60, OX = 0, OY = 0;
    var mapCache = null;
    var state = 'menu';                     // menu | prepare | wave | over | win
    var paused = false;
    var gameSpeed = 1;
    var gold = START_GOLD;
    var hearts = START_HEARTS;
    var wave = 1;
    var waveList = [];
    var spawnIndex = 0;
    var waveClock = 0;
    var waveUiT = 0;
    var enemies = [];
    var towers = [];
    var projectiles = [];
    var effects = [];
    var pads = PAD_POS.map(function (p) { return { x: p[0], y: p[1], tower: null }; });
    var selectedType = 'arrow';
    var selectedPad = null;
    var hoverPad = null;
    var kills = 0;
    var score = 0;
    var best = 0;
    var bestWave = 0;
    var eid = 0;
    var visualT = 0;
    var shake = 0;
    var padPulse = 0;
    var hintDismissed = false;
    var endTimer = 0;
    var isBestRun = false;
    var soundOn = true;
    var actx = null;
    var lastTime = 0;
    var shopCards = [];
    var sfxAt = {};

    var king = {
        mood: 'happy',
        hurt: 0,
        speech: '',
        speechT: 0,
        dead: false,
        deathT: 0
    };

    /* ================= 路径 ================= */
    var SEGS = [];
    var PATH_LEN = 0;
    (function () {
        for (var i = 1; i < PATH.length; i++) {
            var a = PATH[i - 1], b = PATH[i];
            var dx = b.x - a.x, dy = b.y - a.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            SEGS.push({
                x: a.x, y: a.y, dx: dx, dy: dy, len: len,
                ang: Math.atan2(dy, dx), start: PATH_LEN
            });
            PATH_LEN += len;
        }
    })();

    function pointAt(s) {
        if (s <= 0) {
            var g0 = SEGS[0];
            return { x: g0.x, y: g0.y, ang: g0.ang };
        }
        for (var i = 0; i < SEGS.length; i++) {
            var g = SEGS[i];
            if (s <= g.start + g.len || i === SEGS.length - 1) {
                var k = Math.min(1, Math.max(0, (s - g.start) / g.len));
                return {
                    x: g.x + g.dx * k,
                    y: g.y + g.dy * k,
                    ang: g.ang
                };
            }
        }
        return { x: 0, y: 0, ang: 0 };
    }

    function distToPath(x, y) {
        var bestD = Infinity;
        for (var i = 0; i < SEGS.length; i++) {
            var g = SEGS[i];
            var t = ((x - g.x) * g.dx + (y - g.y) * g.dy) / (g.len * g.len);
            t = Math.max(0, Math.min(1, t));
            var dx = x - (g.x + g.dx * t);
            var dy = y - (g.y + g.dy * t);
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) bestD = d;
        }
        return bestD;
    }

    /* ================= 工具 ================= */
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function hpMul(w) { return Math.pow(1.12, w - 1); }

    function roundRect(c, x, y, w, h, r) {
        r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function glow(c, x, y, r, color) {
        var g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function w2s(x, y) { return { x: OX + x * S, y: OY + y * S }; }
    function s2w(x, y) { return { x: (x - OX) / S, y: (y - OY) / S }; }

    function angleLerp(a, b, k) {
        var d = (b - a) % TAU;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        return a + d * Math.min(1, k);
    }

    var randSeed = 20261106;
    function reseed(n) { randSeed = n >>> 0; }
    function rnd() {
        randSeed = (randSeed * 1664525 + 1013904223) >>> 0;
        return randSeed / 4294967296;
    }

    /* ================= 音效 ================= */
    function audio() {
        if (!soundOn) return null;
        try {
            if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
            if (actx.state === 'suspended') actx.resume();
            return actx;
        } catch (e) { return null; }
    }

    function tone(freq, dur, type, vol, delay, to) {
        var a = audio();
        if (!a) return;
        var t0 = a.currentTime + (delay || 0);
        var o = a.createOscillator();
        var g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t0);
        if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol == null ? 0.07 : vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(a.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.03);
    }

    function noiseBurst(dur, vol, freq, delay) {
        var a = audio();
        if (!a) return;
        var t0 = a.currentTime + (delay || 0);
        var n = Math.max(1, Math.floor(a.sampleRate * dur));
        var buf = a.createBuffer(1, n, a.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) {
            var k = 1 - i / n;
            d[i] = (Math.random() * 2 - 1) * k * k;
        }
        var src = a.createBufferSource();
        src.buffer = buf;
        var f = a.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = freq || 900;
        var g = a.createGain();
        g.gain.value = vol == null ? 0.06 : vol;
        src.connect(f);
        f.connect(g);
        g.connect(a.destination);
        src.start(t0);
    }

    function gate(name, gap) {
        var now = performance.now();
        if ((sfxAt[name] || 0) + gap > now) return false;
        sfxAt[name] = now;
        return true;
    }

    function sfxClick() { tone(520, 0.05, 'square', 0.025); }
    function sfxBuild() { tone(330, 0.09, 'triangle', 0.08); tone(520, 0.12, 'triangle', 0.07, 0.07); }
    function sfxUpgrade() { tone(660, 0.1, 'sine', 0.07); tone(880, 0.14, 'sine', 0.07, 0.08); tone(1180, 0.16, 'sine', 0.05, 0.16); }
    function sfxSell() { tone(500, 0.14, 'triangle', 0.06, 0, 240); }
    function sfxDeny() { tone(170, 0.09, 'square', 0.04); tone(130, 0.1, 'square', 0.04, 0.09); }
    function sfxArrow() { if (gate('arrow', 0.06)) tone(1250, 0.045, 'triangle', 0.02, 0, 760); }
    function sfxCannon() { if (gate('cannon', 0.08)) { noiseBurst(0.16, 0.07, 500); tone(95, 0.15, 'sine', 0.06, 0, 48); } }
    function sfxBoom() { if (gate('boom', 0.07)) { noiseBurst(0.26, 0.075, 320); tone(70, 0.2, 'sine', 0.05, 0, 40); } }
    function sfxFrost() { if (gate('frost', 0.08)) tone(1350, 0.1, 'sine', 0.02, 0, 1900); }
    function sfxZap() { if (gate('zap', 0.07)) { noiseBurst(0.09, 0.04, 2600); tone(320, 0.08, 'sawtooth', 0.025, 0, 980); } }
    function sfxPop() { if (gate('pop', 0.03)) { noiseBurst(0.06, 0.04, 1500); tone(500, 0.05, 'square', 0.02, 0, 280); } }
    function sfxHurt() { if (gate('hurt', 0.18)) { tone(150, 0.3, 'sawtooth', 0.07, 0, 60); noiseBurst(0.2, 0.06, 340); } }
    function sfxWave() { tone(392, 0.13, 'triangle', 0.06); tone(523, 0.15, 'triangle', 0.06, 0.12); tone(659, 0.2, 'triangle', 0.05, 0.25); }
    function sfxClear() { tone(523, 0.11, 'sine', 0.06); tone(659, 0.12, 'sine', 0.06, 0.1); tone(880, 0.18, 'sine', 0.05, 0.2); }
    function sfxWin() { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.34, 'triangle', 0.07, i * 0.14); }); }
    function sfxLose() { tone(300, 0.4, 'sawtooth', 0.06, 0, 120); tone(190, 0.6, 'sine', 0.07, 0.16, 80); }

    /* ================= 尺寸 / 地图缓存 ================= */
    function resize() {
        var rect = stageWrap.getBoundingClientRect();
        W = Math.max(1, rect.width);
        H = Math.max(1, rect.height);
        DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        S = Math.max(12, Math.min((W - 12) / COLS, (H - 12) / ROWS));
        OX = (W - COLS * S) / 2;
        OY = (H - ROWS * S) / 2;
        buildMapCache();
    }

    function buildMapCache() {
        if (!W || !H) return;
        mapCache = document.createElement('canvas');
        mapCache.width = Math.round(W * DPR);
        mapCache.height = Math.round(H * DPR);
        var c = mapCache.getContext('2d');
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        drawStaticMap(c);
    }

    function drawStaticMap(c) {
        // 背景
        var bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d2d21');
        bg.addColorStop(0.55, '#071f16');
        bg.addColorStop(1, '#03110c');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
        glow(c, W * 0.16, H * 0.1, Math.max(W, H) * 0.52, 'rgba(49, 132, 88, 0.16)');
        glow(c, W * 0.9, H * 0.92, Math.max(W, H) * 0.48, 'rgba(120, 88, 28, 0.13)');

        var ix = OX, iy = OY, iw = COLS * S, ih = ROWS * S, ir = S * 0.52;

        // 岛阴影
        c.save();
        c.shadowColor = 'rgba(0,0,0,.58)';
        c.shadowBlur = S * 0.55;
        c.shadowOffsetY = S * 0.22;
        roundRect(c, ix, iy, iw, ih, ir);
        c.fillStyle = '#3d7a3e';
        c.fill();
        c.restore();

        c.save();
        roundRect(c, ix, iy, iw, ih, ir);
        c.clip();

        // 草地
        var gg = c.createLinearGradient(0, iy, 0, iy + ih);
        gg.addColorStop(0, '#86c768');
        gg.addColorStop(0.55, '#70b255');
        gg.addColorStop(1, '#5a9c47');
        c.fillStyle = gg;
        c.fillRect(ix, iy, iw, ih);

        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                c.fillStyle = (row + col) % 2 === 0 ? 'rgba(255,255,255,.026)' : 'rgba(0,30,10,.024)';
                c.fillRect(ix + col * S, iy + row * S, S, S);
            }
        }

        // 草叶 / 小花
        reseed(77701);
        for (var i = 0; i < COLS * ROWS * 2.4; i++) {
            var gx = rnd() * COLS;
            var gy = rnd() * ROWS;
            if (distToPath(gx, gy) < 0.52) continue;
            if (nearPadWorld(gx, gy, 0.48)) continue;
            if (gx > 6.8 && gy > 8.9) continue;
            var gp = w2s(gx, gy);
            c.strokeStyle = rnd() < 0.5 ? 'rgba(38,102,44,.32)' : 'rgba(166,221,121,.38)';
            c.lineWidth = Math.max(0.7, S * 0.018);
            c.beginPath();
            c.moveTo(gp.x, gp.y);
            c.quadraticCurveTo(gp.x + S * 0.02, gp.y - S * 0.05, gp.x + S * 0.04, gp.y - S * 0.09);
            c.stroke();
        }

        reseed(31007);
        for (var f = 0; f < 34; f++) {
            var fx = rnd() * COLS;
            var fy = rnd() * ROWS;
            if (distToPath(fx, fy) < 0.6) continue;
            if (nearPadWorld(fx, fy, 0.5)) continue;
            if (fx > 6.8 && fy > 8.9) continue;
            drawFlower(c, w2s(fx, fy), S, rnd());
        }

        // 路
        drawPath(c);

        // 静态装饰
        drawTree(c, 0.55, 0.6, 1.0);
        drawTree(c, 3.9, 0.65, 0.82);
        drawTree(c, 8.6, 0.6, 0.92);
        drawTree(c, 0.55, 13.2, 0.96);
        drawTree(c, 2.6, 13.3, 0.78);
        drawBush(c, 1.2, 1.0, 0.7);
        drawBush(c, 6.3, 1.0, 0.8);
        drawBush(c, 9.2, 0.9, 0.72);
        drawBush(c, 0.9, 6.4, 0.68);
        drawBush(c, 3.9, 13.3, 0.62);
        drawBush(c, 1.4, 11.0, 0.58);
        drawRock(c, 7.6, 2.2, 0.7);
        drawRock(c, 0.8, 10.2, 0.6);

        // 终点红毯、入口传送门
        drawThroneRug(c);
        drawSpawnGate(c);

        // 内描边
        c.strokeStyle = 'rgba(255,255,255,.09)';
        c.lineWidth = Math.max(1, S * 0.035);
        roundRect(c, ix + S * 0.05, iy + S * 0.05, iw - S * 0.1, ih - S * 0.1, ir - S * 0.04);
        c.stroke();
        c.restore();

        c.strokeStyle = 'rgba(30,66,30,.62)';
        c.lineWidth = Math.max(2, S * 0.06);
        roundRect(c, ix, iy, iw, ih, ir);
        c.stroke();
    }

    function nearPadWorld(x, y, r) {
        for (var i = 0; i < pads.length; i++) {
            var dx = x - pads[i].x, dy = y - pads[i].y;
            if (dx * dx + dy * dy < r * r) return true;
        }
        return false;
    }

    function tracePath(c) {
        var p = w2s(PATH[0].x, PATH[0].y);
        c.beginPath();
        c.moveTo(p.x, p.y);
        for (var i = 1; i < PATH.length; i++) {
            p = w2s(PATH[i].x, PATH[i].y);
            c.lineTo(p.x, p.y);
        }
    }

    function drawPath(c) {
        tracePath(c);
        c.lineCap = 'round';
        c.lineJoin = 'round';

        c.save();
        c.translate(S * 0.05, S * 0.09);
        c.strokeStyle = 'rgba(44,33,16,.3)';
        c.lineWidth = S * 1.02;
        c.stroke();
        c.restore();

        c.strokeStyle = '#b58e58';
        c.lineWidth = S * 0.96;
        c.stroke();

        c.strokeStyle = '#e9d5a6';
        c.lineWidth = S * 0.82;
        c.stroke();

        c.strokeStyle = 'rgba(177,140,88,.36)';
        c.lineWidth = S * 0.62;
        c.stroke();

        c.strokeStyle = '#f7eacb';
        c.lineWidth = S * 0.085;
        c.setLineDash([S * 0.1, S * 0.3]);
        c.stroke();
        c.setLineDash([]);

        // 路面碎石
        reseed(4521);
        for (var i = 0; i < 54; i++) {
            var s = rnd() * PATH_LEN;
            var pt = pointAt(s);
            var off = (rnd() - 0.5) * 0.62;
            var nx = -Math.sin(pt.ang), ny = Math.cos(pt.ang);
            var p = w2s(pt.x + nx * off, pt.y + ny * off);
            c.fillStyle = rnd() < 0.5 ? 'rgba(177,145,92,.28)' : 'rgba(255,248,222,.32)';
            c.beginPath();
            c.ellipse(p.x, p.y, S * (0.025 + rnd() * 0.02), S * (0.014 + rnd() * 0.012), pt.ang, 0, TAU);
            c.fill();
        }

        // 方向小箭头
        for (var a = 1.4; a < PATH_LEN; a += 3.1) {
            var q = pointAt(a);
            var qp = w2s(q.x, q.y);
            c.save();
            c.translate(qp.x, qp.y);
            c.rotate(q.ang);
            c.strokeStyle = 'rgba(147,110,60,.4)';
            c.lineWidth = Math.max(1.2, S * 0.035);
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(-S * 0.09, -S * 0.07);
            c.lineTo(S * 0.03, 0);
            c.lineTo(-S * 0.09, S * 0.07);
            c.stroke();
            c.restore();
        }
    }

    function drawFlower(c, p, s, r) {
        var cols = ['#ffe08a', '#ffb1c8', '#fff3d6', '#c8b6ff'];
        c.fillStyle = cols[Math.floor(r * cols.length) % cols.length];
        var rr = s * 0.035;
        for (var i = 0; i < 5; i++) {
            var a = i / 5 * TAU;
            c.beginPath();
            c.arc(p.x + Math.cos(a) * rr * 1.4, p.y + Math.sin(a) * rr * 1.4, rr, 0, TAU);
            c.fill();
        }
        c.fillStyle = '#e9a83f';
        c.beginPath();
        c.arc(p.x, p.y, rr * 0.9, 0, TAU);
        c.fill();
    }

    function drawTree(c, x, y, sc) {
        var p = w2s(x, y);
        c.save();
        c.translate(p.x, p.y);
        c.scale(sc, sc);
        c.fillStyle = 'rgba(12,39,20,.24)';
        c.beginPath();
        c.ellipse(0, S * 0.04, S * 0.26, S * 0.1, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#6f4527';
        c.fillRect(-S * 0.045, -S * 0.3, S * 0.09, S * 0.3);
        var blobs = [
            [-0.13, -0.44, 0.2, '#2f7a4a'],
            [0.13, -0.46, 0.21, '#2a6d42'],
            [0, -0.62, 0.23, '#347f4e'],
            [0, -0.42, 0.22, '#3b8d58']
        ];
        for (var i = 0; i < blobs.length; i++) {
            var b = blobs[i];
            c.fillStyle = b[3];
            c.beginPath();
            c.arc(b[0] * S, b[1] * S, b[2] * S, 0, TAU);
            c.fill();
        }
        c.fillStyle = 'rgba(255,255,255,.12)';
        c.beginPath();
        c.arc(-S * 0.07, -S * 0.62, S * 0.1, 0, TAU);
        c.fill();
        c.restore();
    }

    function drawBush(c, x, y, sc) {
        var p = w2s(x, y);
        c.save();
        c.translate(p.x, p.y);
        c.scale(sc, sc);
        c.fillStyle = 'rgba(10,38,20,.2)';
        c.beginPath();
        c.ellipse(0, S * 0.02, S * 0.2, S * 0.08, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#38824f';
        c.beginPath();
        c.arc(-S * 0.1, -S * 0.05, S * 0.12, 0, TAU);
        c.arc(S * 0.02, -S * 0.1, S * 0.14, 0, TAU);
        c.arc(S * 0.13, -S * 0.03, S * 0.1, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(190,240,160,.3)';
        c.beginPath();
        c.arc(-S * 0.02, -S * 0.16, S * 0.06, 0, TAU);
        c.fill();
        c.restore();
    }

    function drawRock(c, x, y, sc) {
        var p = w2s(x, y);
        c.save();
        c.translate(p.x, p.y);
        c.scale(sc, sc);
        c.fillStyle = 'rgba(10,30,18,.2)';
        c.beginPath();
        c.ellipse(0, S * 0.02, S * 0.16, S * 0.06, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#89968c';
        c.beginPath();
        c.moveTo(-S * 0.14, 0);
        c.lineTo(-S * 0.08, -S * 0.13);
        c.lineTo(S * 0.04, -S * 0.16);
        c.lineTo(S * 0.14, -S * 0.04);
        c.lineTo(S * 0.09, S * 0.02);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.22)';
        c.beginPath();
        c.moveTo(-S * 0.06, -S * 0.11);
        c.lineTo(S * 0.01, -S * 0.13);
        c.lineTo(S * 0.05, -S * 0.07);
        c.closePath();
        c.fill();
        c.restore();
    }

    function drawSpawnGate(c) {
        var p = w2s(0.28, 1.5);
        c.save();
        c.translate(p.x, p.y);

        var grd = c.createRadialGradient(0, 0, S * 0.03, 0, 0, S * 0.56);
        grd.addColorStop(0, 'rgba(198,139,255,.98)');
        grd.addColorStop(0.45, 'rgba(119,60,186,.88)');
        grd.addColorStop(1, 'rgba(30,14,56,0)');
        c.fillStyle = grd;
        c.beginPath();
        c.ellipse(0, 0, S * 0.33, S * 0.56, 0, 0, TAU);
        c.fill();

        var stones = [
            [-0.02, -0.62, 0.34, 0.22],
            [-0.02, 0.62, 0.34, 0.22],
            [-0.12, -0.4, 0.24, 0.16],
            [-0.12, 0.4, 0.24, 0.16]
        ];
        for (var i = 0; i < stones.length; i++) {
            var st = stones[i];
            c.fillStyle = i % 2 === 0 ? '#6d7a70' : '#59665e';
            roundRect(c, st[0] * S - st[2] * S / 2, st[1] * S - st[3] * S / 2, st[2] * S, st[3] * S, S * 0.06);
            c.fill();
            c.strokeStyle = 'rgba(255,255,255,.12)';
            c.lineWidth = Math.max(1, S * 0.018);
            c.stroke();
        }

        c.strokeStyle = '#4c4439';
        c.lineWidth = Math.max(2, S * 0.035);
        c.beginPath();
        c.moveTo(-S * 0.55, -S * 0.72);
        c.lineTo(-S * 0.55, S * 0.1);
        c.stroke();
        c.fillStyle = '#a12d38';
        c.beginPath();
        c.moveTo(-S * 0.55, -S * 0.7);
        c.lineTo(-S * 0.28, -S * 0.6);
        c.lineTo(-S * 0.55, -S * 0.48);
        c.closePath();
        c.fill();
        c.restore();
    }

    function drawThroneRug(c) {
        var p = w2s(8.35, 12.4);
        var w = S * 2.95, h = S * 2.35;
        c.save();
        c.translate(p.x, p.y);
        c.fillStyle = 'rgba(5,20,10,.28)';
        c.beginPath();
        c.ellipse(0, h * 0.18, w * 0.52, h * 0.28, 0, 0, TAU);
        c.fill();

        c.fillStyle = '#7c2530';
        roundRect(c, -w / 2, -h / 2, w, h, S * 0.17);
        c.fill();
        c.strokeStyle = 'rgba(255,208,116,.48)';
        c.lineWidth = Math.max(2, S * 0.05);
        c.stroke();

        c.strokeStyle = 'rgba(255,208,116,.22)';
        c.lineWidth = Math.max(1, S * 0.02);
        roundRect(c, -w / 2 + S * 0.16, -h / 2 + S * 0.16, w - S * 0.32, h - S * 0.32, S * 0.12);
        c.stroke();

        // 流苏
        c.strokeStyle = 'rgba(255,208,116,.55)';
        c.lineWidth = Math.max(1, S * 0.028);
        for (var i = 0; i < 9; i++) {
            var x = -w / 2 + S * 0.24 + i * (w - S * 0.48) / 8;
            c.beginPath();
            c.moveTo(x, h / 2);
            c.lineTo(x, h / 2 + S * 0.12);
            c.stroke();
        }
        c.restore();
    }

    /* ================= 绘制：建造点 / 塔 ================= */
    function drawPads() {
        for (var i = 0; i < pads.length; i++) {
            var pad = pads[i];
            if (pad.tower) continue;
            var p = w2s(pad.x, pad.y);
            var hovered = hoverPad === pad;
            var affordable = gold >= TOWERS[selectedType].cost;
            var ringR = S * 0.29;

            ctx.fillStyle = 'rgba(9,38,19,.28)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + S * 0.03, S * 0.32, S * 0.13, 0, 0, TAU);
            ctx.fill();

            ctx.fillStyle = hovered ? 'rgba(255,229,150,.24)' : 'rgba(23,58,35,.6)';
            ctx.beginPath();
            ctx.arc(p.x, p.y - S * 0.02, ringR, 0, TAU);
            ctx.fill();

            ctx.strokeStyle = affordable ? 'rgba(255,236,170,.62)' : 'rgba(255,236,170,.28)';
            ctx.lineWidth = Math.max(1.3, S * 0.035);
            ctx.setLineDash([S * 0.075, S * 0.075]);
            ctx.beginPath();
            ctx.arc(p.x, p.y - S * 0.02, ringR, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);

            if (hovered || padPulse > 0) {
                ctx.strokeStyle = 'rgba(255,224,140,' + (hovered ? 0.85 : 0.32 + padPulse * 0.5) + ')';
                ctx.lineWidth = Math.max(1.5, S * 0.045);
                ctx.beginPath();
                ctx.arc(p.x, p.y - S * 0.02, ringR + S * 0.05, 0, TAU);
                ctx.stroke();
            }

            ctx.strokeStyle = affordable ? 'rgba(255,246,210,.75)' : 'rgba(255,246,210,.4)';
            ctx.lineWidth = Math.max(1.2, S * 0.035);
            ctx.lineCap = 'round';
            var ps = S * 0.08;
            ctx.beginPath();
            ctx.moveTo(p.x - ps, p.y - S * 0.02);
            ctx.lineTo(p.x + ps, p.y - S * 0.02);
            ctx.moveTo(p.x, p.y - S * 0.02 - ps);
            ctx.lineTo(p.x, p.y - S * 0.02 + ps);
            ctx.stroke();
        }
    }

    function drawRangePreview() {
        var pad = null, type = null, level = 1;
        if (selectedPad && selectedPad.tower) {
            pad = selectedPad;
            type = selectedPad.tower.type;
            level = selectedPad.tower.level;
        } else if (hoverPad && !hoverPad.tower && !paused) {
            pad = hoverPad;
            type = selectedType;
        }
        if (!pad || !type) return;
        var st = TOWERS[type].levels[level - 1];
        var p = w2s(pad.x, pad.y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, st.range * S, 0, TAU);
        ctx.fillStyle = 'rgba(255,224,138,.065)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,138,.5)';
        ctx.lineWidth = Math.max(1.2, S * 0.028);
        ctx.setLineDash([S * 0.12, S * 0.12]);
        ctx.stroke();
        ctx.restore();
    }

    function drawGhostTower() {
        if (!hoverPad || hoverPad.tower || selectedPad || paused) return;
        if (gold < TOWERS[selectedType].cost) return;
        var p = w2s(hoverPad.x, hoverPad.y);
        ctx.save();
        ctx.globalAlpha = 0.42;
        drawTowerArt(ctx, selectedType, 1, p.x, p.y, S * TOWER_SCALE, -Math.PI / 2, 0, visualT);
        ctx.restore();
    }

    function drawTowers() {
        for (var i = 0; i < towers.length; i++) {
            var t = towers[i];
            var p = w2s(t.pad.x, t.pad.y);
            drawTowerArt(ctx, t.type, t.level, p.x, p.y, S * TOWER_SCALE, t.aim, t.recoil, visualT);
        }
    }

    function drawTowerArt(c, type, level, px, py, s, aim, recoil, t) {
        aim = aim == null ? -Math.PI / 2 : aim;
        recoil = recoil || 0;
        t = t || 0;
        c.save();
        c.translate(px, py);

        // 地面阴影和石台
        c.fillStyle = 'rgba(5,22,11,.3)';
        c.beginPath();
        c.ellipse(0, s * 0.02, s * 0.35, s * 0.13, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#6f7d6a';
        c.beginPath();
        c.ellipse(0, -s * 0.02, s * 0.31, s * 0.13, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#97a58a';
        c.beginPath();
        c.ellipse(0, -s * 0.07, s * 0.28, s * 0.11, 0, 0, TAU);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,.16)';
        c.lineWidth = Math.max(1, s * 0.018);
        c.beginPath();
        c.ellipse(0, -s * 0.07, s * 0.28, s * 0.11, 0, 0, TAU);
        c.stroke();

        if (level >= 2) {
            c.strokeStyle = 'rgba(255,208,116,.72)';
            c.lineWidth = Math.max(1.2, s * 0.03);
            c.beginPath();
            c.ellipse(0, -s * 0.01, s * 0.32, s * 0.125, 0, 0, TAU);
            c.stroke();
        }
        if (level >= 3) {
            c.fillStyle = '#ffe08a';
            [-0.18, 0, 0.18].forEach(function (x) {
                c.beginPath();
                c.arc(x * s, s * 0.08, Math.max(1.2, s * 0.025), 0, TAU);
                c.fill();
            });
        }

        if (type === 'arrow') {
            c.fillStyle = '#7a4b22';
            roundRect(c, -s * 0.055, -s * 0.63, s * 0.11, s * 0.56, s * 0.03);
            c.fill();
            c.fillStyle = '#a36c32';
            c.beginPath();
            c.ellipse(0, -s * 0.65, s * 0.17, s * 0.07, 0, 0, TAU);
            c.fill();

            c.save();
            c.translate(0, -s * 0.71);
            c.rotate(aim);
            c.translate(-recoil * s * 0.08, 0);
            c.fillStyle = '#5b3a18';
            roundRect(c, -s * 0.08, -s * 0.035, s * 0.34, s * 0.07, s * 0.03);
            c.fill();
            c.strokeStyle = '#e0b86b';
            c.lineWidth = Math.max(1.5, s * 0.035);
            c.lineCap = 'round';
            c.beginPath();
            c.arc(s * 0.04, 0, s * 0.16, -Math.PI * 0.55, Math.PI * 0.55);
            c.stroke();
            c.strokeStyle = 'rgba(255,245,215,.8)';
            c.lineWidth = Math.max(0.8, s * 0.012);
            c.beginPath();
            c.moveTo(s * 0.04 + Math.cos(-Math.PI * 0.55) * s * 0.16, Math.sin(-Math.PI * 0.55) * s * 0.16);
            c.lineTo(s * 0.12, 0);
            c.lineTo(s * 0.04 + Math.cos(Math.PI * 0.55) * s * 0.16, Math.sin(Math.PI * 0.55) * s * 0.16);
            c.stroke();
            c.strokeStyle = '#f4e8c8';
            c.lineWidth = Math.max(1.2, s * 0.018);
            c.beginPath();
            c.moveTo(s * 0.06, 0);
            c.lineTo(s * 0.37, 0);
            c.stroke();
            c.fillStyle = '#f4e8c8';
            c.beginPath();
            c.moveTo(s * 0.4, 0);
            c.lineTo(s * 0.32, -s * 0.035);
            c.lineTo(s * 0.32, s * 0.035);
            c.closePath();
            c.fill();
            c.restore();
        } else if (type === 'cannon') {
            c.fillStyle = '#4c5a52';
            c.beginPath();
            c.ellipse(0, -s * 0.33, s * 0.25, s * 0.22, 0, 0, TAU);
            c.fill();
            c.fillStyle = '#697a70';
            c.beginPath();
            c.ellipse(0, -s * 0.37, s * 0.23, s * 0.18, 0, 0, TAU);
            c.fill();
            c.fillStyle = '#2f3d35';
            c.beginPath();
            c.arc(-s * 0.12, -s * 0.44, s * 0.025, 0, TAU);
            c.arc(s * 0.06, -s * 0.48, s * 0.022, 0, TAU);
            c.fill();

            c.save();
            c.translate(0, -s * 0.47);
            c.rotate(aim);
            c.translate(-recoil * s * 0.09, 0);
            c.fillStyle = '#2f3a34';
            roundRect(c, -s * 0.02, -s * 0.11, s * 0.42, s * 0.22, s * 0.09);
            c.fill();
            c.fillStyle = '#7f9186';
            roundRect(c, s * 0.22, -s * 0.13, s * 0.06, s * 0.26, s * 0.025);
            c.fill();
            c.fillStyle = '#171f1b';
            c.beginPath();
            c.ellipse(s * 0.42, 0, s * 0.045, s * 0.115, 0, 0, TAU);
            c.fill();
            c.restore();

            if (level >= 2) {
                c.fillStyle = '#2b332f';
                c.beginPath();
                c.arc(-s * 0.17, -s * 0.08, s * 0.045, 0, TAU);
                c.arc(-s * 0.06, -s * 0.06, s * 0.04, 0, TAU);
                c.fill();
            }
        } else if (type === 'frost') {
            c.fillStyle = '#2f6f85';
            c.beginPath();
            c.ellipse(0, -s * 0.06, s * 0.26, s * 0.11, 0, 0, TAU);
            c.fill();
            c.save();
            c.shadowColor = 'rgba(120,235,255,.8)';
            c.shadowBlur = s * 0.22;
            drawCrystal(c, -s * 0.13, -s * 0.45, s * 0.3, s * 0.13, '#58cbed', '#c9f8ff');
            drawCrystal(c, s * 0.08, -s * 0.58, s * 0.4, s * 0.16, '#45bce3', '#dffcff');
            drawCrystal(c, s * 0.03, -s * 0.34, s * 0.23, s * 0.1, '#8be6ff', '#f0feff');
            c.restore();

            c.save();
            c.translate(0, -s * 0.8);
            c.rotate(t * 0.8);
            c.strokeStyle = 'rgba(199,248,255,.85)';
            c.lineWidth = Math.max(1, s * 0.022);
            for (var f = 0; f < 6; f++) {
                c.rotate(Math.PI / 3);
                c.beginPath();
                c.moveTo(0, 0);
                c.lineTo(0, -s * 0.1);
                c.stroke();
            }
            c.restore();
        } else {
            // 电塔
            c.fillStyle = '#463a5e';
            c.beginPath();
            c.ellipse(0, -s * 0.08, s * 0.26, s * 0.11, 0, 0, TAU);
            c.fill();
            c.strokeStyle = '#9c85d8';
            c.lineWidth = Math.max(1.2, s * 0.025);
            for (var r = 0; r < 3; r++) {
                c.beginPath();
                c.ellipse(0, -s * (0.2 + r * 0.12), s * (0.18 - r * 0.025), s * 0.055, 0, 0, TAU);
                c.stroke();
            }
            c.fillStyle = '#6d5a9a';
            roundRect(c, -s * 0.028, -s * 0.62, s * 0.056, s * 0.45, s * 0.02);
            c.fill();

            var orbY = -s * 0.65;
            c.save();
            c.shadowColor = 'rgba(200,170,255,.95)';
            c.shadowBlur = s * (0.18 + recoil * 0.08);
            var og = c.createRadialGradient(-s * 0.02, orbY - s * 0.02, 0, 0, orbY, s * 0.115);
            og.addColorStop(0, '#ffffff');
            og.addColorStop(0.4, '#d6c4ff');
            og.addColorStop(1, '#7c5cc9');
            c.fillStyle = og;
            c.beginPath();
            c.arc(0, orbY, s * 0.105, 0, TAU);
            c.fill();
            c.restore();

            c.strokeStyle = 'rgba(223,208,255,.8)';
            c.lineWidth = Math.max(0.8, s * 0.018);
            for (var a = 0; a < 3; a++) {
                var ang = t * 1.7 + a * TAU / 3;
                c.beginPath();
                c.moveTo(Math.cos(ang) * s * 0.13, orbY + Math.sin(ang) * s * 0.13);
                c.lineTo(Math.cos(ang + 0.35) * s * 0.22, orbY + Math.sin(ang + 0.35) * s * 0.22);
                c.lineTo(Math.cos(ang + 0.6) * s * 0.15, orbY + Math.sin(ang + 0.6) * s * 0.15);
                c.stroke();
            }
        }

        c.restore();
    }

    function drawCrystal(c, x, y, h, w, col, hi) {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x, y - h * 0.55);
        c.lineTo(x + w, y - h * 0.05);
        c.lineTo(x + w * 0.42, y + h * 0.35);
        c.lineTo(x - w * 0.42, y + h * 0.35);
        c.lineTo(x - w, y - h * 0.05);
        c.closePath();
        c.fill();
        c.fillStyle = hi;
        c.beginPath();
        c.moveTo(x, y - h * 0.55);
        c.lineTo(x + w * 0.5, y - h * 0.05);
        c.lineTo(x, y + h * 0.12);
        c.closePath();
        c.fill();
    }

    /* ================= 绘制：王中王 ================= */
    function drawKing() {
        var p = w2s(KING.x, KING.y);
        var bob = Math.sin(visualT * 2.2) * S * 0.025;
        var shx = king.hurt > 0 ? Math.sin(visualT * 70) * S * 0.02 * king.hurt : 0;
        var shy = king.hurt > 0 ? Math.cos(visualT * 61) * S * 0.012 * king.hurt : 0;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + S * 0.1, S * 1.02, S * 0.24, 0, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(p.x + shx, p.y + shy);
        var deathK = king.dead ? Math.min(1, king.deathT / 0.7) : 0;
        if (deathK > 0) {
            ctx.rotate(deathK * 0.55);
            ctx.translate(deathK * S * 0.22, 0);
        }
        ctx.translate(0, bob);

        var fw = S * 2.3;
        var fh = S * 2.45;
        var fx = -fw / 2;
        var fy = -S * 0.1 - fh;

        // 披风
        ctx.fillStyle = '#7c2330';
        ctx.beginPath();
        ctx.moveTo(-S * 0.9, fy + S * 0.3);
        ctx.bezierCurveTo(-S * 1.38, fy + S * 0.92, -S * 1.14, fy + fh * 0.9, -S * 0.55, fy + fh + S * 0.06);
        ctx.quadraticCurveTo(0, fy + fh - S * 0.2, S * 0.55, fy + fh + S * 0.06);
        ctx.bezierCurveTo(S * 1.14, fy + fh * 0.9, S * 1.38, fy + S * 0.92, S * 0.9, fy + S * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,205,116,.5)';
        ctx.lineWidth = Math.max(1, S * 0.035);
        ctx.stroke();

        // 金框
        var fg = ctx.createLinearGradient(fx, 0, fx + fw, 0);
        fg.addColorStop(0, '#a86a1e');
        fg.addColorStop(0.25, '#ffe39a');
        fg.addColorStop(0.5, '#d19a3f');
        fg.addColorStop(0.75, '#ffecb8');
        fg.addColorStop(1, '#9a5e18');
        roundRect(ctx, fx, fy, fw, fh, S * 0.26);
        ctx.fillStyle = fg;
        ctx.fill();

        roundRect(ctx, fx + S * 0.075, fy + S * 0.075, fw - S * 0.15, fh - S * 0.15, S * 0.2);
        ctx.strokeStyle = 'rgba(85,48,5,.5)';
        ctx.lineWidth = Math.max(1, S * 0.028);
        ctx.stroke();

        // 照片
        var pad = S * 0.16;
        var pw = fw - pad * 2;
        var ph = pw;
        var px = fx + pad;
        var py = fy + pad;
        ctx.save();
        roundRect(ctx, px, py, pw, ph, S * 0.15);
        ctx.clip();
        var img = king.mood === 'angry' ? IMG.angry : IMG.happy;
        var crop = king.mood === 'angry' ? CROP.angry : CROP.happy;
        if (img.complete && img.naturalWidth) {
            ctx.drawImage(
                img,
                crop.x * img.naturalWidth, crop.y * img.naturalHeight,
                crop.w * img.naturalWidth, crop.h * img.naturalHeight,
                px, py, pw, ph
            );
        } else {
            ctx.fillStyle = '#19372a';
            ctx.fillRect(px, py, pw, ph);
            ctx.fillStyle = '#ffd074';
            ctx.font = '900 ' + Math.round(pw * 0.42) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('王', px + pw / 2, py + ph / 2);
        }
        // 玻璃反光
        ctx.fillStyle = 'rgba(255,255,255,.11)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + pw * 0.48, py);
        ctx.lineTo(px, py + ph * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 铭牌
        var npH = S * 0.27;
        var npY = py + ph + S * 0.035;
        roundRect(ctx, fx + S * 0.18, npY, fw - S * 0.36, npH, npH * 0.4);
        ctx.fillStyle = 'rgba(57,32,6,.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,160,.42)';
        ctx.lineWidth = Math.max(1, S * 0.014);
        ctx.stroke();
        ctx.fillStyle = '#ffe3a0';
        ctx.font = '900 ' + Math.max(9, Math.round(S * 0.185)) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('王中王', fx + fw / 2, npY + npH / 2 + 0.5);

        // 王冠
        drawCrown(ctx, fx + fw / 2, fy - S * 0.03, S * 1.3, S * 0.52, visualT);

        // 生气特效
        if (king.mood === 'angry' && !king.dead) {
            ctx.strokeStyle = '#ff5b4d';
            ctx.lineWidth = Math.max(1.2, S * 0.035);
            ctx.lineCap = 'round';
            var ax = fx + fw - S * 0.2;
            var ay = fy + S * 0.1;
            ctx.beginPath();
            ctx.moveTo(ax - S * 0.09, ay);
            ctx.lineTo(ax + S * 0.03, ay);
            ctx.moveTo(ax - S * 0.03, ay - S * 0.06);
            ctx.lineTo(ax - S * 0.03, ay + S * 0.06);
            ctx.stroke();

            for (var s = 0; s < 2; s++) {
                var k = (visualT * 0.9 + s * 0.5) % 1;
                ctx.fillStyle = 'rgba(255,255,255,' + ((1 - k) * 0.28) + ')';
                ctx.beginPath();
                ctx.arc(
                    fx + fw * 0.62 + Math.sin(visualT * 2 + s) * S * 0.12,
                    fy - S * 0.05 - k * S * 0.5,
                    S * (0.06 + k * 0.08), 0, TAU
                );
                ctx.fill();
            }
        }

        // 受击白闪
        if (king.hurt > 0) {
            ctx.globalAlpha = king.hurt * 0.3;
            ctx.fillStyle = '#fff';
            roundRect(ctx, fx, fy, fw, fh, S * 0.26);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    function drawCrown(c, x, baseY, w, h, t) {
        var bob = Math.sin(t * 2.3 + 0.6) * h * 0.035;
        c.save();
        c.translate(x, baseY + bob);

        var g = c.createLinearGradient(0, -h, 0, 0);
        g.addColorStop(0, '#fff0b4');
        g.addColorStop(0.45, '#ffd074');
        g.addColorStop(1, '#c88722');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-w / 2, 0);
        c.lineTo(-w / 2, -h * 0.58);
        c.lineTo(-w * 0.24, -h * 0.25);
        c.lineTo(0, -h);
        c.lineTo(w * 0.24, -h * 0.25);
        c.lineTo(w / 2, -h * 0.58);
        c.lineTo(w / 2, 0);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(120,72,8,.55)';
        c.lineWidth = Math.max(0.005, w * 0.025);
        c.stroke();

        c.fillStyle = 'rgba(120,72,8,.5)';
        c.fillRect(-w / 2, -h * 0.16, w, h * 0.16);

        var gems = [
            [-w * 0.26, -h * 0.38, '#ff7264'],
            [0, -h * 0.5, '#63d8ff'],
            [w * 0.26, -h * 0.38, '#8dff9b']
        ];
        for (var i = 0; i < gems.length; i++) {
            c.fillStyle = gems[i][2];
            c.beginPath();
            c.arc(gems[i][0], gems[i][1], Math.max(0.005, w * 0.045), 0, TAU);
            c.fill();
            c.strokeStyle = 'rgba(255,255,255,.55)';
            c.lineWidth = Math.max(0.004, w * 0.012);
            c.stroke();
        }
        c.fillStyle = 'rgba(255,255,255,.48)';
        c.beginPath();
        c.ellipse(-w * 0.3, -h * 0.72, w * 0.075, h * 0.14, -0.5, 0, TAU);
        c.fill();
        c.restore();
    }

    function drawKingSpeech() {
        if (king.speechT <= 0 || !king.speech) return;
        var p = w2s(KING.x, KING.y);
        var fs = Math.max(11, Math.min(14, Math.round(S * 0.27)));
        ctx.save();
        ctx.font = '800 ' + fs + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        var tw = ctx.measureText(king.speech).width;
        var bw = tw + 20;
        var bh = fs + 15;
        var bx = clamp(p.x - bw - S * 0.5, 6, W - bw - 6);
        var by = clamp(p.y - S * 3.2 - bh, 6, H - bh - 10);
        ctx.fillStyle = 'rgba(255,250,235,.97)';
        roundRect(ctx, bx, by, bw, bh, bh / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + bw - 20, by + bh - 1);
        ctx.lineTo(bx + bw - 8, by + bh + 8);
        ctx.lineTo(bx + bw - 32, by + bh - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#213d2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(king.speech, bx + bw / 2, by + bh / 2 + 1);
        ctx.restore();
    }

    function showSpeech(text) {
        king.speech = text;
        king.speechT = 2.2;
    }

    /* ================= 绘制：敌人 ================= */
    function drawEnemies() {
        var list = enemies.slice().sort(function (a, b) { return a.y - b.y; });
        for (var i = 0; i < list.length; i++) drawEnemy(list[i]);
    }

    function drawEnemy(e) {
        var p = w2s(e.x, e.y);
        var r = e.def.r * S;
        var boss = !!e.def.boss;
        var lift = e.def.fly ? S * (0.36 + Math.sin(visualT * 7 + e.seed) * 0.04) : 0;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.24)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 0.95, r * 0.34, 0, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(p.x, p.y - lift);
        if (!boss) ctx.translate(0, Math.sin(visualT * 9 + e.seed) * S * 0.022);
        ctx.scale(boss ? r * 0.9 : r, boss ? r * 0.9 : r);

        if (e.type === 'slime') drawSlime(e);
        else if (e.type === 'runner') drawRunner(e);
        else if (e.type === 'tank') drawTank(e);
        else if (e.type === 'flyer') drawFlyer(e);
        else drawBoss(e);
        ctx.restore();

        // 冰缓光环
        if (e.slowT > 0.01) {
            ctx.save();
            ctx.strokeStyle = 'rgba(137,234,255,.8)';
            ctx.lineWidth = Math.max(1, S * 0.025);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, r * 1.22, r * 0.5, 0, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = 'rgba(160,240,255,.18)';
            ctx.fill();
            ctx.restore();
        }

        // 血条
        var ratio = clamp(e.hp / e.maxHp, 0, 1);
        if (boss || ratio < 0.999) {
            var bw = boss ? S * 1.15 : S * 0.64;
            var bh = Math.max(3, S * 0.05);
            var bx = p.x - bw / 2;
            var by = p.y - r * 1.72 - lift;
            if (boss) by = p.y - S * 1.25;
            ctx.save();
            ctx.fillStyle = 'rgba(4,17,10,.78)';
            roundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, bh / 2 + 1);
            ctx.fill();
            ctx.fillStyle = ratio > 0.5 ? '#6ee06b' : (ratio > 0.25 ? '#ffd166' : '#ff6b5e');
            if (bw * ratio > 0.5) {
                roundRect(ctx, bx, by, bw * ratio, bh, bh / 2);
                ctx.fill();
            }
            if (boss) {
                ctx.fillStyle = '#ffd074';
                ctx.font = '800 ' + Math.max(9, Math.round(S * 0.16)) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('偷冠大王', p.x, by - 4);
            }
            ctx.restore();
        }

        if (boss) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,82,82,.16)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, S * 0.7, S * 0.28, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawSlime(e) {
        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.ellipse(0, 0.22, 1.0, 0.68, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = e.def.color;
        ctx.beginPath();
        ctx.moveTo(-0.96, 0.12);
        ctx.bezierCurveTo(-1.02, -0.62, -0.6, -1.05, -0.2, -0.98);
        ctx.bezierCurveTo(0.12, -1.32, 0.72, -1.18, 0.9, -0.8);
        ctx.bezierCurveTo(1.12, -0.42, 1.04, 0.1, 0.9, 0.3);
        ctx.quadraticCurveTo(0.52, 0.64, 0, 0.62);
        ctx.quadraticCurveTo(-0.5, 0.64, -0.96, 0.12);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath();
        ctx.ellipse(-0.35, -0.64, 0.3, 0.15, -0.5, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-0.36, -0.24, 0.24, 0, TAU);
        ctx.arc(0.36, -0.24, 0.24, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#1d2b20';
        ctx.beginPath();
        ctx.arc(-0.32, -0.21, 0.12, 0, TAU);
        ctx.arc(0.4, -0.21, 0.12, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = '#1d2b20';
        ctx.lineWidth = 0.09;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.56, -0.52);
        ctx.lineTo(-0.22, -0.42);
        ctx.moveTo(0.56, -0.52);
        ctx.lineTo(0.22, -0.42);
        ctx.stroke();

        ctx.strokeStyle = '#1d2b20';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.arc(0, 0.24, 0.13, 0.15, Math.PI - 0.15);
        ctx.stroke();

        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.ellipse(-0.36, 0.56, 0.18, 0.1, 0, 0, TAU);
        ctx.ellipse(0.36, 0.56, 0.18, 0.1, 0, 0, TAU);
        ctx.fill();
    }

    function drawRunner(e) {
        var sw = Math.sin(visualT * 16 + e.seed) * 0.28;
        ctx.strokeStyle = e.def.dark;
        ctx.lineWidth = 0.19;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.28, 0.58);
        ctx.lineTo(-0.42 + sw, 0.96);
        ctx.moveTo(0.28, 0.58);
        ctx.lineTo(0.42 - sw, 0.96);
        ctx.stroke();

        ctx.fillStyle = e.def.color;
        ctx.beginPath();
        ctx.moveTo(0, -1.02);
        ctx.bezierCurveTo(0.62, -0.98, 0.88, -0.42, 0.7, 0.16);
        ctx.quadraticCurveTo(0.54, 0.68, 0, 0.68);
        ctx.quadraticCurveTo(-0.54, 0.68, -0.7, 0.16);
        ctx.bezierCurveTo(-0.88, -0.42, -0.62, -0.98, 0, -1.02);
        ctx.fill();

        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.moveTo(-0.62, -0.76);
        ctx.lineTo(-0.9, -1.14);
        ctx.lineTo(-0.3, -1.0);
        ctx.closePath();
        ctx.moveTo(0.62, -0.76);
        ctx.lineTo(0.9, -1.14);
        ctx.lineTo(0.3, -1.0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2c1b0e';
        roundRect(ctx, -0.62, -0.52, 1.24, 0.35, 0.17);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-0.28, -0.34, 0.13, 0, TAU);
        ctx.arc(0.28, -0.34, 0.13, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#251509';
        ctx.beginPath();
        ctx.arc(-0.25, -0.33, 0.07, 0, TAU);
        ctx.arc(0.31, -0.33, 0.07, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = '#5e2e11';
        ctx.lineWidth = 0.07;
        ctx.beginPath();
        ctx.arc(0, 0.22, 0.15, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }

    function drawTank(e) {
        ctx.fillStyle = e.def.dark;
        roundRect(ctx, -0.48, 0.42, 0.34, 0.44, 0.12);
        ctx.fill();
        roundRect(ctx, 0.14, 0.42, 0.34, 0.44, 0.12);
        ctx.fill();

        ctx.fillStyle = e.def.color;
        roundRect(ctx, -0.84, -0.68, 1.68, 1.3, 0.34);
        ctx.fill();
        ctx.fillStyle = '#546e7a';
        roundRect(ctx, -0.7, -0.9, 1.4, 1.1, 0.3);
        ctx.fill();

        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.arc(-0.52, -0.5, 0.12, 0, TAU);
        ctx.arc(0.52, -0.5, 0.12, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#263238';
        roundRect(ctx, -0.52, -0.56, 1.04, 0.26, 0.13);
        ctx.fill();
        ctx.fillStyle = '#ff5b4d';
        ctx.beginPath();
        ctx.arc(-0.27, -0.43, 0.07, 0, TAU);
        ctx.arc(0.27, -0.43, 0.07, 0, TAU);
        ctx.fill();

        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.moveTo(-0.82, -0.54);
        ctx.lineTo(-1.02, -0.82);
        ctx.lineTo(-0.66, -0.72);
        ctx.closePath();
        ctx.moveTo(0.82, -0.54);
        ctx.lineTo(1.02, -0.82);
        ctx.lineTo(0.66, -0.72);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#455a64';
        ctx.lineWidth = 0.07;
        ctx.beginPath();
        ctx.arc(0, 0.24, 0.22, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }

    function drawFlyer(e) {
        var flap = Math.sin(visualT * 18 + e.seed);
        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.ellipse(-0.72, -0.14, 0.52, 0.26 * (0.5 + Math.abs(flap) * 0.8), -0.5 - flap * 0.25, 0, TAU);
        ctx.ellipse(0.72, -0.14, 0.52, 0.26 * (0.5 + Math.abs(flap) * 0.8), 0.5 + flap * 0.25, 0, TAU);
        ctx.fill();

        ctx.fillStyle = e.def.color;
        ctx.beginPath();
        ctx.ellipse(0, -0.08, 0.52, 0.68, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.moveTo(-0.4, -0.58);
        ctx.lineTo(-0.5, -1.0);
        ctx.lineTo(-0.12, -0.72);
        ctx.closePath();
        ctx.moveTo(0.4, -0.58);
        ctx.lineTo(0.5, -1.0);
        ctx.lineTo(0.12, -0.72);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-0.2, -0.24, 0.16, 0, TAU);
        ctx.arc(0.2, -0.24, 0.16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a1540';
        ctx.beginPath();
        ctx.arc(-0.18, -0.22, 0.08, 0, TAU);
        ctx.arc(0.22, -0.22, 0.08, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-0.11, 0.2);
        ctx.lineTo(-0.02, 0.35);
        ctx.lineTo(0.06, 0.2);
        ctx.closePath();
        ctx.fill();
    }

    function drawBoss(e) {
        ctx.fillStyle = '#5e1620';
        ctx.beginPath();
        ctx.moveTo(-0.8, -0.2);
        ctx.bezierCurveTo(-1.35, 0.3, -1.18, 1.1, -0.55, 1.12);
        ctx.quadraticCurveTo(0, 0.9, 0.55, 1.12);
        ctx.bezierCurveTo(1.18, 1.1, 1.35, 0.3, 0.8, -0.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = e.def.dark;
        ctx.beginPath();
        ctx.ellipse(0, 0.18, 1.05, 0.88, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = e.def.color;
        ctx.beginPath();
        ctx.ellipse(0, 0.04, 0.98, 0.88, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#7a1420';
        ctx.beginPath();
        ctx.moveTo(-0.72, -0.6);
        ctx.lineTo(-0.98, -1.1);
        ctx.lineTo(-0.36, -0.82);
        ctx.closePath();
        ctx.moveTo(0.72, -0.6);
        ctx.lineTo(0.98, -1.1);
        ctx.lineTo(0.36, -0.82);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-0.34, -0.16, 0.22, 0.16, 0, 0, TAU);
        ctx.ellipse(0.34, -0.16, 0.22, 0.16, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ff2a2a';
        ctx.beginPath();
        ctx.arc(-0.32, -0.14, 0.1, 0, TAU);
        ctx.arc(0.36, -0.14, 0.1, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#2b0d12';
        ctx.beginPath();
        ctx.ellipse(0, 0.38, 0.42, 0.24, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        for (var i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-0.28 + i * 0.18, 0.2);
            ctx.lineTo(-0.2 + i * 0.18, 0.38);
            ctx.lineTo(-0.12 + i * 0.18, 0.2);
            ctx.closePath();
            ctx.fill();
        }

        drawCrown(ctx, 0, -0.92, 1.15, 0.5, visualT + 1.2);
    }

    /* ================= 绘制：子弹 / 特效 ================= */
    function drawProjectiles() {
        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            var pos = w2s(p.x, p.y);
            if (p.kind === 'arrow') {
                var a = p.angle || 0;
                var len = S * 0.17;
                ctx.strokeStyle = '#fff2c8';
                ctx.lineWidth = Math.max(1.5, S * 0.035);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(pos.x - Math.cos(a) * len, pos.y - S * 0.38 - Math.sin(a) * len);
                ctx.lineTo(pos.x + Math.cos(a) * len, pos.y - S * 0.38 + Math.sin(a) * len);
                ctx.stroke();
            } else if (p.kind === 'ice') {
                ctx.save();
                ctx.shadowColor = 'rgba(140,240,255,.9)';
                ctx.shadowBlur = S * 0.18;
                ctx.fillStyle = '#c9f8ff';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - S * 0.38, Math.max(2, S * 0.055), 0, TAU);
                ctx.fill();
                ctx.restore();
            } else {
                var prog = p.dur ? clamp(p.life / p.dur, 0, 1) : 0.5;
                var lift = Math.sin(prog * Math.PI) * S * 0.85;
                ctx.fillStyle = 'rgba(0,0,0,.2)';
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y, S * 0.09, S * 0.04, 0, 0, TAU);
                ctx.fill();

                ctx.fillStyle = 'rgba(255,163,72,.28)';
                ctx.beginPath();
                ctx.arc(pos.x - Math.cos(p.angle || 0) * S * 0.12, pos.y - S * 0.34 - lift, S * 0.08, 0, TAU);
                ctx.fill();

                ctx.fillStyle = '#2d2a26';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - S * 0.34 - lift, Math.max(2.5, S * 0.075), 0, TAU);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.32)';
                ctx.beginPath();
                ctx.arc(pos.x - S * 0.025, pos.y - S * 0.37 - lift, Math.max(1, S * 0.022), 0, TAU);
                ctx.fill();
            }
        }
    }

    function addEffect(o) {
        o.t = 0;
        effects.push(o);
        if (effects.length > 260) effects.splice(0, effects.length - 260);
    }

    function addRing(x, y, color, r0, r1, dur) {
        addEffect({ kind: 'ring', x: x, y: y, color: color, r0: r0, r1: r1, dur: dur || 0.4 });
    }

    function addText(text, x, y, color, dur) {
        addEffect({ kind: 'text', text: text, x: x, y: y, color: color || '#ffd76a', dur: dur || 0.85 });
    }

    function addBurst(x, y, color, n) {
        var parts = [];
        for (var i = 0; i < n; i++) {
            var a = Math.random() * TAU;
            var sp = 0.5 + Math.random() * 1.5;
            parts.push({
                x: x, y: y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp * 0.7 - 0.45,
                r: 0.02 + Math.random() * 0.04,
                color: color
            });
        }
        addEffect({ kind: 'parts', x: x, y: y, parts: parts, dur: 0.55 });
    }

    function addBolt(points) {
        var px = [];
        for (var i = 0; i < points.length; i++) {
            px.push(w2s(points[i].x, points[i].y));
        }
        var jag = [px[0]];
        for (var s = 0; s < px.length - 1; s++) {
            var a = px[s], b = px[s + 1];
            for (var k = 1; k <= 4; k++) {
                var q = k / 4;
                var x = a.x + (b.x - a.x) * q;
                var y = a.y + (b.y - a.y) * q;
                if (k < 4) {
                    var nx = -(b.y - a.y);
                    var ny = b.x - a.x;
                    var len = Math.sqrt(nx * nx + ny * ny) || 1;
                    var off = (Math.random() - 0.5) * S * 0.18;
                    x += nx / len * off;
                    y += ny / len * off;
                }
                jag.push({ x: x, y: y });
            }
        }
        addEffect({ kind: 'bolt', pts: jag, dur: 0.18 });
    }

    function drawEffects() {
        for (var i = 0; i < effects.length; i++) {
            var e = effects[i];
            var k = clamp(e.t / e.dur, 0, 1);
            if (e.kind === 'ring') {
                var p = w2s(e.x, e.y);
                var rr = (e.r0 + (e.r1 - e.r0) * k) * S;
                ctx.save();
                ctx.globalAlpha = 1 - k;
                ctx.strokeStyle = e.color;
                ctx.lineWidth = Math.max(1.5, S * 0.04 * (1 - k * 0.5));
                ctx.beginPath();
                ctx.arc(p.x, p.y, rr, 0, TAU);
                ctx.stroke();
                ctx.restore();
            } else if (e.kind === 'text') {
                var tp = w2s(e.x, e.y - k * 0.45);
                ctx.save();
                ctx.globalAlpha = 1 - k;
                ctx.fillStyle = e.color;
                ctx.font = '900 ' + Math.max(10, Math.round(S * 0.24)) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,.35)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 1;
                ctx.fillText(e.text, tp.x, tp.y);
                ctx.restore();
            } else if (e.kind === 'parts') {
                ctx.save();
                ctx.globalAlpha = 1 - k;
                for (var j = 0; j < e.parts.length; j++) {
                    var part = e.parts[j];
                    var pp = w2s(part.x + part.vx * e.t, part.y + part.vy * e.t + 0.35 * e.t * e.t);
                    ctx.fillStyle = part.color;
                    ctx.beginPath();
                    ctx.arc(pp.x, pp.y, Math.max(1, part.r * S), 0, TAU);
                    ctx.fill();
                }
                ctx.restore();
            } else if (e.kind === 'bolt') {
                ctx.save();
                ctx.globalAlpha = 1 - k;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'rgba(190,150,255,.45)';
                ctx.lineWidth = Math.max(2.5, S * 0.08);
                ctx.beginPath();
                ctx.moveTo(e.pts[0].x, e.pts[0].y);
                for (var b = 1; b < e.pts.length; b++) ctx.lineTo(e.pts[b].x, e.pts[b].y);
                ctx.stroke();
                ctx.strokeStyle = '#f1e9ff';
                ctx.lineWidth = Math.max(1, S * 0.022);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    /* ================= 游戏逻辑 ================= */
    function updateHud() {
        waveEl.textContent = Math.min(wave, TOTAL_WAVES) + '/' + TOTAL_WAVES;
        goldEl.textContent = gold;
        heartsEl.textContent = hearts;
        heartsChip.classList.toggle('low', hearts <= 3);
        updateShop();
        updateWaveBtn();
        if (selectedPad && selectedPad.tower) renderTowerPanel();
    }

    function updateShop() {
        for (var i = 0; i < shopCards.length; i++) {
            var card = shopCards[i];
            var def = TOWERS[card.getAttribute('data-type')];
            card.classList.toggle('poor', gold < def.cost);
            card.classList.toggle('selected', card.getAttribute('data-type') === selectedType);
        }
    }

    function updateWaveBtn() {
        if (state === 'prepare') {
            waveBtn.disabled = false;
            waveBtn.classList.add('ready');
            waveBtn.classList.remove('busy');
            waveBtnLabel.textContent = '出发';
            waveBtnSub.textContent = '第 ' + wave + ' 波 · ' + waveTotalCount(wave) + ' 只';
        } else if (state === 'wave') {
            waveBtn.disabled = true;
            waveBtn.classList.remove('ready');
            waveBtn.classList.add('busy');
            waveBtnLabel.textContent = '守塔中';
            var left = enemies.length + Math.max(0, waveList.length - spawnIndex);
            waveBtnSub.textContent = '第 ' + wave + ' 波 · 剩 ' + left;
        } else {
            waveBtn.disabled = true;
            waveBtn.classList.remove('ready', 'busy');
            waveBtnLabel.textContent = state === 'win' ? '守住啦' : (state === 'over' ? '失守' : '准备');
            waveBtnSub.textContent = '第 ' + Math.min(wave, TOTAL_WAVES) + ' 波';
        }
    }

    function waveTotalCount(w) {
        var list = WAVES[w - 1] || [];
        var n = 0;
        for (var i = 0; i < list.length; i++) n += list[i].count;
        return n;
    }

    function buildWave(w) {
        var out = [];
        var groups = WAVES[w - 1] || [];
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            for (var j = 0; j < g.count; j++) {
                out.push({ type: g.type, t: g.delay + j * g.gap });
            }
        }
        out.sort(function (a, b) { return a.t - b.t; });
        return out;
    }

    function newGame() {
        if (endTimer) {
            clearTimeout(endTimer);
            endTimer = 0;
        }
        clearConfetti();
        gold = START_GOLD;
        hearts = START_HEARTS;
        wave = 1;
        state = 'prepare';
        paused = false;
        gameSpeed = 1;
        speedBtn.textContent = '1×';
        speedBtn.classList.remove('on');
        enemies = [];
        towers = [];
        projectiles = [];
        effects = [];
        kills = 0;
        score = 0;
        eid = 0;
        waveList = [];
        spawnIndex = 0;
        waveClock = 0;
        waveUiT = 0;
        selectedType = 'arrow';
        selectedPad = null;
        hoverPad = null;
        shake = 0;
        padPulse = 0;
        hintDismissed = false;
        king.mood = 'happy';
        king.hurt = 0;
        king.speech = '';
        king.speechT = 0;
        king.dead = false;
        king.deathT = 0;

        for (var i = 0; i < pads.length; i++) pads[i].tower = null;

        hideAllOverlays();
        showShop();
        updateHud();
        updateWaveBtn();
        stageHint.classList.remove('hide');
        banner('第 1 波 准备', '建塔 → 出发');
        showSpeech('我就在这儿，别让它们过来');
    }

    function hideAllOverlays() {
        startOverlay.classList.remove('show');
        pauseOverlay.classList.remove('show');
        endOverlay.classList.remove('show');
    }

    function dismissHint() {
        if (hintDismissed) return;
        hintDismissed = true;
        stageHint.classList.add('hide');
    }

    function showShop() {
        selectedPad = null;
        towerPanel.hidden = true;
        shopEl.hidden = false;
        updateShop();
    }

    function selectType(key) {
        if (!TOWERS[key]) return;
        selectedType = key;
        showShop();
        padPulse = 0.55;
        sfxClick();
    }

    function selectPad(pad) {
        if (!pad || !pad.tower) return;
        selectedPad = pad;
        towerPanel.hidden = false;
        shopEl.hidden = true;
        renderTowerPanel();
        sfxClick();
    }

    function closeTowerPanel() {
        selectedPad = null;
        towerPanel.hidden = true;
        shopEl.hidden = false;
        updateShop();
    }

    function renderTowerPanel() {
        if (!selectedPad || !selectedPad.tower) return;
        var t = selectedPad.tower;
        var def = TOWERS[t.type];
        var st = def.levels[t.level - 1];
        var next = def.levels[t.level];
        tpName.textContent = def.name;
        tpLv.textContent = 'Lv.' + t.level + (next ? ' / 3' : ' · 满级');

        if (t.type === 'arrow') {
            tpStats.textContent = '伤害 ' + st.dmg + ' · 射速 ' + st.rate + '/s · 范围 ' + st.range;
        } else if (t.type === 'cannon') {
            tpStats.textContent = '伤害 ' + st.dmg + ' · 溅射 ' + st.splash + ' 格 · 范围 ' + st.range;
        } else if (t.type === 'frost') {
            tpStats.textContent = '减速 ' + Math.round(st.slow * 100) + '% · ' + st.slowDur + 's · 范围 ' + st.range;
        } else {
            tpStats.textContent = '伤害 ' + st.dmg + ' × ' + st.chains + ' 连锁 · 范围 ' + st.range;
        }

        if (next) {
            tpUp.disabled = gold < st.up;
            tpUp.textContent = '升级 ' + st.up;
        } else {
            tpUp.disabled = true;
            tpUp.textContent = '已满级';
        }
        tpSell.textContent = '出售 +' + Math.round(t.invested * SELL_RATE);
    }

    function buildTower(pad, type) {
        if (pad.tower) { selectPad(pad); return; }
        var def = TOWERS[type];
        if (gold < def.cost) {
            toast('金币不足 · 再打一波');
            flashGold();
            sfxDeny();
            return;
        }
        gold -= def.cost;
        var t = {
            type: type, level: 1, pad: pad, cd: 0.2,
            aim: -Math.PI / 2, recoil: 0, invested: def.cost
        };
        pad.tower = t;
        towers.push(t);
        addRing(pad.x, pad.y, '#ffd074', 0.1, 0.8, 0.4);
        addBurst(pad.x, pad.y - 0.2, '#ffd074', 7);
        addText('-' + def.cost, pad.x, pad.y - 0.5, '#ffb28a', 0.75);
        dismissHint();
        closeTowerPanel();
        sfxBuild();
        updateHud();
    }

    function upgradeTower() {
        if (!selectedPad || !selectedPad.tower) return;
        var t = selectedPad.tower;
        var st = TOWERS[t.type].levels[t.level - 1];
        var next = TOWERS[t.type].levels[t.level];
        if (!next || !st.up) return;
        if (gold < st.up) {
            toast('金币不够升级');
            flashGold();
            sfxDeny();
            return;
        }
        gold -= st.up;
        t.invested += st.up;
        t.level++;
        addRing(t.pad.x, t.pad.y, '#ffd074', 0.1, 1.0, 0.45);
        addBurst(t.pad.x, t.pad.y - 0.35, '#ffe7a6', 10);
        addText('Lv.' + t.level, t.pad.x, t.pad.y - 0.8, '#ffe08a', 0.9);
        sfxUpgrade();
        updateHud();
        renderTowerPanel();
        toast('升级到 Lv.' + t.level);
    }

    function sellTower() {
        if (!selectedPad || !selectedPad.tower) return;
        var t = selectedPad.tower;
        var refund = Math.round(t.invested * SELL_RATE);
        gold += refund;
        for (var i = 0; i < towers.length; i++) {
            if (towers[i] === t) { towers.splice(i, 1); break; }
        }
        selectedPad.tower = null;
        addRing(t.pad.x, t.pad.y, '#cfe8d4', 0.08, 0.7, 0.35);
        addText('+' + refund, t.pad.x, t.pad.y - 0.5, '#ffd76a', 0.9);
        sfxSell();
        closeTowerPanel();
        updateHud();
        toast('已出售 +' + refund);
    }

    function startWave() {
        if (state !== 'prepare' || paused) return;
        if (!towers.length) {
            toast('先建一座塔再出发');
            flashGold();
            sfxDeny();
            return;
        }
        waveList = buildWave(wave);
        spawnIndex = 0;
        waveClock = 0;
        waveUiT = 0;
        state = 'wave';
        dismissHint();
        banner('第 ' + wave + ' 波', wave === TOTAL_WAVES ? '最后一波 · 顶住！' : '偷冠大军来袭');
        showSpeech(pick(QUOTES_WAVE));
        sfxWave();
        updateHud();
    }

    function spawnEnemy(type) {
        var def = ENEMIES[type];
        var mul = hpMul(wave);
        var hp = Math.max(1, Math.round(def.hp * mul));
        var e = {
            id: ++eid,
            type: type,
            def: def,
            hp: hp,
            maxHp: hp,
            speed: def.speed,
            s: 0,
            lane: def.boss ? 0 : (Math.random() * 2 - 1) * 0.2,
            slowT: 0,
            slowAmt: 0,
            flash: 0,
            seed: Math.random() * 10,
            dead: false,
            x: 0, y: 0, ang: 0
        };
        var pt = pointAt(0);
        e.x = pt.x;
        e.y = pt.y;
        enemies.push(e);
        addRing(pt.x, pt.y, '#c08cff', 0.06, 0.55, 0.35);
        if (def.boss) {
            banner('偷冠大王来了', '一次偷走 2 点王冠');
            showSpeech('大的来了！');
            shake = Math.max(shake, 0.32);
        }
        updateWaveBtn();
    }

    function update(dt) {
        if (state !== 'prepare' && state !== 'wave') return;
        waveUiT -= dt;
        padPulse = Math.max(0, padPulse - dt * 1.6);
        king.speechT = Math.max(0, king.speechT - dt);
        king.hurt = Math.max(0, king.hurt - dt * 3);
        shake = Math.max(0, shake - dt * 3.2);

        if (state === 'wave') {
            waveClock += dt;
            while (spawnIndex < waveList.length && waveList[spawnIndex].t <= waveClock) {
                spawnEnemy(waveList[spawnIndex].type);
                spawnIndex++;
            }
        }

        updateTowers(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        updateEffects(dt);

        if (state === 'wave' && spawnIndex >= waveList.length && enemies.length === 0) {
            waveCleared();
        }

        if (state === 'wave' && waveUiT <= 0) {
            waveUiT = 0.2;
            updateWaveBtn();
        }
    }

    function updateTowers(dt) {
        for (var i = 0; i < towers.length; i++) {
            var t = towers[i];
            var st = TOWERS[t.type].levels[t.level - 1];
            t.cd -= dt;
            if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5);

            var target = findTarget(t, st.range);
            if (target) {
                var topY = t.pad.y - 0.62 * TOWER_SCALE;
                var want = Math.atan2(target.y - topY, target.x - t.pad.x);
                t.aim = angleLerp(t.aim, want, Math.min(1, dt * 12));
                if (t.cd <= 0) {
                    fireTower(t, target, st);
                    t.cd = 1 / st.rate;
                }
            }
        }
    }

    function findTarget(t, range) {
        var best = null;
        var bestScore = -Infinity;
        var r2 = range * range;
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead) continue;
            var dx = e.x - t.pad.x;
            var dy = e.y - t.pad.y;
            if (dx * dx + dy * dy > r2) continue;
            var sc = e.s + (t.type === 'frost' && e.slowT > 0 ? -50 : 0);
            if (sc > bestScore) {
                bestScore = sc;
                best = e;
            }
        }
        return best;
    }

    function fireTower(t, target, st) {
        var topY = t.pad.y - 0.62 * TOWER_SCALE;
        if (t.type === 'arrow') {
            projectiles.push({
                kind: 'arrow', x: t.pad.x, y: topY,
                tx: target.x, ty: target.y, target: target,
                speed: 12, dmg: st.dmg, homing: true, life: 0
            });
            t.recoil = 1;
            sfxArrow();
        } else if (t.type === 'cannon') {
            var d = Math.sqrt(Math.pow(target.x - t.pad.x, 2) + Math.pow(target.y - topY, 2));
            var travel = d / 7;
            var ahead = pointAt(target.s + target.speed * travel);
            var tx = ahead.x;
            var ty = ahead.y;
            var dur = Math.max(0.12, Math.sqrt(Math.pow(tx - t.pad.x, 2) + Math.pow(ty - topY, 2)) / 7);
            projectiles.push({
                kind: 'shell', x: t.pad.x, y: topY,
                tx: tx, ty: ty, target: null,
                speed: 7, dmg: st.dmg, splash: st.splash,
                homing: false, life: 0, dur: dur
            });
            t.recoil = 1;
            sfxCannon();
        } else if (t.type === 'frost') {
            projectiles.push({
                kind: 'ice', x: t.pad.x, y: topY,
                tx: target.x, ty: target.y, target: target,
                speed: 9, dmg: st.dmg, slow: st.slow, slowDur: st.slowDur,
                homing: true, life: 0
            });
            sfxFrost();
        } else {
            fireTesla(t, target, st);
        }
    }

    function fireTesla(t, target, st) {
        var pts = [{ x: t.pad.x, y: t.pad.y - 0.7 * TOWER_SCALE }];
        var hit = {};
        var cur = target;
        var dmg = st.dmg;
        for (var i = 0; i < st.chains && cur; i++) {
            pts.push({ x: cur.x, y: cur.y });
            hurtEnemy(cur, dmg);
            dmg *= 0.78;
            hit[cur.id] = true;
            cur = nextChain(cur, 2.3, hit);
        }
        addBolt(pts);
        t.recoil = 1;
        sfxZap();
    }

    function nextChain(from, range, hit) {
        var best = null;
        var bestD = range * range;
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead || hit[e.id]) continue;
            var dx = e.x - from.x;
            var dy = e.y - from.y;
            var d = dx * dx + dy * dy;
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    function updateEnemies(dt) {
        for (var i = enemies.length - 1; i >= 0; i--) {
            var e = enemies[i];
            if (e.dead) { enemies.splice(i, 1); continue; }
            if (e.slowT > 0) {
                e.slowT -= dt;
                if (e.slowT <= 0) {
                    e.slowT = 0;
                    e.slowAmt = 0;
                }
            }
            if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 4);

            e.s += e.speed * (1 - e.slowAmt) * dt;
            if (e.s >= PATH_LEN - 0.02) {
                leak(e);
                enemies.splice(i, 1);
                continue;
            }
            var pt = pointAt(e.s);
            var nx = -Math.sin(pt.ang);
            var ny = Math.cos(pt.ang);
            e.x = pt.x + nx * e.lane;
            e.y = pt.y + ny * e.lane;
            e.ang = pt.ang;
        }
    }

    function updateProjectiles(dt) {
        for (var i = projectiles.length - 1; i >= 0; i--) {
            var p = projectiles[i];
            p.life += dt;
            if (p.homing && p.target && !p.target.dead) {
                p.tx = p.target.x;
                p.ty = p.target.y;
            }
            var dx = p.tx - p.x;
            var dy = p.ty - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            var step = p.speed * dt;
            if (d <= step + 0.02 || d < 0.04) {
                p.x = p.tx;
                p.y = p.ty;
                hitProjectile(p);
                projectiles.splice(i, 1);
                continue;
            }
            p.x += dx / d * step;
            p.y += dy / d * step;
            p.angle = Math.atan2(dy, dx);
        }
    }

    function hitProjectile(p) {
        if (p.kind === 'shell') {
            explodeAt(p.x, p.y, p.splash, p.dmg);
        } else if (p.kind === 'arrow') {
            if (p.target && !p.target.dead) {
                hurtEnemy(p.target, p.dmg);
                addBurst(p.x, p.y, '#ffe9b8', 3);
            } else {
                addBurst(p.x, p.y, '#ffe9b8', 1);
            }
        } else if (p.kind === 'ice') {
            if (p.target && !p.target.dead) {
                hurtEnemy(p.target, p.dmg);
                applySlow(p.target, p.slow, p.slowDur);
                addRing(p.x, p.y, '#8fe8ff', 0.05, 0.45, 0.3);
            }
            addBurst(p.x, p.y, '#c9f7ff', 4);
        }
    }

    function explodeAt(x, y, radius, dmg) {
        addRing(x, y, '#ffb24a', 0.08, radius, 0.36);
        addRing(x, y, '#ffe2a1', 0.02, radius * 0.6, 0.25);
        addBurst(x, y, '#ffb24a', 12);
        shake = Math.min(0.85, shake + 0.22);
        sfxBoom();
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead) continue;
            var dx = e.x - x;
            var dy = e.y - y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d <= radius) {
                hurtEnemy(e, dmg * (1 - d / radius * 0.45));
            }
        }
    }

    function applySlow(e, amount, dur) {
        if (e.def.boss) amount *= 0.5;
        if (amount >= e.slowAmt - 0.01 || dur > e.slowT) {
            e.slowAmt = Math.max(e.slowAmt, amount);
            e.slowT = Math.max(e.slowT, dur);
        }
    }

    function hurtEnemy(e, dmg) {
        if (!e || e.dead) return;
        e.hp -= dmg;
        e.flash = 1;
        if (e.hp <= 0) killEnemy(e);
    }

    function killEnemy(e) {
        if (e.dead) return;
        e.dead = true;
        kills++;
        var gain = Math.round(e.def.gold * (1 + (wave - 1) * 0.03));
        gold += gain;
        addText('+' + gain, e.x, e.y - 0.2, '#ffd76a', 0.85);
        addBurst(e.x, e.y - 0.1, e.def.color, e.def.boss ? 20 : 7);
        if (e.def.boss) {
            addRing(e.x, e.y, '#ffd074', 0.15, 1.6, 0.7);
            addRing(e.x, e.y, '#ff7264', 0.1, 2.0, 0.9);
            shake = Math.max(shake, 0.8);
            addText('大王倒了！', e.x, e.y - 0.8, '#ffe08a', 1.2);
        }
        sfxPop();
        updateHud();
    }

    function leak(e) {
        if (state === 'over' || state === 'win') return;
        var dmg = e.def.life;
        hearts = Math.max(0, hearts - dmg);
        king.hurt = 1;
        shake = Math.max(shake, 0.55);
        addRing(KING.x, KING.y - 1.5, '#ff7264', 0.2, 1.2, 0.5);
        addText('-' + dmg, KING.x - 0.9, KING.y - 2.9, '#ff8f80', 1.1);
        addBurst(KING.x, KING.y - 1.6, '#ff8f80', 10);
        showSpeech(pick(QUOTES_HIT));
        sfxHurt();
        updateHud();

        if (hearts <= 0) {
            finish(false);
        } else {
            var mood = hearts <= ANGRY_AT ? 'angry' : 'happy';
            if (mood !== king.mood) {
                king.mood = mood;
                if (mood === 'angry') {
                    showSpeech('你们是真不守啊？');
                    addRing(KING.x, KING.y - 1.6, '#ff7264', 0.15, 1.2, 0.6);
                }
            }
        }
    }

    function updateEffects(dt) {
        for (var i = effects.length - 1; i >= 0; i--) {
            effects[i].t += dt;
            if (effects[i].t >= effects[i].dur) effects.splice(i, 1);
        }
    }

    function waveCleared() {
        var cleared = wave;
        var bonus = 30 + cleared * 12;
        gold += bonus;
        if (cleared >= TOTAL_WAVES) {
            finish(true);
            return;
        }
        wave++;
        state = 'prepare';
        sfxClear();
        banner('第 ' + cleared + ' 波清除', '+' + bonus + ' 金币 · 准备下一波');
        showSpeech(pick(QUOTES_CLEAR));
        updateHud();
    }

    function finish(win) {
        if (state === 'win' || state === 'over' || state === 'menu') return;
        var cleared = win ? TOTAL_WAVES : Math.max(0, wave - 1);
        score = cleared * 1000 + hearts * 150 + kills * 5 + Math.floor(gold / 2) + (win ? 5000 : 0);
        isBestRun = score > best;
        if (isBestRun) {
            best = score;
            try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
        }
        if (wave > bestWave) {
            bestWave = wave;
            try { localStorage.setItem(BEST_WAVE_KEY, String(bestWave)); } catch (e) {}
        }
        updateBestLine();

        if (win) {
            state = 'win';
            king.mood = 'happy';
            showSpeech('保住啦！');
            sfxWin();
        } else {
            state = 'over';
            king.dead = true;
            king.deathT = 0;
            sfxLose();
        }
        updateHud();
        if (window.SunCloud && best > 0) SunCloud.submit('king', best);

        endTimer = setTimeout(function () {
            endTimer = 0;
            showEnd(win);
        }, win ? 700 : 950);
    }

    function showEnd(win) {
        endImg.src = win ? './img/king-1.jpg' : './img/king-2.jpg';
        endBanner.classList.toggle('win', win);
        endTag.textContent = win ? '王中王 · 安然无恙' : '王中王 · 被偷走了';
        endTitle.textContent = win ? '王中王保住了！' : '王中王被偷走了……';
        endCaption.textContent = win
            ? '20 波全部击退。王中王安然无恙，表示可以继续上班了。'
            : '偷冠大军得手了。王中王已经在足浴店办上卡，暂时不回。';

        var reached = win ? TOTAL_WAVES : wave;
        var html = '';
        html += statHtml('到达波次', reached + ' / ' + TOTAL_WAVES, false);
        html += statHtml('击杀', kills, false);
        html += statHtml('剩余王冠', hearts + ' / ' + START_HEARTS, false);
        html += statHtml(win ? '最终得分' : '本局得分', score, true);
        endStats.innerHTML = html;
        endBest.textContent = (isBestRun ? '★ 新纪录 · ' : '') +
            '历史最佳 ' + best + ' 分 · 最高守到第 ' + bestWave + ' 波';

        endOverlay.classList.add('show');
        if (win) spawnConfetti();
    }

    function statHtml(label, value, highlight) {
        return '<div class="stat' + (highlight ? ' highlight' : '') + '"><i>' + label + '</i><b>' + value + '</b></div>';
    }

    function updateBestLine() {
        if (!bestLine) return;
        bestLine.textContent = best > 0
            ? '历史最佳 ' + best + ' 分 · 最高守到第 ' + bestWave + ' 波'
            : '还没有纪录，王中王等你来救';
    }

    function toast(text) {
        toastEl.textContent = text;
        toastEl.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 1400);
    }

    function flashGold() {
        goldEl.parentNode.classList.add('flash');
        clearTimeout(flashGold._t);
        flashGold._t = setTimeout(function () {
            goldEl.parentNode.classList.remove('flash');
        }, 380);
    }

    var bannerTimer = 0;
    function banner(title, sub) {
        bannerTitle.textContent = title;
        bannerSub.textContent = sub || '';
        bannerEl.classList.remove('show');
        void bannerEl.offsetWidth;
        bannerEl.classList.add('show');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(function () {
            bannerEl.classList.remove('show');
        }, 1750);
    }

    function openPause() {
        if (state !== 'prepare' && state !== 'wave') return;
        if (paused) return;
        paused = true;
        pauseOverlay.classList.add('show');
    }

    function closePause() {
        paused = false;
        pauseOverlay.classList.remove('show');
    }

    function openRank() {
        if ((state === 'prepare' || state === 'wave') && !paused) openPause();
        if (window.SunCloud) {
            SunCloud.openLeaderboard('king', '保护王中王 排行榜', best);
        }
    }

    function spawnConfetti() {
        clearConfetti();
        var wrap = document.createElement('div');
        wrap.className = 'confetti';
        var colors = ['#ffd074', '#ff7264', '#6ee06b', '#7fe3ff', '#c4a7ff', '#fff2c8'];
        for (var i = 0; i < 38; i++) {
            var el = document.createElement('i');
            el.style.left = (Math.random() * 100) + '%';
            el.style.background = colors[Math.floor(Math.random() * colors.length)];
            el.style.animationDelay = (Math.random() * 1.3) + 's';
            el.style.animationDuration = (2.1 + Math.random() * 1.5) + 's';
            wrap.appendChild(el);
        }
        document.body.appendChild(wrap);
    }

    function clearConfetti() {
        var list = document.querySelectorAll('.confetti');
        for (var i = 0; i < list.length; i++) {
            if (list[i].parentNode) list[i].parentNode.removeChild(list[i]);
        }
    }

    /* ================= 输入 ================= */
    function padAt(x, y) {
        var best = null;
        var bestD = Infinity;
        for (var i = 0; i < pads.length; i++) {
            var pad = pads[i];
            var dx = x - pad.x;
            var dy = y - pad.y;
            var d = dx * dx + dy * dy;
            var limit = pad.tower ? 0.82 * 0.82 : 0.6 * 0.6;
            if (d <= limit && d < bestD) {
                bestD = d;
                best = pad;
            }
        }
        return best;
    }

    function handleTap(px, py) {
        if (state !== 'prepare' && state !== 'wave') return;
        if (paused) return;
        var w = s2w(px, py);
        var pad = padAt(w.x, w.y);
        if (pad) {
            if (pad.tower) selectPad(pad);
            else buildTower(pad, selectedType);
        } else {
            closeTowerPanel();
        }
    }

    function initShop() {
        shopEl.innerHTML = '';
        for (var i = 0; i < TOWER_KEYS.length; i++) {
            var key = TOWER_KEYS[i];
            var def = TOWERS[key];
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'shop-card';
            btn.setAttribute('data-type', key);
            btn.innerHTML = '<canvas class="shop-icon" width="72" height="72"></canvas>' +
                '<span class="shop-name">' + def.name + '</span>' +
                '<span class="cost">' + def.cost + '</span>';
            shopEl.appendChild(btn);
            var ic = btn.querySelector('canvas');
            drawShopIcon(ic, key);
            (function (k) {
                btn.addEventListener('click', function () { selectType(k); });
            })(key);
            shopCards.push(btn);
        }
    }

    function drawShopIcon(ic, key) {
        var c = ic.getContext('2d');
        c.clearRect(0, 0, ic.width, ic.height);
        drawTowerArt(c, key, 1, 36, 68, 54, -Math.PI / 2, 0, 1.5);
    }

    canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        audio();
        var rect = canvas.getBoundingClientRect();
        handleTap(e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var rect = canvas.getBoundingClientRect();
        var w = s2w(e.clientX - rect.left, e.clientY - rect.top);
        hoverPad = padAt(w.x, w.y);
        canvas.style.cursor = hoverPad ? (hoverPad.tower ? 'pointer' : 'copy') : 'crosshair';
    });

    canvas.addEventListener('pointerleave', function () {
        hoverPad = null;
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('pointercancel', function () {
        hoverPad = null;
    });

    waveBtn.addEventListener('click', function () {
        startWave();
    });

    tpUp.addEventListener('click', upgradeTower);
    tpSell.addEventListener('click', sellTower);
    tpClose.addEventListener('click', function () {
        sfxClick();
        closeTowerPanel();
    });

    pauseBtn.addEventListener('click', function () {
        sfxClick();
        openPause();
    });

    resumeBtn.addEventListener('click', function () {
        sfxClick();
        closePause();
    });

    pauseRestart.addEventListener('click', function () {
        sfxClick();
        newGame();
    });

    startBtn.addEventListener('click', function () {
        audio();
        sfxClick();
        newGame();
    });

    endRestart.addEventListener('click', function () {
        sfxClick();
        newGame();
    });

    speedBtn.addEventListener('click', function () {
        gameSpeed = gameSpeed === 1 ? 2 : 1;
        speedBtn.textContent = gameSpeed + '×';
        speedBtn.classList.toggle('on', gameSpeed === 2);
        sfxClick();
    });

    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.textContent = soundOn ? '🔊' : '🔇';
        soundBtn.classList.toggle('on', soundOn);
        try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch (e) {}
        if (soundOn) {
            audio();
            sfxClick();
        }
    });

    rankBtn.addEventListener('click', openRank);
    startRank.addEventListener('click', openRank);
    pauseRank.addEventListener('click', openRank);
    endRank.addEventListener('click', openRank);

    window.addEventListener('keydown', function (e) {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (document.querySelector('.sc-overlay')) return;
        if (startOverlay.classList.contains('show')) {
            if (e.key === 'Enter') startBtn.click();
            return;
        }
        if (endOverlay.classList.contains('show')) {
            if (e.key === 'Enter') endRestart.click();
            return;
        }
        if (e.key === 'Escape') {
            if (selectedPad) closeTowerPanel();
            else if (paused) closePause();
            else openPause();
            return;
        }
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (state === 'prepare' && !paused) startWave();
            return;
        }
        if (e.key >= '1' && e.key <= '4') {
            selectType(TOWER_KEYS[Number(e.key) - 1]);
            return;
        }
        if (e.key === 'p' || e.key === 'P') {
            if (paused) closePause();
            else openPause();
        }
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && !paused && (state === 'prepare' || state === 'wave')) openPause();
    });

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () {
        setTimeout(resize, 150);
    });

    if (window.ResizeObserver) {
        new ResizeObserver(resize).observe(stageWrap);
    }

    /* ================= 主循环 ================= */
    function draw() {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);

        var sx = 0, sy = 0;
        if (shake > 0.001) {
            sx = (Math.random() * 2 - 1) * shake * S * 0.14;
            sy = (Math.random() * 2 - 1) * shake * S * 0.12;
        }
        ctx.save();
        ctx.translate(sx, sy);
        if (mapCache) ctx.drawImage(mapCache, 0, 0, W, H);
        drawFireflies();
        drawPads();
        drawRangePreview();
        drawTowers();
        drawGhostTower();
        drawKing();
        drawEnemies();
        drawProjectiles();
        drawEffects();
        drawKingSpeech();
        ctx.restore();
    }

    var fireflies = [];
    (function () {
        for (var i = 0; i < 24; i++) {
            fireflies.push({
                x: Math.random(),
                y: Math.random(),
                p: Math.random() * TAU,
                s: 0.6 + Math.random() * 0.9
            });
        }
    })();

    function drawFireflies() {
        for (var i = 0; i < fireflies.length; i++) {
            var f = fireflies[i];
            var px = f.x * W + Math.sin(visualT * 0.6 * f.s + f.p) * 11;
            var py = f.y * H + Math.cos(visualT * 0.5 * f.s + f.p) * 8;
            if (px > OX && px < OX + COLS * S && py > OY && py < OY + ROWS * S) continue;
            var a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(visualT * 1.7 + f.p));
            ctx.fillStyle = 'rgba(255,224,138,' + a.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(px, py, (1.2 + f.s * 1.3), 0, TAU);
            ctx.fill();
            if (f.s > 1.2) {
                ctx.fillStyle = 'rgba(255,224,138,' + (a * 0.2).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(px, py, 5.5, 0, TAU);
                ctx.fill();
            }
        }
    }

    function frame(now) {
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (!isFinite(dt) || dt < 0) dt = 0;
        dt = Math.min(dt, 0.05);

        if (!paused) {
            visualT += dt;
            if (state === 'prepare' || state === 'wave') {
                update(dt * gameSpeed);
            } else if (state === 'over' && king.dead) {
                king.deathT += dt;
            }
        }
        draw();
        requestAnimationFrame(frame);
    }

    /* ================= 启动 ================= */
    try {
        best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
        bestWave = parseInt(localStorage.getItem(BEST_WAVE_KEY) || '0', 10) || 0;
        soundOn = localStorage.getItem(SOUND_KEY) !== '0';
    } catch (e) {
        best = 0;
        bestWave = 0;
        soundOn = true;
    }

    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.classList.toggle('on', soundOn);

    initShop();
    updateBestLine();
    updateHud();
    updateWaveBtn();
    resize();

    lastTime = performance.now();
    requestAnimationFrame(frame);

    if (window.SunCloud && best > 0) SunCloud.submit('king', best);
})();
