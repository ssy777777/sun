/* 愤怒的小鸟 · 单关（demo16）
 * 依赖 js/physics.js（window.Physics）。 */
(function () {
    'use strict';

    var Phys = window.Physics;
    var V = Phys.V;
    function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
    function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
    function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
    function dot(a, b) { return a.x * b.x + a.y * b.y; }

    var WORLD_W = 1000, WORLD_H = 560, GROUND_Y = 520;
    var SLING = V(168, 418);
    var MAX_STRETCH = 96, MAX_SPEED = 1280;
    var START_BIRDS = 3;
    var DMG_MIN = 220, DMG_K = 0.32;
    var BIRD_R = 16;

    var MAT = {
        wood: { color: '#c58a49', dark: '#8a5a28', density: 0.9, hp: 120, points: 200 },
        stone: { color: '#9aa4ad', dark: '#666f79', density: 1.7, hp: 240, points: 300 },
        glass: { color: '#8fd4e8', dark: '#57a6c1', density: 0.55, hp: 40, points: 150 }
    };

    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');
    var hudBirds = document.getElementById('hud-birds');
    var hudPigs = document.getElementById('hud-pigs');
    var hudScore = document.getElementById('hud-score');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var restartBtn = document.getElementById('restart');
    var soundBtn = document.getElementById('sound');
    var ovRestartBtn = document.getElementById('ov-restart');

    var dpr = 1, cw = 0, ch = 0, scale = 1, offX = 0, offY = 0;
    var world, blocks = [], pigs = [], bird = null;
    var birdsLeft = START_BIRDS, score = 0;
    var state = 'aiming';
    var dragging = false, dragPos = V(SLING.x, SLING.y);
    var lowSpeedT = 0, flyT = 0, settleDelay = 0;
    var particles = [];
    var soundOn = true, audioCtx = null;
    var lastT = 0;

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
        var osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(vol || 0.06, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(t0); osc.stop(t0 + dur);
    }
    var sfx = {
        launch: function () { beep(300, 0.18, 'sawtooth', 0.07); beep(520, 0.12, 'sine', 0.05, 0.05); },
        hit: function () { beep(150, 0.08, 'square', 0.05); },
        pop: function () { beep(700, 0.1, 'triangle', 0.07); beep(980, 0.1, 'triangle', 0.06, 0.06); },
        win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.2, 'triangle', 0.07, i * 0.12); }); },
        lose: function () { [400, 300, 200].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.07, i * 0.15); }); }
    };

    function loadBest() {
        var b = 0;
        try { b = parseInt(localStorage.getItem('bird-best') || '0', 10) || 0; } catch (e) { b = 0; }
        return b;
    }
    function saveBest(v) { try { localStorage.setItem('bird-best', String(v)); } catch (e) { } }

    function resize() {
        var rect = canvas.getBoundingClientRect();
        cw = rect.width; ch = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        scale = Math.min(cw / WORLD_W, ch / WORLD_H);
        offX = (cw - WORLD_W * scale) / 2;
        offY = (ch - WORLD_H * scale) / 2;
    }
    function toWorld(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        return V((clientX - rect.left - offX) / scale, (clientY - rect.top - offY) / scale);
    }

    function makeBlock(x, y, w, h, mat, angle) {
        var m = MAT[mat];
        var body = new Phys.Body({
            shape: Phys.Box(w, h), position: V(x, y), angle: angle || 0,
            density: m.density, restitution: 0.1, friction: 0.6
        });
        var block = { body: body, w: w, h: h, mat: mat, hp: m.hp, dead: false, flash: 0 };
        body.data = { kind: 'block', block: block };
        world.add(body);
        blocks.push(block);
        return block;
    }
    function makePig(x, y) {
        var body = new Phys.Body({
            shape: Phys.Circle(20), position: V(x, y), density: 0.6, restitution: 0.2, friction: 0.7
        });
        var pig = { body: body, hp: 60, dead: false, flash: 0 };
        body.data = { kind: 'pig', pig: pig };
        world.add(body);
        pigs.push(pig);
        return pig;
    }

    function buildLevel() {
        world = new Phys.World({ gravity: 1650, iterations: 10 });
        var ground = new Phys.Body({ shape: Phys.Box(4000, 80), position: V(WORLD_W / 2, GROUND_Y + 40), static: true, friction: 0.8, restitution: 0.1 });
        ground.data = { kind: 'ground' };
        world.add(ground);

        makeBlock(700, 460, 26, 120, 'wood');
        makeBlock(830, 460, 26, 120, 'wood');
        makeBlock(765, 388, 176, 24, 'wood');
        makeBlock(728, 341, 20, 70, 'glass');
        makeBlock(802, 341, 20, 70, 'glass');
        makeBlock(765, 293, 150, 26, 'stone');

        makePig(735, 500);
        makePig(795, 500);
        makePig(765, 260);
    }

    function spawnBird() {
        if (birdsLeft <= 0) { bird = null; return; }
        var body = new Phys.Body({ shape: Phys.Circle(BIRD_R), position: V(SLING.x, SLING.y), density: 3, restitution: 0.25, friction: 0.5, static: true });
        body.data = { kind: 'bird' };
        bird = { body: body };
        dragPos = V(SLING.x, SLING.y);
        state = 'aiming';
        updateHUD();
    }

    function launch(v) {
        if (!bird) return;
        bird.body.staticBody = false;
        bird.body.computeMass();
        bird.body.velocity = v;
        state = 'flying';
        lowSpeedT = 0; flyT = 0;
        sfx.launch();
        updateHUD();
    }

    function pointVel(body, r) {
        var v = body._pv || { x: body.velocity.x, y: body.velocity.y, w: body.angularVelocity };
        return { x: v.x - v.w * r.y, y: v.y + v.w * r.x };
    }

    function applyDamage() {
        var contacts = world.contacts;
        for (var i = 0; i < contacts.length; i++) {
            var m = contacts[i];
            var a = m.a, b = m.b;
            if (m.contactCount === 0) continue;
            var ra = sub(m.contacts[0], a.position);
            var rb = sub(m.contacts[0], b.position);
            var rel = sub(pointVel(b, rb), pointVel(a, ra));
            var speed = -dot(rel, m.normal);
            if (speed <= DMG_MIN) continue;
            var dmg = (speed - DMG_MIN) * DMG_K;
            if (dmg > 4) sfx.hit();
            hurt(a, dmg);
            hurt(b, dmg);
        }
    }

    function hurt(body, dmg) {
        var d = body.data;
        if (!d) return;
        if (d.kind === 'block' && !d.block.dead) {
            d.block.hp -= dmg; d.block.flash = 1;
            if (d.block.hp <= 0) destroyBlock(d.block);
        } else if (d.kind === 'pig' && !d.pig.dead) {
            d.pig.hp -= dmg; d.pig.flash = 1;
            if (d.pig.hp <= 0) destroyPig(d.pig);
        }
    }

    function burst(x, y, color, n) {
        for (var i = 0; i < n; i++) {
            var ang = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260;
            particles.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 80, life: 0.6 + Math.random() * 0.5, max: 1.1, color: color, r: 2 + Math.random() * 3 });
        }
    }

    function destroyBlock(block) {
        block.dead = true;
        world.remove(block.body);
        score += MAT[block.mat].points;
        sfx.pop();
        burst(block.body.position.x, block.body.position.y, MAT[block.mat].dark, 14);
        updateHUD();
    }
    function destroyPig(pig) {
        pig.dead = true;
        world.remove(pig.body);
        score += 1000;
        sfx.pop();
        burst(pig.body.position.x, pig.body.position.y, '#79c34a', 18);
        updateHUD();
    }

    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.vy += 900 * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function activePigs() { var n = 0; for (var i = 0; i < pigs.length; i++) if (!pigs[i].dead) n++; return n; }

    function updateHUD() {
        hudBirds.textContent = '×' + birdsLeft;
        hudPigs.textContent = '×' + activePigs();
        hudScore.textContent = score;
    }

    function endBird() {
        if (bird) { world.remove(bird.body); bird = null; }
        if (activePigs() === 0) { win(); return; }
        if (birdsLeft <= 0) { lose(); return; }
        spawnBird();
    }

    function win() {
        if (state === 'won' || state === 'lost') return;
        state = 'won';
        score += birdsLeft * 500;
        var best = loadBest();
        var isRecord = score > best;
        if (isRecord) saveBest(score);
        updateHUD();
        sfx.win();
        showOverlay('过关！', '得分 <b>' + score + '</b>' + (isRecord ? '　新纪录！' : ''));
    }
    function lose() {
        if (state === 'won' || state === 'lost') return;
        state = 'lost';
        sfx.lose();
        showOverlay('失败', '还剩 <b>' + activePigs() + '</b> 只猪 · 得分 ' + score);
    }

    function showOverlay(title, text) {
        ovTitle.textContent = title;
        ovText.innerHTML = text;
        overlay.classList.remove('hidden');
    }

    function reset() {
        overlay.classList.add('hidden');
        blocks = []; pigs = []; bird = null; particles = [];
        birdsLeft = START_BIRDS; score = 0;
        state = 'aiming'; dragging = false;
        buildLevel();
        spawnBird();
        updateHUD();
    }

    function step(dt) {
        if (state !== 'won' && state !== 'lost') {
            for (var i = 0; i < world.bodies.length; i++) {
                var bb = world.bodies[i];
                bb._pv = { x: bb.velocity.x, y: bb.velocity.y, w: bb.angularVelocity };
            }
            world.step(dt);
            applyDamage();
            if (state === 'flying') {
                flyT += dt;
                var sp = Phys.len(bird.body.velocity);
                if (sp < 45) lowSpeedT += dt; else lowSpeedT = 0;
                var p = bird.body.position;
                var off = p.x < -80 || p.x > WORLD_W + 80 || p.y > WORLD_H + 140;
                if (activePigs() === 0) { win(); }
                else if (off || lowSpeedT > 0.7 || flyT > 8) { endBird(); }
            }
        }
        updateParticles(dt);
    }

    function render() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, '#bfe4ff'); g.addColorStop(0.7, '#e8f6ff'); g.addColorStop(1, '#d6f0e0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);

        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);

        // ground
        ctx.fillStyle = '#7cc36a';
        ctx.fillRect(-2000, GROUND_Y, 6000, 12);
        ctx.fillStyle = '#b98a52';
        ctx.fillRect(-2000, GROUND_Y + 12, 6000, WORLD_H);

        // slingshot
        ctx.strokeStyle = '#6b4526';
        ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(SLING.x, GROUND_Y); ctx.lineTo(SLING.x, SLING.y + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 30); ctx.lineTo(SLING.x - 18, SLING.y - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 30); ctx.lineTo(SLING.x + 18, SLING.y - 6); ctx.stroke();

        // elastic bands
        if (bird && state === 'aiming') {
            var bp = dragging ? dragPos : V(SLING.x, SLING.y);
            ctx.strokeStyle = '#3b2a19';
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(SLING.x - 18, SLING.y - 6); ctx.lineTo(bp.x, bp.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(SLING.x + 18, SLING.y - 6); ctx.lineTo(bp.x, bp.y); ctx.stroke();
        }

        // trajectory preview
        if (bird && state === 'aiming' && dragging) {
            var v = mul(sub(SLING, dragPos), MAX_SPEED / MAX_STRETCH);
            var p = V(dragPos.x, dragPos.y);
            var sdt = 1 / 40;
            ctx.fillStyle = 'rgba(40,70,110,0.35)';
            for (var i = 0; i < 70; i++) {
                p = add(p, mul(v, sdt));
                v = add(v, mul(V(0, world.gravity.y), sdt));
                if (p.y > GROUND_Y) break;
                if (i % 3 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
            }
        }

        // blocks
        for (var k = 0; k < blocks.length; k++) {
            var bl = blocks[k];
            if (bl.dead) continue;
            drawBox(bl);
        }
        // pigs
        for (var q = 0; q < pigs.length; q++) if (!pigs[q].dead) drawPig(pigs[q]);

        // bird
        if (bird) {
            var pos = (state === 'aiming' && dragging) ? dragPos : bird.body.position;
            drawBird(pos, bird.body.angle);
        }

        // particles
        for (var r = 0; r < particles.length; r++) {
            var pt = particles[r];
            ctx.globalAlpha = Math.max(0, pt.life / pt.max);
            ctx.fillStyle = pt.color;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function drawBox(bl) {
        var b = bl.body, m = MAT[bl.mat];
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = m.color;
        ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);
        ctx.strokeStyle = m.dark; ctx.lineWidth = 3;
        ctx.strokeRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);
        if (bl.mat === 'glass') {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-bl.w / 2 + 4, -bl.h / 2 + 4); ctx.lineTo(bl.w / 2 - 4, bl.h / 2 - 4); ctx.stroke();
        }
        if (bl.flash > 0) {
            ctx.globalAlpha = bl.flash * 0.6;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function drawPig(pig) {
        var b = pig.body;
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = '#7ec850';
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
        ctx.fillStyle = '#5fae37';
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7);
        ctx.lineWidth = 3; ctx.strokeStyle = '#4f972c'; ctx.stroke();
        // snout
        ctx.fillStyle = '#8fd35f';
        ctx.beginPath(); ctx.arc(0, 4, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#3f7a22';
        ctx.beginPath(); ctx.arc(-3, 4, 1.8, 0, 7); ctx.arc(3, 4, 1.8, 0, 7); ctx.fill();
        // eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6, -6, 4, 0, 7); ctx.arc(6, -6, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-5, -6, 1.8, 0, 7); ctx.arc(7, -6, 1.8, 0, 7); ctx.fill();
        if (pig.flash > 0) {
            ctx.globalAlpha = pig.flash * 0.6; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function drawBird(pos, angle) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = '#e8483e';
        ctx.beginPath(); ctx.arc(0, 0, BIRD_R, 0, 7); ctx.fill();
        ctx.strokeStyle = '#b52f27'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-4, -5, 5, 0, 7); ctx.arc(4, -5, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-3, -5, 2, 0, 7); ctx.arc(5, -5, 2, 0, 7); ctx.fill();
        ctx.fillStyle = '#f6b73c';
        ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(8, 4); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function loop(t) {
        if (!lastT) lastT = t;
        var dt = Math.min((t - lastT) / 1000, 1 / 30);
        lastT = t;
        var steps = 2, h = dt / steps;
        for (var i = 0; i < steps; i++) step(h);
        // decay flashes
        for (var k = 0; k < blocks.length; k++) if (blocks[k].flash > 0) blocks[k].flash = Math.max(0, blocks[k].flash - dt * 3);
        for (var q = 0; q < pigs.length; q++) if (pigs[q].flash > 0) pigs[q].flash = Math.max(0, pigs[q].flash - dt * 3);
        render();
        requestAnimationFrame(loop);
    }

    // ---- input ----
    function onDown(e) {
        if (state !== 'aiming' || !bird) return;
        var p = toWorld(e.clientX, e.clientY);
        var d = sub(p, V(SLING.x, SLING.y));
        if (Phys.len(d) > MAX_STRETCH + 70) return;
        dragging = true;
        dragPos = clampDrag(p);
        e.preventDefault();
    }
    function onMove(e) {
        if (!dragging) return;
        dragPos = clampDrag(toWorld(e.clientX, e.clientY));
        e.preventDefault();
    }
    function onUp() {
        if (!dragging) return;
        dragging = false;
        var v = mul(sub(SLING, dragPos), MAX_SPEED / MAX_STRETCH);
        if (Phys.len(sub(dragPos, V(SLING.x, SLING.y))) < 12) { dragPos = V(SLING.x, SLING.y); return; }
        birdsLeft--;
        updateHUD();
        launch(v);
    }
    function clampDrag(p) {
        var d = sub(p, V(SLING.x, SLING.y));
        var l = Phys.len(d);
        if (l > MAX_STRETCH) d = mul(d, MAX_STRETCH / l);
        return add(V(SLING.x, SLING.y), d);
    }

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', resize);
    restartBtn.addEventListener('click', reset);
    ovRestartBtn.addEventListener('click', reset);
    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
    });

    resize();
    buildLevel();
    spawnBird();
    updateHUD();
    requestAnimationFrame(loop);
})();
