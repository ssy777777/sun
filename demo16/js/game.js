/* 愤怒的小鸟 · 多关卡（demo16）
 * 依赖 js/physics.js（window.Physics）与 js/levels.js（BIRD_TYPES / LEVELS）。 */
(function () {
    'use strict';

    var Phys = window.Physics;
    var V = Phys.V;
    var add = Phys.add, sub = Phys.sub, mul = Phys.mul, dot = Phys.dot, len = Phys.len, rot = Phys.rot, norm = Phys.norm;
    var BIRD_TYPES = window.BIRD_TYPES;
    var LEVELS = window.LEVELS;

    var WORLD_W = 1000, WORLD_H = 560, GROUND_Y = 520;
    var SLING = V(168, 418);
    var MAX_STRETCH = 96, MAX_SPEED = 1280;
    var DMG_MIN = 220, DMG_K = 0.32;
    var MAT = {
        wood: { color: '#c58a49', dark: '#8a5a28', density: 0.9, hp: 120, points: 200 },
        stone: { color: '#9aa4ad', dark: '#666f79', density: 1.7, hp: 240, points: 300 },
        glass: { color: '#8fd4e8', dark: '#57a6c1', density: 0.55, hp: 40, points: 150 }
    };

    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');
    var hudLevel = document.getElementById('hud-level');
    var hudBirds = document.getElementById('hud-birds');
    var hudPigs = document.getElementById('hud-pigs');
    var hudScore = document.getElementById('hud-score');
    var tapHint = document.getElementById('tap-hint');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovStars = document.getElementById('ov-stars');
    var ovText = document.getElementById('ov-text');
    var ovNext = document.getElementById('ov-next');
    var ovRestart = document.getElementById('ov-restart');
    var ovMenu = document.getElementById('ov-menu');
    var menuEl = document.getElementById('menu');
    var menuGrid = document.getElementById('menu-grid');
    var menuClose = document.getElementById('menu-close');
    var menuBtn = document.getElementById('menu-btn');
    var soundBtn = document.getElementById('sound');
    var restartBtn = document.getElementById('restart');

    var dpr = 1, cw = 0, ch = 0, scale = 1, offX = 0, offY = 0;
    var world, blocks = [], pigs = [];
    var activeBirds = [], egg = null, particles = [], shocks = [];
    var levelIndex = 0, birdQueue = [], birdIdx = 0, currentBird = null;
    var score = 0, state = 'aiming';
    var dragging = false, dragPos = V(SLING.x, SLING.y);
    var flyT = 0;
    var soundOn = true, audioCtx = null, lastT = 0;
    var prog = { unlocked: 1, stars: {} };

    function loadProg() {
        try {
            var p = JSON.parse(localStorage.getItem('bird-progress') || 'null');
            if (p && p.unlocked) prog = p;
        } catch (e) { }
    }
    function saveProg() { try { localStorage.setItem('bird-progress', JSON.stringify(prog)); } catch (e) { } }
    function starsFor(remaining) { return remaining >= 2 ? 3 : (remaining === 1 ? 2 : 1); }

    function getAudio() {
        if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }
    function beep(freq, dur, type, vol, delay) {
        if (!soundOn) return;
        var ac = getAudio(); if (!ac) return;
        var t0 = ac.currentTime + (delay || 0);
        var osc = ac.createOscillator(), g = ac.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(vol || 0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(t0); osc.stop(t0 + dur);
    }
    var sfx = {
        launch: function () { beep(300, 0.16, 'sawtooth', 0.07); beep(520, 0.12, 'sine', 0.05, 0.05); },
        hit: function () { beep(150, 0.07, 'square', 0.05); },
        pop: function () { beep(700, 0.09, 'triangle', 0.07); beep(980, 0.09, 'triangle', 0.06, 0.05); },
        dash: function () { beep(900, 0.12, 'sawtooth', 0.06); },
        split: function () { [700, 840, 980].forEach(function (f, i) { beep(f, 0.08, 'square', 0.05, i * 0.03); }); },
        boom: function () { beep(90, 0.35, 'sawtooth', 0.1); beep(60, 0.4, 'square', 0.08, 0.02); },
        win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.2, 'triangle', 0.07, i * 0.12); }); },
        lose: function () { [400, 300, 200].forEach(function (f, i) { beep(f, 0.25, 'sawtooth', 0.07, i * 0.15); }); }
    };

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
    function toWorld(cx, cy) {
        var rect = canvas.getBoundingClientRect();
        return V((cx - rect.left - offX) / scale, (cy - rect.top - offY) / scale);
    }
    function clientXY(e) {
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        if (t) return { x: t.clientX, y: t.clientY };
        return { x: e.clientX, y: e.clientY };
    }

    function makeBlock(x, y, w, h, mat) {
        var m = MAT[mat];
        var body = new Phys.Body({ shape: Phys.Box(w, h), position: V(x, y), density: m.density, restitution: 0.1, friction: 0.6 });
        var block = { body: body, w: w, h: h, mat: mat, hp: m.hp, dead: false, flash: 0 };
        body.data = { kind: 'block', block: block };
        world.add(body); blocks.push(block);
    }
    function makePig(x, y) {
        var body = new Phys.Body({ shape: Phys.Circle(20), position: V(x, y), density: 0.6, restitution: 0.2, friction: 0.7 });
        var pig = { body: body, hp: 60, dead: false, flash: 0 };
        body.data = { kind: 'pig', pig: pig };
        world.add(body); pigs.push(pig);
    }
    function buildWorld(spec) {
        world = new Phys.World({ gravity: 1650, iterations: 10 });
        var ground = new Phys.Body({ shape: Phys.Box(6000, 80), position: V(WORLD_W / 2, GROUND_Y + 40), static: true, friction: 0.85, restitution: 0.08 });
        ground.data = { kind: 'ground' };
        world.add(ground);
        spec.blocks.forEach(function (b) { makeBlock(b[0], b[1], b[2], b[3], b[4]); });
        spec.pigs.forEach(function (p) { makePig(p[0], p[1]); });
    }

    function spawnNextBird() {
        if (birdIdx >= birdQueue.length) { currentBird = null; state = 'aiming'; updateHUD(); return; }
        var type = birdQueue[birdIdx++];
        var t = BIRD_TYPES[type];
        var body = new Phys.Body({ shape: Phys.Circle(t.r), position: V(SLING.x, SLING.y), density: t.density, restitution: 0.25, friction: 0.5, static: true });
        body.data = { kind: 'bird', type: type };
        world.add(body);
        currentBird = { body: body, type: type, powerUsed: false, lowT: 0, done: false };
        activeBirds = [];
        dragPos = V(SLING.x, SLING.y);
        state = 'aiming';
        updateHUD();
    }

    function launch(v) {
        var b = currentBird;
        b.body.staticBody = false; b.body.computeMass();
        b.powerUsed = false; b.lowT = 0; b.done = false;
        b.body.velocity = v;
        activeBirds = [b];
        state = 'flying'; flyT = 0;
        sfx.launch(); showTapHint(); updateHUD();
    }

    function showTapHint() {
        if (!currentBird) return;
        var info = BIRD_TYPES[currentBird.type];
        if (info.power === 'none') return;
        tapHint.textContent = '飞行中点击屏幕：' + info.label.split('·')[1];
        tapHint.classList.add('show');
        setTimeout(function () { tapHint.classList.remove('show'); }, 1600);
    }

    function triggerAbility() {
        if (state !== 'flying') return;
        var bird = null;
        for (var i = 0; i < activeBirds.length; i++) {
            var bb = activeBirds[i];
            if (!bb.done && !bb.powerUsed && BIRD_TYPES[bb.type].power !== 'none') { bird = bb; break; }
        }
        if (!bird) return;
        var power = BIRD_TYPES[bird.type].power;
        bird.powerUsed = true;
        if (power === 'dash') {
            bird.body.velocity = mul(bird.body.velocity, 1.85);
            sfx.dash();
            burstRing(bird.body.position.x, bird.body.position.y);
        } else if (power === 'split') {
            var baseV = bird.body.velocity;
            for (var k = -1; k <= 1; k += 2) {
                var nv = rot(baseV, k * 0.34);
                var nb = new Phys.Body({ shape: Phys.Circle(BIRD_TYPES.blue.r), position: V(bird.body.position.x, bird.body.position.y), density: BIRD_TYPES.blue.density, restitution: 0.25, friction: 0.5 });
                nb.data = { kind: 'bird', type: 'blue' };
                nb.velocity = nv;
                world.add(nb);
                activeBirds.push({ body: nb, type: 'blue', powerUsed: true, lowT: 0, done: false });
            }
            sfx.split();
        } else if (power === 'bomb') {
            bird.done = true;
            explode(bird.body.position.x, bird.body.position.y, 175, 2.3e6, 300);
            if (world.bodies.indexOf(bird.body) >= 0) world.remove(bird.body);
        } else if (power === 'egg') {
            var pos = bird.body.position;
            var eb = new Phys.Body({ shape: Phys.Circle(10), position: V(pos.x, pos.y + 22), density: 4, restitution: 0.1, friction: 0.5 });
            eb.data = { kind: 'egg' };
            eb.velocity = add(bird.body.velocity, V(0, 220));
            world.add(eb); egg = { body: eb, time: 0 };
            bird.body.velocity = add(bird.body.velocity, V(-90, -240));
            sfx.split();
        }
    }

    function explode(x, y, radius, power, damage) {
        var center = V(x, y);
        for (var i = 0; i < world.bodies.length; i++) {
            var b = world.bodies[i];
            if (b.staticBody) continue;
            var d = sub(b.position, center), dist = len(d);
            if (dist > radius) continue;
            var f = 1 - dist / radius;
            var dir = dist > 1 ? mul(d, 1 / dist) : V(0, -1);
            dir = norm(add(dir, V(0, -0.35)));
            b.velocity = add(b.velocity, mul(dir, power * f * b.invMass));
            if (b.data && (b.data.kind === 'block' || b.data.kind === 'pig')) hurt(b, damage * f);
        }
        shocks.push({ x: x, y: y, r: 10, max: radius, life: 0.35, t: 0.35 });
        for (var q = 0; q < 22; q++) {
            var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 340;
            particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, max: 1, color: q % 2 ? '#ffce54' : '#ff8a3d', r: 2 + Math.random() * 4 });
        }
        sfx.boom();
    }

    function burstRing(x, y) {
        shocks.push({ x: x, y: y, r: 6, max: 60, life: 0.25, t: 0.25 });
    }

    function pointVel(body, r) {
        var v = body._pv || { x: body.velocity.x, y: body.velocity.y, w: body.angularVelocity };
        return { x: v.x - v.w * r.y, y: v.y + v.w * r.x };
    }
    function applyDamage() {
        var m = world.contacts;
        for (var i = 0; i < m.length; i++) {
            if (m[i].contactCount === 0) continue;
            var a = m[i].a, b = m[i].b;
            var ra = sub(m[i].contacts[0], a.position), rb = sub(m[i].contacts[0], b.position);
            var rel = sub(pointVel(b, rb), pointVel(a, ra));
            var speed = -dot(rel, m[i].normal);
            if (speed <= DMG_MIN) continue;
            var dmg = (speed - DMG_MIN) * DMG_K;
            if (dmg > 4) sfx.hit();
            hurt(a, dmg); hurt(b, dmg);
        }
    }
    function hurt(body, dmg) {
        var d = body.data; if (!d) return;
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
            var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260;
            particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.6 + Math.random() * 0.5, max: 1.1, color: color, r: 2 + Math.random() * 3 });
        }
    }
    function destroyBlock(block) {
        block.dead = true; world.remove(block.body);
        score += MAT[block.mat].points; sfx.pop();
        burst(block.body.position.x, block.body.position.y, MAT[block.mat].dark, 14);
        updateHUD();
    }
    function destroyPig(pig) {
        pig.dead = true; world.remove(pig.body);
        score += 1000; sfx.pop();
        burst(pig.body.position.x, pig.body.position.y, '#79c34a', 18);
        updateHUD();
    }

    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (var j = shocks.length - 1; j >= 0; j--) {
            var s = shocks[j]; s.t -= dt;
            s.r = s.max * (1 - s.t / s.life);
            if (s.t <= 0) shocks.splice(j, 1);
        }
    }
    function activePigs() { var n = 0; for (var i = 0; i < pigs.length; i++) if (!pigs[i].dead) n++; return n; }

    function updateHUD() {
        hudLevel.textContent = LEVELS[levelIndex].name;
        hudScore.textContent = score;
        hudPigs.textContent = '×' + activePigs();
        hudBirds.textContent = '';
        var from = state === 'aiming' ? Math.max(0, birdIdx - 1) : birdIdx;
        for (var i = from; i < birdQueue.length; i++) {
            var dotEl = document.createElement('i');
            dotEl.className = 'bdot';
            dotEl.style.background = BIRD_TYPES[birdQueue[i]].color;
            hudBirds.appendChild(dotEl);
        }
    }

    function step(dt) {
        if (state !== 'won' && state !== 'lost') {
            for (var i = 0; i < world.bodies.length; i++) {
                var bb = world.bodies[i];
                bb._pv = { x: bb.velocity.x, y: bb.velocity.y, w: bb.angularVelocity };
            }
            world.step(dt);
            applyDamage();
            if (egg) {
                var hit = false;
                for (var c = 0; c < world.contacts.length; c++) { if (world.contacts[c].a === egg.body || world.contacts[c].b === egg.body) { hit = true; break; } }
                egg.time += dt;
                if (hit || egg.time > 3) { explode(egg.body.position.x, egg.body.position.y, 145, 1.7e6, 220); world.remove(egg.body); egg = null; }
            }
            if (state === 'flying') {
                flyT += dt;
                var allDone = activeBirds.length === 0;
                for (var k = 0; k < activeBirds.length; k++) {
                    var bd = activeBirds[k];
                    if (bd.done) continue;
                    if (bd.body.staticBody) continue;
                    var sp = len(bd.body.velocity);
                    if (sp < 50) bd.lowT += dt; else bd.lowT = 0;
                    var p = bd.body.position;
                    if (p.x < -90 || p.x > WORLD_W + 90 || p.y > WORLD_H + 160) bd.done = true;
                    if (bd.lowT > 0.7) bd.done = true;
                }
                allDone = activeBirds.every(function (b) { return b.done; });
                if (activePigs() === 0) { win(); }
                else if (allDone || flyT > 9) { resolveBirds(); }
            }
        }
        updateParticles(dt);
    }

    function resolveBirds() {
        activeBirds.forEach(function (b) { if (world.bodies.indexOf(b.body) >= 0) world.remove(b.body); });
        activeBirds = [];
        if (egg) { if (world.bodies.indexOf(egg.body) >= 0) world.remove(egg.body); egg = null; }
        if (activePigs() === 0) { win(); return; }
        if (birdIdx >= birdQueue.length) { lose(); return; }
        spawnNextBird();
    }

    function win() {
        if (state === 'won' || state === 'lost') return;
        state = 'won';
        var remaining = birdQueue.length - birdIdx;
        var stars = starsFor(remaining);
        score += remaining * 500;
        updateHUD();
        if (levelIndex + 1 >= prog.unlocked) prog.unlocked = Math.min(LEVELS.length, levelIndex + 2);
        if (!prog.stars[levelIndex] || prog.stars[levelIndex] < stars) prog.stars[levelIndex] = stars;
        saveProg();
        sfx.win();
        showOverlay('过关！', stars, '得分 <b>' + score + '</b>', levelIndex < LEVELS.length - 1);
    }
    function lose() {
        if (state === 'won' || state === 'lost') return;
        state = 'lost';
        sfx.lose();
        showOverlay('失败', 0, '还剩 <b>' + activePigs() + '</b> 只猪 · 得分 ' + score, false);
    }

    function showOverlay(title, stars, text, showNext) {
        ovTitle.textContent = title;
        var s = '';
        for (var i = 1; i <= 3; i++) s += '<span class="star' + (i <= stars ? ' on' : '') + '">★</span>';
        ovStars.innerHTML = s;
        ovText.innerHTML = text;
        ovNext.style.display = showNext ? '' : 'none';
        overlay.classList.remove('hidden');
    }

    function startLevel(i) {
        levelIndex = i;
        var spec = LEVELS[i];
        blocks = []; pigs = []; activeBirds = []; egg = null; particles = []; shocks = [];
        score = 0; dragging = false; flyT = 0;
        buildWorld(spec);
        birdQueue = spec.birds.slice();
        birdIdx = 0;
        currentBird = null;
        state = 'aiming';
        spawnNextBird();
        updateHUD();
    }

    function buildMenu() {
        menuGrid.textContent = '';
        for (var i = 0; i < LEVELS.length; i++) {
            (function (idx) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'mlevel' + (idx + 1 > prog.unlocked ? ' locked' : '');
                var st = prog.stars[idx] || 0, s = '';
                for (var k = 1; k <= 3; k++) s += '<span class="star' + (k <= st ? ' on' : '') + '">★</span>';
                b.innerHTML = '<b>' + LEVELS[idx].name + '</b><span class="ms">' + s + '</span>';
                if (idx + 1 <= prog.unlocked) b.addEventListener('click', function () { hideMenu(); startLevel(idx); });
                menuGrid.appendChild(b);
            })(i);
        }
    }
    function showMenu() { buildMenu(); menuEl.classList.remove('hidden'); }
    function hideMenu() { menuEl.classList.add('hidden'); }

    // ---- render ----
    function render() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, '#bfe4ff'); g.addColorStop(0.7, '#e8f6ff'); g.addColorStop(1, '#d6f0e0');
        ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);

        ctx.fillStyle = '#7cc36a'; ctx.fillRect(-3000, GROUND_Y, 9000, 12);
        ctx.fillStyle = '#b98a52'; ctx.fillRect(-3000, GROUND_Y + 12, 9000, WORLD_H);

        // slingshot
        ctx.strokeStyle = '#6b4526'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(SLING.x, GROUND_Y); ctx.lineTo(SLING.x, SLING.y + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 30); ctx.lineTo(SLING.x - 18, SLING.y - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 30); ctx.lineTo(SLING.x + 18, SLING.y - 6); ctx.stroke();

        if (currentBird && state === 'aiming') {
            var bp = dragging ? dragPos : V(SLING.x, SLING.y);
            ctx.strokeStyle = '#3b2a19'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(SLING.x - 18, SLING.y - 6); ctx.lineTo(bp.x, bp.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(SLING.x + 18, SLING.y - 6); ctx.lineTo(bp.x, bp.y); ctx.stroke();
        }

        if (currentBird && state === 'aiming' && dragging) {
            var v = mul(sub(SLING, dragPos), MAX_SPEED / MAX_STRETCH);
            var p = V(dragPos.x, dragPos.y), sdt = 1 / 40;
            ctx.fillStyle = 'rgba(40,70,110,0.35)';
            for (var i = 0; i < 70; i++) {
                p = add(p, mul(v, sdt)); v = add(v, mul(V(0, 1650), sdt));
                if (p.y > GROUND_Y) break;
                if (i % 3 === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
            }
        }

        for (var k = 0; k < blocks.length; k++) if (!blocks[k].dead) drawBox(blocks[k]);
        for (var q = 0; q < pigs.length; q++) if (!pigs[q].dead) drawPig(pigs[q]);
        if (egg) drawEgg(egg.body.position);

        activeBirds.forEach(function (b) { if (!b.done) drawBird(b.body.position, b.body.angle, b.type); });
        if (currentBird && state === 'aiming') {
            var pos = dragging ? dragPos : V(SLING.x, SLING.y);
            drawBird(pos, 0, currentBird.type);
        }

        for (var s = 0; s < shocks.length; s++) {
            var sh = shocks[s];
            ctx.globalAlpha = Math.max(0, sh.t / sh.life) * 0.5;
            ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, 7); ctx.stroke();
            ctx.globalAlpha = 1;
        }
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
        ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
        ctx.fillStyle = m.color; ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);
        ctx.strokeStyle = m.dark; ctx.lineWidth = 3; ctx.strokeRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h);
        if (bl.mat === 'glass') {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-bl.w / 2 + 4, -bl.h / 2 + 4); ctx.lineTo(bl.w / 2 - 4, bl.h / 2 - 4); ctx.stroke();
        }
        if (bl.flash > 0) { ctx.globalAlpha = bl.flash * 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h); ctx.globalAlpha = 1; }
        ctx.restore();
    }
    function drawPig(pig) {
        var b = pig.body;
        ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
        ctx.fillStyle = '#7ec850'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#4f972c'; ctx.stroke();
        ctx.fillStyle = '#8fd35f'; ctx.beginPath(); ctx.arc(0, 4, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#3f7a22'; ctx.beginPath(); ctx.arc(-3, 4, 1.8, 0, 7); ctx.arc(3, 4, 1.8, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -6, 4, 0, 7); ctx.arc(6, -6, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-5, -6, 1.8, 0, 7); ctx.arc(7, -6, 1.8, 0, 7); ctx.fill();
        if (pig.flash > 0) { ctx.globalAlpha = pig.flash * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.restore();
    }
    function drawEgg(pos) {
        ctx.save(); ctx.translate(pos.x, pos.y);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    function drawBird(pos, angle, type) {
        var t = BIRD_TYPES[type];
        ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(angle);
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.arc(0, 0, t.r, 0, 7); ctx.fill();
        ctx.strokeStyle = t.dark; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-t.r * 0.28, -t.r * 0.3, t.r * 0.3, 0, 7); ctx.arc(t.r * 0.28, -t.r * 0.3, t.r * 0.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-t.r * 0.2, -t.r * 0.3, t.r * 0.12, 0, 7); ctx.arc(t.r * 0.34, -t.r * 0.3, t.r * 0.12, 0, 7); ctx.fill();
        ctx.fillStyle = '#f6b73c';
        ctx.beginPath(); ctx.moveTo(t.r * 0.2, 0); ctx.lineTo(t.r * 1.1, t.r * 0.22); ctx.lineTo(t.r * 0.2, t.r * 0.5); ctx.closePath(); ctx.fill();
        if (type === 'black') { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -t.r); ctx.lineTo(2, -t.r - 7); ctx.stroke(); ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.arc(2, -t.r - 8, 3, 0, 7); ctx.fill(); }
        ctx.restore();
    }

    function loop(t) {
        if (!lastT) lastT = t;
        var dt = Math.min((t - lastT) / 1000, 1 / 30);
        lastT = t;
        var steps = 2, h = dt / steps;
        for (var i = 0; i < steps; i++) step(h);
        for (var k = 0; k < blocks.length; k++) if (blocks[k].flash > 0) blocks[k].flash = Math.max(0, blocks[k].flash - dt * 3);
        for (var q = 0; q < pigs.length; q++) if (pigs[q].flash > 0) pigs[q].flash = Math.max(0, pigs[q].flash - dt * 3);
        render();
        requestAnimationFrame(loop);
    }

    // ---- input ----
    function clampDrag(p) {
        var d = sub(p, V(SLING.x, SLING.y)); var l = len(d);
        if (l > MAX_STRETCH) d = mul(d, MAX_STRETCH / l);
        return add(V(SLING.x, SLING.y), d);
    }
    function onDown(e) {
        if (state === 'aiming' && currentBird) {
            var c = clientXY(e);
            var p = toWorld(c.x, c.y);
            if (len(sub(p, V(SLING.x, SLING.y))) > MAX_STRETCH + 90) return;
            dragging = true; dragPos = clampDrag(p);
            if (e.pointerId !== undefined && canvas.setPointerCapture) {
                try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
            }
            if (e.preventDefault) e.preventDefault();
        } else if (state === 'flying') {
            triggerAbility();
            if (e.preventDefault) e.preventDefault();
        }
    }
    function onMove(e) {
        if (!dragging) return;
        var c = clientXY(e);
        dragPos = clampDrag(toWorld(c.x, c.y));
        if (e.preventDefault) e.preventDefault();
    }
    function onUp() {
        if (!dragging) return;
        dragging = false;
        if (len(sub(dragPos, V(SLING.x, SLING.y))) < 12) { dragPos = V(SLING.x, SLING.y); return; }
        launch(mul(sub(SLING, dragPos), MAX_SPEED / MAX_STRETCH));
    }

    var lastTouchTs = 0;
    function markTouch() { lastTouchTs = Date.now(); }
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    canvas.addEventListener('touchstart', function (e) { markTouch(); onDown(e); }, { passive: false });
    window.addEventListener('touchmove', function (e) { markTouch(); onMove(e); }, { passive: false });
    window.addEventListener('touchend', function (e) { markTouch(); onUp(); });
    window.addEventListener('touchcancel', function (e) { markTouch(); onUp(); });
    canvas.addEventListener('mousedown', function (e) { if (Date.now() - lastTouchTs < 800) return; onDown(e); });
    window.addEventListener('mousemove', function (e) { if (Date.now() - lastTouchTs < 800) return; onMove(e); });
    window.addEventListener('mouseup', function (e) { if (Date.now() - lastTouchTs < 800) return; onUp(); });
    window.addEventListener('resize', resize);
    restartBtn.addEventListener('click', function () { startLevel(levelIndex); });
    ovRestart.addEventListener('click', function () { overlay.classList.add('hidden'); startLevel(levelIndex); });
    ovNext.addEventListener('click', function () { overlay.classList.add('hidden'); startLevel(Math.min(LEVELS.length - 1, levelIndex + 1)); });
    ovMenu.addEventListener('click', function () { overlay.classList.add('hidden'); showMenu(); });
    menuBtn.addEventListener('click', showMenu);
    menuClose.addEventListener('click', hideMenu);
    soundBtn.addEventListener('click', function () {
        soundOn = !soundOn;
        soundBtn.classList.toggle('active', soundOn);
        soundBtn.textContent = soundOn ? '音效' : '静音';
    });

    loadProg();
    resize();
    startLevel(Math.min(prog.unlocked - 1, LEVELS.length - 1));
    requestAnimationFrame(loop);
})();
