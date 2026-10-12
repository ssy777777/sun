/* 跳一跳 —— 按住蓄力、松手起跳；落在下一方块上得分，落在正中算「完美」并连击加成。
 * 纯原生 Canvas + 自研等距（isometric）投影，无任何依赖。 */
(function () {
    'use strict';

    /* ================= 常量 ================= */
    var ANCHOR_Y = 0.66;                    // 当前方块在屏幕上的纵向位置（比例）
    var ANCHOR_L = 0.42, ANCHOR_R = 0.58;   // 依跳跃方向左右挪一点，给下一块留出空间
    var BH_RATIO = 0.30;                    // 方块厚度（相对 U）
    var CHARGE_PER_SEC = 0.72;              // 蓄力速度（满蓄力约 1.4 秒）
    var MAX_JUMP = 3.6;                     // 满蓄力跳跃距离（世界单位）
    var GAP_MIN = 1.4, GAP_MAX = 2.6;       // 两块之间的间距范围
    var SIZE_MIN = 0.26, SIZE_MAX = 0.38;   // 方块半宽范围
    var FALL_G = 2400;                      // 失败下落的屏幕重力（像素/秒²）
    var CAM_LERP = 8;                       // 相机跟随速度
    var BEST_KEY = 'jump-best';
    var COLORS = ['#f6c177', '#8ecae6', '#f7a1c4', '#a8dba0', '#c0b1ee', '#ffd166', '#f4978e', '#7fc9c6'];

    /* ================= DOM ================= */
    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('best');
    var soundBtn = document.getElementById('sound-btn');
    var hintEl = document.getElementById('hint');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var restartBtn = document.getElementById('ov-restart');

    /* ================= 状态 ================= */
    var W = 0, H = 0, U = 120, DPR = 1;
    var camX = 0, camY = 0;
    var blocks = [], cur = null, nextBlock = null, nextDir = { x: 1, z: 0 };
    var char = { x: 0, z: 0 };
    var charY = 0, charVy = 0, drift = 0;
    var charge = 0, squash = 1;
    var state = 'idle';             // idle | charging | jump | fall | over
    var score = 0, combo = 0, best = 0, maxCombo = 0;
    var jump = null;
    var effects = [];
    var soundOn = true;
    var lastTime = 0;

    /* ================= 音效（Web Audio 现场合成） ================= */
    var actx = null;
    function audio() {
        if (!soundOn) return null;
        try {
            if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
            if (actx.state === 'suspended') actx.resume();
            return actx;
        } catch (e) { return null; }
    }
    function beep(freq, dur, type, vol, delay) {
        var a = audio(); if (!a) return;
        var t0 = a.currentTime + (delay || 0);
        var o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol == null ? 0.12 : vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function sweep(f1, f2, dur, type, vol) {
        var a = audio(); if (!a) return;
        var t0 = a.currentTime;
        var o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f1, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
        g.gain.setValueAtTime(vol == null ? 0.1 : vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function sfxJump() { sweep(620, 300, 0.16, 'sine', 0.09); }
    function sfxLand() { beep(180, 0.13, 'triangle', 0.12); }
    function sfxPerfect() { beep(760, 0.1, 'sine', 0.12); beep(1140, 0.15, 'sine', 0.11, 0.09); }
    function sfxFail() { sweep(300, 80, 0.55, 'sawtooth', 0.09); }

    /* ================= 投影（等距 2:1） ================= */
    function ws(x, z) {                     // 世界 → 屏幕（不含相机）
        return { x: (x - z) * 0.5 * U, y: -(x + z) * 0.25 * U };
    }
    function sp(x, z) {                     // 世界 → 屏幕（含相机）
        var p = ws(x, z);
        return { x: p.x - camX, y: p.y - camY };
    }
    function anchorX() { return W * (nextDir.x === 1 ? ANCHOR_L : ANCHOR_R); }
    function targetCam() {
        var p = ws(cur.x, cur.z);
        return { x: p.x - anchorX(), y: p.y - H * ANCHOR_Y };
    }

    /* ================= 工具 ================= */
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function pickColor(notColor) {
        var c = COLORS[Math.floor(Math.random() * COLORS.length)];
        if (c === notColor) c = COLORS[(COLORS.indexOf(c) + 3) % COLORS.length];
        return c;
    }
    function shade(hex, k) {
        var n = parseInt(hex.slice(1), 16);
        var r = clamp(Math.round(((n >> 16) & 255) * k), 0, 255);
        var g = clamp(Math.round(((n >> 8) & 255) * k), 0, 255);
        var b = clamp(Math.round((n & 255) * k), 0, 255);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    function poly(pts, fill) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }
    function roundRect(x, y, w, h, r) {
        r = Math.min(r, h / 2, w / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /* ================= 尺寸 ================= */
    function resize() {
        var wrap = canvas.parentElement;
        W = Math.max(1, wrap.clientWidth);
        H = Math.max(1, wrap.clientHeight);
        DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // U：横向受限于「下一块要留在屏幕内」，纵向与厚度也做上限
        U = clamp(Math.min(W * 0.34, H * 0.30, 220), 52, 220);
        if (cur) { var t = targetCam(); camX = t.x; camY = t.y; }
    }

    /* ================= 关卡数据 ================= */
    function spawnNext() {
        var axis = Math.random() < 0.5 ? 'x' : 'z';
        nextDir = axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
        var d = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
        var h = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
        nextBlock = {
            x: cur.x + nextDir.x * d,
            z: cur.z + nextDir.z * d,
            h: h,
            color: pickColor(cur.color)
        };
        blocks.push(nextBlock);
        while (blocks.length > 12 && blocks[0] !== cur && blocks[0] !== nextBlock) blocks.shift();
    }

    function reset() {
        blocks = [];
        var b0 = { x: 0, z: 0, h: 0.36, color: '#f0c26a' };
        blocks.push(b0);
        cur = b0;
        char.x = 0; char.z = 0;
        charY = 0; charVy = 0; drift = 0;
        charge = 0; squash = 1;
        score = 0; combo = 0; maxCombo = 0;
        jump = null; effects = [];
        state = 'idle';
        nextDir = { x: 1, z: 0 };
        spawnNext();
        var t = targetCam(); camX = t.x; camY = t.y;
        overlay.classList.add('hidden');
        updateHud();
    }

    function updateHud() {
        scoreEl.textContent = score;
        bestEl.textContent = Math.max(best, score);
    }

    /* ================= 输入 ================= */
    function pressStart() {
        if (state !== 'idle') return;
        state = 'charging';
        charge = 0;
        hintEl.classList.add('hide');
        audio();
    }
    function pressEnd() {
        if (state !== 'charging') return;
        doJump();
    }

    function doJump() {
        var J = clamp(charge, 0, 1) * MAX_JUMP;
        var isX = nextDir.x === 1;
        var charCoord = isX ? char.x : char.z;
        var curCoord = isX ? cur.x : cur.z;
        var nextCoord = isX ? nextBlock.x : nextBlock.z;
        var need = nextCoord - charCoord;              // 从小人当前位置到下一块中心的距离
        var farEdge = curCoord + cur.h;                // 当前方块前沿
        var landCoord = charCoord + J;

        var outcome, perfect = false, gain = 0;
        if (landCoord <= farEdge + 0.001) {
            outcome = 'stay';                          // 没跳出当前方块
        } else if (Math.abs(J - need) <= nextBlock.h) {
            outcome = 'next';                          // 落在下一块上
            perfect = Math.abs(J - need) <= Math.max(0.09, nextBlock.h * 0.32);
            if (perfect) { combo++; maxCombo = Math.max(maxCombo, combo); gain = 2 * combo; }
            else { combo = 0; gain = 1; }
        } else {
            outcome = (J > need) ? 'over' : 'short';   // 跳过头 / 掉进缝隙
        }

        jump = {
            sx: char.x, sz: char.z,
            ex: char.x + (isX ? J : 0),
            ez: char.z + (isX ? 0 : J),
            t: 0,
            dur: 0.26 + J * 0.11,
            arc: 26 + J * 26,
            outcome: outcome,
            perfect: perfect,
            gain: gain
        };
        state = 'jump';
        sfxJump();
    }

    function finishJump() {
        char.x = jump.ex; char.z = jump.ez;
        charY = 0;

        if (jump.outcome === 'next') {
            score += jump.gain;
            updateHud();
            if (jump.perfect) {
                addEffect('ring', char.x, char.z, 0.55);
                addEffect('text', char.x, char.z, 0.95, '完美 +' + jump.gain);
                sfxPerfect();
            } else {
                sfxLand();
            }
            cur = nextBlock;
            spawnNext();
            state = 'idle';
        } else if (jump.outcome === 'stay') {
            sfxLand();
            state = 'idle';
        } else {
            charVy = 40;
            drift = jump.outcome === 'over' ? 0.9 : 0.2;
            state = 'fall';
            sfxFail();
        }
        jump = null;
    }

    function gameOver() {
        state = 'over';
        if (score > best) {
            best = score;
            try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
        }
        updateHud();
        ovTitle.textContent = '游戏结束';
        ovText.innerHTML = '本次得分 <b>' + score + '</b>　最高连击 <b>' + (maxCombo || 0) + '</b><br>历史最佳 <b>' + best + '</b>';
        overlay.classList.remove('hidden');
    }

    /* ================= 特效 ================= */
    function addEffect(type, x, z, dur, text) {
        effects.push({ type: type, x: x, z: z, t: 0, dur: dur, text: text || '' });
    }

    /* ================= 更新 ================= */
    function update(dt) {
        // 相机平滑跟随
        if (cur) {
            var tc = targetCam();
            var k = clamp(dt * CAM_LERP, 0, 1);
            camX += (tc.x - camX) * k;
            camY += (tc.y - camY) * k;
        }

        if (state === 'charging') charge = Math.min(1, charge + CHARGE_PER_SEC * dt);

        var sqTarget = state === 'charging' ? 1 - 0.34 * charge : 1;
        squash += (sqTarget - squash) * clamp(dt * 18, 0, 1);

        if (state === 'jump' && jump) {
            jump.t += dt / jump.dur;
            if (jump.t >= 1) {
                finishJump();
            } else {
                char.x = jump.sx + (jump.ex - jump.sx) * jump.t;
                char.z = jump.sz + (jump.ez - jump.sz) * jump.t;
                charY = Math.sin(Math.PI * jump.t) * jump.arc;
            }
        } else if (state === 'fall') {
            charVy += FALL_G * dt;
            charY -= charVy * dt;
            if (nextDir.x === 1) char.x += drift * dt; else char.z += drift * dt;
            if (sp(char.x, char.z).y - charY > H + 140) gameOver();
        }

        for (var i = effects.length - 1; i >= 0; i--) {
            effects[i].t += dt;
            if (effects[i].t >= effects[i].dur) effects.splice(i, 1);
        }
    }

    /* ================= 绘制 ================= */
    function drawBlock(b) {
        var squashBlock = (state === 'charging' && b === cur) ? (1 - 0.30 * charge) : 1;
        var th = U * BH_RATIO * squashBlock;
        var h = b.h;
        var A = sp(b.x - h, b.z - h);   // 顶（最靠近观察者）
        var B = sp(b.x + h, b.z - h);   // 右
        var C = sp(b.x + h, b.z + h);   // 底（最远）
        var D = sp(b.x - h, b.z + h);   // 左

        if (C.y > H + 60 || A.y < -400) return;   // 视口外的方块直接跳过

        poly([A, B, C, D], shade(b.color, 1.16));                                  // 顶面
        poly([A, B, { x: B.x, y: B.y + th }, { x: A.x, y: A.y + th }], shade(b.color, 0.86)); // 右面
        poly([A, D, { x: D.x, y: D.y + th }, { x: A.x, y: A.y + th }], shade(b.color, 0.66)); // 左面
    }

    function drawShadow() {
        var p = sp(char.x, char.z);
        var y = Math.max(0, charY);
        var k = 1 / (1 + y / 150);
        ctx.save();
        ctx.globalAlpha = 0.20 * k;
        ctx.fillStyle = '#24374d';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 2, U * 0.10 * k, U * 0.05 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawChar() {
        var p = sp(char.x, char.z);
        var r = U * 0.085;
        var bodyH = r * 2.1;
        var sy = squash, sx = 1 + (1 - squash) * 0.7;

        ctx.save();
        ctx.translate(p.x, p.y - charY);
        ctx.scale(sx, sy);

        // 身体
        var grd = ctx.createLinearGradient(-r, 0, r, 0);
        grd.addColorStop(0, '#63739c');
        grd.addColorStop(0.52, '#445073');
        grd.addColorStop(1, '#2a3350');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(-r * 1.15, 0);
        ctx.quadraticCurveTo(-r * 0.72, -bodyH * 0.34, -r * 0.5, -bodyH);
        ctx.lineTo(r * 0.5, -bodyH);
        ctx.quadraticCurveTo(r * 0.72, -bodyH * 0.34, r * 1.15, 0);
        ctx.closePath();
        ctx.fill();

        // 底座
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.15, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#222b45';
        ctx.fill();

        // 头
        var headR = r * 0.86;
        var headY = -bodyH - headR * 0.7;
        var hg = ctx.createRadialGradient(-headR * 0.35, headY - headR * 0.4, headR * 0.2, 0, headY, headR * 1.25);
        hg.addColorStop(0, '#c3cde6');
        hg.addColorStop(0.55, '#8a97bd');
        hg.addColorStop(1, '#4d587a');
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fillStyle = hg;
        ctx.fill();

        // 高光
        ctx.beginPath();
        ctx.arc(-headR * 0.34, headY - headR * 0.36, headR * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fill();

        ctx.restore();
    }

    function drawChargeBar() {
        var p = sp(char.x, char.z);
        var w = U * 0.55;
        var h = Math.max(7, U * 0.05);
        var x = p.x - w / 2;
        var y = p.y - charY - U * 0.62;

        ctx.save();
        ctx.globalAlpha = 0.9;
        roundRect(x, y, w, h, h / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fill();

        var c = charge < 0.5 ? '#3fbf7f' : (charge < 0.8 ? '#f0b429' : '#e8483e');
        roundRect(x, y, Math.max(h, w * charge), h, h / 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.restore();
    }

    function drawEffects() {
        for (var i = 0; i < effects.length; i++) {
            var e = effects[i];
            var k = clamp(e.t / e.dur, 0, 1);
            var p = sp(e.x, e.z);

            if (e.type === 'ring') {
                ctx.save();
                ctx.globalAlpha = (1 - k) * 0.9;
                ctx.strokeStyle = '#ffd166';
                ctx.lineWidth = Math.max(2, U * 0.022);
                var rr = U * (0.12 + k * 0.44);
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, rr, rr * 0.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.globalAlpha = 1 - k;
                ctx.fillStyle = '#ff7a1a';
                ctx.font = '800 ' + Math.round(U * 0.17) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(30,45,70,0.28)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 2;
                ctx.fillText(e.text, p.x, p.y - U * 0.55 - k * U * 0.4);
                ctx.restore();
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        var list = blocks.slice().sort(function (a, b) { return (b.x + b.z) - (a.x + a.z); });
        for (var i = 0; i < list.length; i++) drawBlock(list[i]);

        drawShadow();
        drawChar();
        drawEffects();
        if (state === 'charging') drawChargeBar();
    }

    /* ================= 主循环 ================= */
    function tick(now) {
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (!isFinite(dt) || dt < 0) dt = 0;
        dt = Math.min(dt, 0.05);
        update(dt);
        draw();
        requestAnimationFrame(tick);
    }

    /* ================= 事件 ================= */
    var hasPointer = 'onpointerdown' in window;
    if (hasPointer) {
        canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); pressStart(); });
        window.addEventListener('pointerup', function () { pressEnd(); });
        window.addEventListener('pointercancel', function () { pressEnd(); });
    } else {
        canvas.addEventListener('touchstart', function (e) { e.preventDefault(); pressStart(); }, { passive: false });
        window.addEventListener('touchend', function () { pressEnd(); });
        window.addEventListener('touchcancel', function () { pressEnd(); });
        canvas.addEventListener('mousedown', function (e) { e.preventDefault(); pressStart(); });
        window.addEventListener('mouseup', function () { pressEnd(); });
    }

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) pressStart();
        }
    });
    window.addEventListener('keyup', function (e) {
        if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); pressEnd(); }
    });

    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        if (soundOn) { audio(); beep(660, 0.09, 'sine', 0.1); }
    });

    restartBtn.addEventListener('click', function () {
        reset();
        if (state === 'idle') audio();
    });

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

    /* ================= 启动 ================= */
    try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { best = 0; }
    resize();
    reset();
    lastTime = performance.now();
    requestAnimationFrame(tick);
})();
