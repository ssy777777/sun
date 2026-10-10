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
        // 沙漠之鹰（Q版手枪）
        '<svg viewBox="0 0 150 190">' +
        '<g stroke="#20242c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
        '<rect x="52" y="18" width="46" height="86" rx="16" fill="#5ad1c8"/>' +
        '<rect x="63" y="30" width="12" height="60" rx="6" fill="#9ff2ea" stroke="none" opacity=".75"/>' +
        '<rect x="60" y="4" width="30" height="22" rx="11" fill="#3a4048"/>' +
        '<rect x="44" y="96" width="62" height="34" rx="15" fill="#3f4650"/>' +
        '<path d="M56 126 L98 126 L108 182 Q78 198 60 182 Z" fill="#2a2f37"/>' +
        '<rect x="62" y="134" width="30" height="8" rx="4" fill="#5ad1c8" stroke="none"/>' +
        '</g>' +
        '<ellipse cx="80" cy="176" rx="27" ry="17" fill="#e6b17e" stroke="#20242c" stroke-width="4"/>' +
        '</svg>',
        // AWM 狙击枪（Q版）
        '<svg viewBox="0 0 150 230">' +
        '<g stroke="#20242c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
        '<rect x="66" y="8" width="20" height="120" rx="9" fill="#7cc36a"/>' +
        '<rect x="72" y="18" width="8" height="100" rx="4" fill="#c4f0a8" stroke="none" opacity=".6"/>' +
        '<rect x="56" y="10" width="40" height="18" rx="9" fill="#3a4048"/>' +
        '<rect x="52" y="60" width="48" height="22" rx="11" fill="#3a4048"/>' +
        '<circle cx="76" cy="50" r="18" fill="#3a4048"/>' +
        '<circle cx="76" cy="50" r="12" fill="#9fe0ff"/>' +
        '<circle cx="71" cy="46" r="4" fill="#ffffff" stroke="none"/>' +
        '<rect x="48" y="118" width="56" height="58" rx="18" fill="#5aa64a"/>' +
        '<rect x="58" y="130" width="36" height="10" rx="5" fill="#c4f0a8" stroke="none" opacity=".5"/>' +
        '<path d="M54 170 L98 170 L110 222 L62 222 Z" fill="#3f7a35"/>' +
        '</g>' +
        '<ellipse cx="86" cy="210" rx="28" ry="17" fill="#e6b17e" stroke="#20242c" stroke-width="4"/>' +
        '</svg>',
        // 黄金巴祖卡（Q版火箭筒）
        '<svg viewBox="0 0 170 230">' +
        '<g stroke="#20242c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
        '<path d="M66 6 L104 6 L96 48 L74 48 Z" fill="#ffcf3a"/>' +
        '<rect x="58" y="44" width="54" height="140" rx="26" fill="#7fae5b"/>' +
        '<rect x="70" y="54" width="14" height="120" rx="7" fill="#c6e6a5" stroke="none" opacity=".5"/>' +
        '<rect x="50" y="86" width="70" height="16" rx="8" fill="#3a4048"/>' +
        '<rect x="68" y="64" width="34" height="18" rx="6" fill="#2f4a24"/>' +
        '<rect x="62" y="166" width="44" height="40" rx="12" fill="#3a4048"/>' +
        '<rect x="72" y="178" width="24" height="10" rx="5" fill="#ffcf3a" stroke="none"/>' +
        '</g>' +
        '<ellipse cx="84" cy="206" rx="30" ry="18" fill="#e6b17e" stroke="#20242c" stroke-width="4"/>' +
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
        el.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
        var fig = document.createElement('div');
        fig.className = 'fig';
        fig.innerHTML = '<div class="head"></div><div class="torso"></div>' +
            '<div class="arm l"></div><div class="arm r"></div>' +
            '<div class="leg l"></div><div class="leg r"></div>';
        el.appendChild(fig);

        var covered = level >= 2 && Math.random() < Math.min(0.12 + level * 0.06, 0.45);
        if (covered) {
            var cov = document.createElement('div');
            cov.className = 'cover';
            el.appendChild(cov);
        }
        fieldEl.appendChild(el);

        var e = {
            el: el,
            size: size,
            x: 0, y: 0,
            hp: 2,
            alive: true,
            vx: 0,
            cover: covered,
            hcx: 0, hcy: 0, hr: size * 0.23,
            bcx: 0, bcy: 0, br: size * 0.32
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
        e.hcy = e.y + e.size * 0.23;
        e.bcx = e.x + e.size / 2;
        e.bcy = e.y + e.size * 0.60;
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
                    // 有掩体的敌人，身体被挡住：打在掩体上不造成伤害
                    if (e2.cover && fy > e2.y + e2.size * 0.44) continue;
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

    function setScope(px, py) {
        scopeEl.style.left = px + 'px';
        scopeEl.style.top = py + 'px';
        sceneEl.style.setProperty('--ax', px + 'px');
        sceneEl.style.setProperty('--ay', py + 'px');
    }

    // 放大镜以手指为中心：手指移到哪，就能看清哪里；可移动手指看全整个场景
    function applyZoom(px, py) {
        var s = WEAPONS[weaponIdx].zoom;
        fieldEl.style.transform = 'translate(' + (px * (1 - s)).toFixed(1) + 'px,' +
            (py * (1 - s)).toFixed(1) + 'px) scale(' + s + ')';
    }

    function startAim(e) {
        if (!running || levelEnding) return;
        aiming = true;
        sceneEl.classList.add('aiming');
        var p = pointerScene(e);
        aimX = p.x; aimY = p.y;
        setScope(p.x, p.y);
        applyZoom(p.x, p.y);
    }

    function moveAim(e) {
        if (!aiming) return;
        var p = pointerScene(e);
        aimX = p.x; aimY = p.y;
        setScope(p.x, p.y);
        applyZoom(p.x, p.y);
    }

    function endAim(e) {
        if (!aiming) return;
        aiming = false;
        sceneEl.classList.remove('aiming');
        fieldEl.style.transform = '';
        var p = pointerScene(e);
        fire(p.x, p.y);
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
