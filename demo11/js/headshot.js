(function () {
    'use strict';

    var WEAPONS = [
        { id: 'deagle', name: '沙漠之鹰', tip: '爆头一击', zoom: 1.18, dmg: 1, explosive: false, radius: 0, unlock: 1 },
        { id: 'awm', name: 'AWM 狙击枪', tip: '身体秒杀', zoom: 1.5, dmg: 2, explosive: false, radius: 0, unlock: 3 },
        { id: 'bazooka', name: '黄金巴祖卡', tip: '范围爆破', zoom: 1.3, dmg: 3, explosive: true, radius: 100, unlock: 6 }
    ];

    var sceneEl = document.getElementById('scene');
    var fieldEl = document.getElementById('field');
    var scopeEl = document.getElementById('scope');
    var bannerEl = document.getElementById('banner');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovActions = document.getElementById('ov-actions');
    var levelEl = document.getElementById('level');
    var lblLv = document.getElementById('lbl-lv');
    var scoreEl = document.getElementById('score');
    var hsEl = document.getElementById('hs');
    var timeEl = document.getElementById('time');
    var bestEl = document.getElementById('best');
    var bestUnit = document.getElementById('best-unit');
    var weaponsEl = document.getElementById('weapons');
    var gunEl = document.getElementById('gun');
    var infoEl = document.getElementById('info');
    var menuBtn = document.getElementById('menu');

    var GUN_SVG = [
        // 沙漠之鹰（手枪）
        '<svg viewBox="0 0 120 170">' +
        '<rect x="46" y="8" width="28" height="78" rx="7" fill="#3b4657"/>' +
        '<rect x="50" y="12" width="9" height="66" rx="4" fill="#4c5768"/>' +
        '<rect x="54" y="2" width="12" height="8" rx="2" fill="#1c2129"/>' +
        '<rect x="40" y="82" width="40" height="24" rx="7" fill="#2f3846"/>' +
        '<path d="M47 104 L73 104 L80 156 L54 156 Z" fill="#242b36"/>' +
        '<rect x="44" y="86" width="32" height="4" rx="2" fill="#525d70"/>' +
        '</svg>',
        // AWM 狙击枪
        '<svg viewBox="0 0 120 190">' +
        '<rect x="55" y="2" width="10" height="96" rx="3" fill="#39424f"/>' +
        '<rect x="49" y="44" width="22" height="12" rx="4" fill="#2a313c"/>' +
        '<circle cx="60" cy="40" r="8" fill="#3a4553"/>' +
        '<circle cx="60" cy="40" r="4" fill="#10151c"/>' +
        '<rect x="42" y="92" width="36" height="46" rx="8" fill="#2c3644"/>' +
        '<path d="M46 132 L74 132 L80 182 L52 182 Z" fill="#222a34"/>' +
        '<rect x="50" y="98" width="20" height="5" rx="2" fill="#4a5666"/>' +
        '</svg>',
        // 黄金巴祖卡（火箭筒）
        '<svg viewBox="0 0 140 200">' +
        '<rect x="46" y="30" width="48" height="120" rx="16" fill="#4a5540"/>' +
        '<path d="M58 6 L82 6 L76 32 L64 32 Z" fill="#e0a828"/>' +
        '<rect x="38" y="118" width="64" height="18" rx="8" fill="#2a3226"/>' +
        '<rect x="52" y="132" width="36" height="26" rx="6" fill="#2f3829"/>' +
        '<rect x="40" y="66" width="60" height="6" rx="3" fill="#8a6412"/>' +
        '</svg>'
    ];

    var W = 0, H = 0;
    var mode = 'level';
    var running = false;
    var levelEnding = false;
    var level = 1;
    var score = 0;
    var headshots = 0;
    var kills = 0;
    var timeLeft = 0;
    var ammo = 0;
    var enemies = [];
    var barrels = [];
    var weaponIdx = 0;
    var bestLevel = 1;
    var bestScore = 0;
    var spawnTimer = 0;
    var lastTime = 0;
    var bannerTimer = null;

    var aiming = false;
    var aimX = 0, aimY = 0;
    var audioCtx = null;

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function beep(freq, dur, type, vol, delay) {
        var ac = getAudio();
        if (!ac) return;
        var t0 = ac.currentTime + (delay || 0);
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(vol || 0.05, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
    }

    function sndShot() { beep(150, 0.09, 'square', 0.06); beep(90, 0.12, 'sawtooth', 0.05, 0.02); }
    function sndHead() { beep(900, 0.08, 'sine', 0.08); beep(1350, 0.12, 'sine', 0.06, 0.05); }
    function sndBoom() { beep(70, 0.35, 'sawtooth', 0.09); beep(50, 0.4, 'square', 0.06, 0.03); }

    function loadBest() {
        try {
            bestLevel = parseInt(localStorage.getItem('headshot-best-level') || '1', 10) || 1;
            bestScore = parseInt(localStorage.getItem('headshot-best-score') || '0', 10) || 0;
        } catch (e) {
            bestLevel = 1; bestScore = 0;
        }
        updateBestDisplay();
    }

    function saveBest() {
        try {
            localStorage.setItem('headshot-best-level', String(bestLevel));
            localStorage.setItem('headshot-best-score', String(bestScore));
        } catch (e) { /* ignore */ }
    }

    function updateBestDisplay() {
        if (mode === 'endless') {
            bestEl.textContent = bestScore;
            bestUnit.textContent = ' 分';
        } else {
            bestEl.textContent = bestLevel;
            bestUnit.textContent = ' 关';
        }
    }

    function updateHud() {
        levelEl.textContent = mode === 'endless' ? '∞' : level;
        scoreEl.textContent = score;
        hsEl.textContent = headshots;
        timeEl.textContent = running || levelEnding ? Math.max(0, Math.ceil(timeLeft)) : '--';
        if (mode === 'level') {
            infoEl.textContent = '第 ' + level + ' 关 · 剩余弹药 ' + ammo + ' · 目标 ' + aliveEnemies();
        } else {
            infoEl.textContent = '无尽模式 · 击杀 ' + kills;
        }
    }

    function measure() {
        W = sceneEl.clientWidth;
        H = sceneEl.clientHeight;
        sceneEl.style.setProperty('--ax', (W / 2) + 'px');
        sceneEl.style.setProperty('--ay', (H / 2) + 'px');
    }

    function aliveEnemies() {
        var n = 0;
        for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) n++;
        return n;
    }

    function clearField() {
        fieldEl.textContent = '';
        enemies = [];
        barrels = [];
    }

    // ---------- 敌人 / 爆炸桶 ----------
    function makeEnemy() {
        var maxS = Math.max(58, 96 - level * 4);
        var minS = Math.max(40, maxS - 26);
        var size = Math.round(minS + Math.random() * (maxS - minS));
        var el = document.createElement('div');
        el.className = 'enemy';
        el.style.left = '0';
        el.style.top = '0';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        var fig = document.createElement('div');
        fig.className = 'fig';
        fig.innerHTML = '<div class="head"></div><div class="torso"></div>' +
            '<div class="arm l"></div><div class="arm r"></div>' +
            '<div class="leg l"></div><div class="leg r"></div>';
        el.appendChild(fig);
        fieldEl.appendChild(el);

        var e = {
            el: el,
            size: size,
            x: 0, y: 0,
            hp: 2,
            alive: true,
            vx: 0,
            hcx: 0, hcy: 0, hr: size * 0.15,
            bcx: 0, bcy: 0, br: size * 0.36
        };
        e.x = 8 + Math.random() * (W - size - 16);
        e.y = 30 + Math.random() * (H - size - 80);
        if (level >= 2 && Math.random() < Math.min(0.2 + level * 0.08, 0.7)) {
            e.vx = (Math.random() < 0.5 ? -1 : 1) * (22 + level * 5);
        }
        placeEnemy(e);
        enemies.push(e);
        return e;
    }

    function placeEnemy(e) {
        e.el.style.transform = 'translate(' + e.x + 'px,' + e.y + 'px)';
        e.hcx = e.x + e.size / 2;
        e.hcy = e.y + e.size * 0.15;
        e.bcx = e.x + e.size / 2;
        e.bcy = e.y + e.size * 0.55;
    }

    function makeBarrel() {
        var el = document.createElement('div');
        el.className = 'barrel';
        el.style.left = '0';
        el.style.top = '0';
        fieldEl.appendChild(el);
        var b = { el: el, x: 0, y: 0, w: 34, h: 44, alive: true };
        b.x = 20 + Math.random() * (W - 60);
        b.y = 40 + Math.random() * (H - 120);
        el.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px)';
        b.cx = b.x + 17;
        b.cy = b.y + 22;
        barrels.push(b);
        return b;
    }

    function showPop(x, y, text, cls) {
        var p = document.createElement('div');
        p.className = 'pop' + (cls ? ' ' + cls : '');
        p.textContent = text;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        fieldEl.appendChild(p);
        setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 700);
    }

    function killEnemy(e, headshot, byBoom) {
        if (!e.alive) return;
        e.alive = false;
        e.el.classList.add('dead');
        setTimeout(function () { if (e.el.parentNode) e.el.parentNode.removeChild(e.el); }, 280);
        kills++;
        if (headshot) {
            headshots++;
            score += 120;
            showPop(e.hcx, e.hcy, '爆头 +120', 'head');
            sndHead();
        } else {
            score += byBoom ? 60 : 40;
            showPop(e.bcx, e.bcy, (byBoom ? '炸死 ' : '击杀 ') + '+' + (byBoom ? 60 : 40), '');
        }
        if (mode === 'endless') timeLeft += headshot ? 2.5 : 1.5;
        updateHud();
    }

    function explode(x, y, radius) {
        var boom = document.createElement('div');
        boom.className = 'boom';
        boom.style.left = x + 'px';
        boom.style.top = y + 'px';
        boom.style.width = radius * 2 + 'px';
        boom.style.height = radius * 2 + 'px';
        fieldEl.appendChild(boom);
        setTimeout(function () { if (boom.parentNode) boom.parentNode.removeChild(boom); }, 500);
        sndBoom();

        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (!e.alive) continue;
            var d = Math.hypot(e.bcx - x, e.bcy - y);
            if (d <= radius + e.br * 0.5) killEnemy(e, false, true);
        }
        for (var j = 0; j < barrels.length; j++) {
            var b = barrels[j];
            if (!b.alive) continue;
            var bd = Math.hypot(b.cx - x, b.cy - y);
            if (bd <= radius + 10) {
                b.alive = false;
                b.el.classList.add('dead');
                (function (bx, by) {
                    setTimeout(function () { explode(bx, by, radius); }, 130);
                })(b.cx, b.cy);
            }
        }
    }

    // ---------- 射击 ----------
    function fire(fx, fy) {
        if (!running || levelEnding) return;
        var wpn = WEAPONS[weaponIdx];
        sndShot();
        gunEl.classList.remove('recoil');
        void gunEl.offsetWidth;
        gunEl.classList.add('recoil');
        if (mode === 'level') ammo--;

        if (wpn.explosive) {
            var before = kills;
            explode(fx, fy, wpn.radius);
            if (kills === before) missPenalty();
        } else {
            var hit = null;
            for (var i = enemies.length - 1; i >= 0; i--) {
                var e = enemies[i];
                if (!e.alive) continue;
                if (Math.hypot(e.hcx - fx, e.hcy - fy) <= e.hr + 2) { killEnemy(e, true); hit = 'head'; break; }
            }
            if (!hit) {
                for (var k = enemies.length - 1; k >= 0; k--) {
                    var e2 = enemies[k];
                    if (!e2.alive) continue;
                    if (Math.hypot(e2.bcx - fx, e2.bcy - fy) <= e2.br) {
                        e2.hp -= wpn.dmg;
                        e2.el.classList.add('body-hit');
                        setTimeout(function () { e2.el.classList.remove('body-hit'); }, 200);
                        if (e2.hp <= 0) { killEnemy(e2, false, false); }
                        else { score += 15; updateHud(); }
                        hit = 'body';
                        break;
                    }
                }
            }
            if (!hit) {
                for (var m = 0; m < barrels.length; m++) {
                    var b = barrels[m];
                    if (b.alive && Math.hypot(b.cx - fx, b.cy - fy) <= 26) {
                        b.alive = false;
                        b.el.classList.add('dead');
                        explode(b.cx, b.cy, 105);
                        hit = 'barrel';
                        break;
                    }
                }
            }
            if (!hit) missPenalty();
        }

        updateHud();
        if (mode === 'level' && aliveEnemies() === 0) { levelClear(); }
        else if (mode === 'level' && ammo <= 0) { gameOver('弹药耗尽'); }
        else if (mode === 'endless' && timeLeft <= 0) { gameOver('时间耗尽'); }
    }

    function missPenalty() {
        if (mode === 'endless') timeLeft -= 2.5;
    }

    // ---------- 关卡流程 ----------
    function startMode(m) {
        mode = m;
        loadBest();
        clearField();
        score = 0;
        headshots = 0;
        kills = 0;
        weaponIdx = firstUnlocked();
        overlay.classList.add('hidden');
        buildWeapons();
        if (mode === 'level') {
            level = 1;
            startLevel();
        } else {
            level = 1;
            timeLeft = 30;
            spawnTimer = 0.3;
            running = true;
            levelEnding = false;
            startSpawns();
            showBanner('无尽模式', 1200);
        }
        updateHud();
    }

    function levelTime(lv) { return Math.max(14, 30 - lv); }
    function levelCount(lv) { return Math.min(3 + lv, 10); }

    function startLevel() {
        clearField();
        measure();
        var count = levelCount(level);
        ammo = count + 3;
        timeLeft = levelTime(level);
        running = true;
        levelEnding = false;
        spawnTimer = 0;

        for (var i = 0; i < count; i++) makeEnemy();
        var bn = Math.min(1 + Math.floor(level / 2), 3);
        for (var j = 0; j < bn; j++) makeBarrel();

        showBanner('第 ' + level + ' 关 · 消灭全部目标', 1300);
        updateHud();
    }

    function levelClear() {
        running = false;
        levelEnding = true;
        if (level > bestLevel) { bestLevel = level; saveBest(); }
        updateBestDisplay();
        showBanner('第 ' + level + ' 关 完成！', 1300);
        level++;
        levelEnding = true;
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(function () {
            if (mode === 'level') startLevel();
        }, 1400);
        running = false;
    }

    function startSpawns() {
        for (var i = 0; i < 3; i++) makeEnemy();
        makeBarrel();
    }

    function gameOver(reason) {
        running = false;
        levelEnding = false;
        if (mode === 'level') {
            if (level - 1 > bestLevel) { bestLevel = level - 1; saveBest(); }
        } else {
            if (score > bestScore) { bestScore = score; saveBest(); }
        }
        updateBestDisplay();
        ovTitle.textContent = '任务失败';
        ovText.innerHTML = (reason ? reason + '　' : '') +
            '得分 <b>' + score + '</b> · 爆头 <b>' + headshots + '</b>' +
            (mode === 'level' ? ' · 到达 <b>第 ' + level + ' 关</b>' : ' · 击杀 <b>' + kills + '</b>');
        showActions([
            { text: '重新开始', primary: true, fn: function () { overlay.classList.add('hidden'); startMode(mode); } },
            { text: '菜单', fn: showMenu }
        ]);
        overlay.classList.remove('hidden');
        updateHud();
    }

    // ---------- 主循环 ----------
    function loop(time) {
        var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        if (running) {
            timeLeft -= dt;
            if (mode === 'endless') {
                spawnTimer -= dt;
                var interval = Math.max(0.5, 1.8 - kills * 0.02);
                if (spawnTimer <= 0) {
                    spawnTimer = interval;
                    makeEnemy();
                    if (Math.random() < 0.15 && barrels.length < 4) makeBarrel();
                }
            }
            for (var i = 0; i < enemies.length; i++) {
                var e = enemies[i];
                if (!e.alive || !e.vx) continue;
                e.x += e.vx * dt;
                if (e.x < 8) { e.x = 8; e.vx = Math.abs(e.vx); }
                if (e.x > W - e.size - 8) { e.x = W - e.size - 8; e.vx = -Math.abs(e.vx); }
                placeEnemy(e);
            }
            updateHud();
            if (timeLeft <= 0) {
                timeLeft = 0;
                gameOver(mode === 'level' ? '时间耗尽' : '时间耗尽');
                return;
            }
        }
        requestAnimationFrame(loop);
    }

    // ---------- 瞄准 / 射击输入 ----------
    function pointerScene(e) {
        var r = sceneEl.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function aimToField(px, py, s) {
        return {
            x: (px - W / 2) / s + W / 2,
            y: (py - H / 2) / s + H / 2
        };
    }

    function startAim(e) {
        if (!running || levelEnding) return;
        aiming = true;
        sceneEl.classList.add('aiming');
        var p = pointerScene(e);
        aimX = p.x; aimY = p.y;
        scopeEl.style.left = p.x + 'px';
        scopeEl.style.top = p.y + 'px';
        sceneEl.style.setProperty('--ax', p.x + 'px');
        sceneEl.style.setProperty('--ay', p.y + 'px');
        fieldEl.style.transform = 'scale(' + WEAPONS[weaponIdx].zoom + ')';
    }

    function moveAim(e) {
        if (!aiming) return;
        var p = pointerScene(e);
        aimX = p.x; aimY = p.y;
        scopeEl.style.left = p.x + 'px';
        scopeEl.style.top = p.y + 'px';
        sceneEl.style.setProperty('--ax', p.x + 'px');
        sceneEl.style.setProperty('--ay', p.y + 'px');
    }

    function endAim(e) {
        if (!aiming) return;
        aiming = false;
        sceneEl.classList.remove('aiming');
        fieldEl.style.transform = 'scale(1)';
        var p = pointerScene(e);
        var f = aimToField(p.x, p.y, WEAPONS[weaponIdx].zoom);
        fire(f.x, f.y);
    }

    // ---------- UI ----------
    function showBanner(text, hold) {
        bannerEl.textContent = text;
        bannerEl.classList.add('show');
        clearTimeout(bannerTimer);
        if (hold) bannerTimer = setTimeout(function () { bannerEl.classList.remove('show'); }, hold);
    }

    function firstUnlocked() {
        var idx = 0;
        for (var i = WEAPONS.length - 1; i >= 0; i--) {
            if (bestLevel >= WEAPONS[i].unlock) { idx = i; break; }
        }
        return idx;
    }

    function buildWeapons() {
        weaponsEl.textContent = '';
        for (var i = 0; i < WEAPONS.length; i++) {
            (function (idx) {
                var w = WEAPONS[idx];
                var locked = bestLevel < w.unlock;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'wpn' + (idx === weaponIdx ? ' active' : '') + (locked ? ' locked' : '');
                b.innerHTML = '<span>' + w.name + '</span><small>' + (locked ? '第 ' + w.unlock + ' 关解锁' : w.tip) + '</small>';
                if (!locked) {
                    b.addEventListener('click', function () {
                        weaponIdx = idx;
                        buildWeapons();
                    });
                }
                weaponsEl.appendChild(b);
            })(i);
        }
        applyGun();
    }

    function applyGun() {
        gunEl.innerHTML = GUN_SVG[weaponIdx] || '';
    }

    function showActions(list) {
        ovActions.textContent = '';
        for (var i = 0; i < list.length; i++) {
            (function (item) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = item.primary ? 'primary' : 'act';
                b.textContent = item.text;
                b.addEventListener('click', item.fn);
                ovActions.appendChild(b);
            })(list[i]);
        }
    }

    function showMenu() {
        running = false;
        levelEnding = false;
        clearField();
        showBanner('选择模式开始任务', 0);
        ovTitle.textContent = '枪枪爆头';
        ovText.innerHTML = '第一人称狙击暗杀。长按屏幕瞄准，松手开枪；<b>命中头部一击必杀</b>，可引爆爆炸桶连锁清场。';
        mode = 'level';
        updateBestDisplay();
        buildWeapons();
        showActions([
            { text: '关卡模式', primary: true, fn: function () { startMode('level'); } },
            { text: '无尽模式', fn: function () { startMode('endless'); } }
        ]);
        overlay.classList.remove('hidden');
        updateHud();
    }

    // ---------- 事件绑定 ----------
    sceneEl.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        sceneEl.setPointerCapture && sceneEl.setPointerCapture(e.pointerId);
        startAim(e);
    });
    sceneEl.addEventListener('pointermove', function (e) {
        if (aiming) { e.preventDefault(); moveAim(e); }
    });
    sceneEl.addEventListener('pointerup', function (e) {
        endAim(e);
    });
    sceneEl.addEventListener('pointercancel', function () { aiming = false; sceneEl.classList.remove('aiming'); fieldEl.style.transform = 'scale(1)'; });
    sceneEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    menuBtn.addEventListener('click', showMenu);
    window.addEventListener('resize', function () { measure(); });

    measure();
    loadBest();
    buildWeapons();
    showMenu();
    requestAnimationFrame(loop);
})();
