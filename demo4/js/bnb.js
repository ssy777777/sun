(function () {
    'use strict';

    var COLS = 15;
    var ROWS = 13;
    var TS = 40;
    var W = COLS * TS;
    var H = ROWS * TS;

    var EMPTY = 0;
    var WALL = 1;
    var BRICK = 2;

    var BOMB_TIME = 2.2;
    var EXPLODE_TIME = 0.5;
    var SPEED_BASE = 96;
    var SPEED_STEP = 20;

    var DIRS = [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1]
    ];

    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var overlay = document.getElementById('overlay');
    var ovTitle = document.getElementById('ov-title');
    var ovText = document.getElementById('ov-text');
    var ovBtn = document.getElementById('ov-btn');
    var winsEl = document.getElementById('wins');
    var bombsEl = document.getElementById('p-bombs');
    var powerEl = document.getElementById('p-power');
    var speedEl = document.getElementById('p-speed');
    var bombBtn = document.getElementById('bomb-btn');
    var startScreen = document.getElementById('start-screen');
    var resultScreen = document.getElementById('result-screen');
    var diffSeg = document.getElementById('diff-seg');

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var map = [];
    var bombs = [];
    var explosions = [];
    var items = [];
    var entities = [];
    var player = null;
    var player2 = null;
    var bots = [];
    var state = 'ready';
    var mode = 'ai';
    var difficulty = 'hard';
    var wins = 0;
    var lastTime = 0;
    var pressed1 = [];
    var pressed2 = [];

    var DIFF = {
        easy: { think: 0.42, speed: 0.82, range: 1, mistake: 0.30, power: 0, bombs: 1, aggressive: false, hunter: false },
        hard: { think: 0.15, speed: 1.0, range: 2, mistake: 0.06, power: 0, bombs: 1, aggressive: false, hunter: false },
        nightmare: { think: 0.06, speed: 1.5, range: 6, mistake: 0, power: 2, bombs: 1, aggressive: true, hunter: true }
    };

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
        gain.gain.setValueAtTime(vol || 0.04, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
    }

    var sound = {
        place: function () { beep(300, 0.08, 'sine', 0.05); },
        boom: function () { beep(90, 0.25, 'sawtooth', 0.06); beep(60, 0.3, 'square', 0.04, 0.02); },
        item: function () { beep(660, 0.08, 'square', 0.05); beep(990, 0.1, 'square', 0.05, 0.07); },
        die: function () { [400, 300, 200, 120].forEach(function (f, i) { beep(f, 0.2, 'sawtooth', 0.05, i * 0.12); }); }
    };

    function tileOfX(x) { return Math.floor(x / TS); }
    function tileOfY(y) { return Math.floor(y / TS); }
    function centerX(tx) { return tx * TS + TS / 2; }
    function centerY(ty) { return ty * TS + TS / 2; }

    function tileAt(x, y) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return WALL;
        return map[y][x];
    }

    function spawnPoints() {
        return [
            { x: 1, y: 1 },
            { x: COLS - 2, y: ROWS - 2 },
            { x: COLS - 2, y: 1 },
            { x: 1, y: ROWS - 2 }
        ];
    }

    function nearSpawn(x, y) {
        var sp = spawnPoints();
        for (var i = 0; i < sp.length; i++) {
            if (Math.abs(x - sp[i].x) <= 1 && Math.abs(y - sp[i].y) <= 1) return true;
        }
        return false;
    }

    function generateMap() {
        map = [];
        for (var y = 0; y < ROWS; y++) {
            var row = [];
            for (var x = 0; x < COLS; x++) {
                if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) row.push(WALL);
                else if (x % 2 === 0 && y % 2 === 0) row.push(WALL);
                else row.push(EMPTY);
            }
            map.push(row);
        }
        for (var yy = 1; yy < ROWS - 1; yy++) {
            for (var xx = 1; xx < COLS - 1; xx++) {
                if (map[yy][xx] !== EMPTY) continue;
                if (nearSpawn(xx, yy)) continue;
                if (Math.random() < 0.68) map[yy][xx] = BRICK;
            }
        }
        ensureSpawnRoom();
    }

    function ensureSpawnRoom() {
        var sp = spawnPoints();
        var dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var i = 0; i < sp.length; i++) {
            for (var d = 0; d < dirs4.length; d++) {
                for (var step = 1; step <= 2; step++) {
                    var x = sp[i].x + dirs4[d][0] * step;
                    var y = sp[i].y + dirs4[d][1] * step;
                    if (x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1 && map[y][x] === BRICK) {
                        map[y][x] = EMPTY;
                    }
                }
            }
        }
    }

    function makeEntity(tx, ty, color, isAI) {
        return {
            tx: tx,
            ty: ty,
            x: centerX(tx),
            y: centerY(ty),
            color: color,
            isAI: !!isAI,
            alive: true,
            maxBombs: 1,
            activeBombs: 0,
            power: 1,
            speed: SPEED_BASE,
            speedLv: 1,
            anim: 0,
            aiTimer: 0,
            aiDir: null,
            thinkInterval: 0.15,
            bombRange: 2,
            mistake: 0,
            aggressive: false,
            hunter: false,
            fleeUntil: 0,
            fleeX: 0,
            fleeY: 0
        };
    }

    function reset() {
        bombs = [];
        explosions = [];
        items = [];
        generateMap();

        var sp = spawnPoints();
        player = makeEntity(sp[0].x, sp[0].y, '#4ade80', false);
        player2 = null;
        entities = [player];
        bots = [];

        if (mode === 'pvp') {
            player2 = makeEntity(sp[1].x, sp[1].y, '#60a5fa', false);
            entities.push(player2);
        } else {
            var diff = DIFF[difficulty] || DIFF.hard;
            var botColors = ['#fb7185', '#e879f9', '#fbbf24'];
            var botCount = Math.min(1 + Math.floor(wins / 2), 3);
            for (var i = 1; i <= botCount; i++) {
                var b = makeEntity(sp[i].x, sp[i].y, botColors[i - 1], true);
                b.speed = SPEED_BASE * diff.speed;
                b.power = 1 + diff.power;
                b.thinkInterval = diff.think;
                b.bombRange = diff.range;
                b.mistake = diff.mistake;
                b.maxBombs = diff.bombs;
                b.aggressive = diff.aggressive;
                b.hunter = diff.hunter;
                entities.push(b);
                bots.push(b);
            }
        }

        state = 'playing';
        hideOverlay();
        updateHud();
    }

    function updateHud() {
        winsEl.textContent = wins;
        bombsEl.textContent = player.maxBombs;
        powerEl.textContent = player.power;
        speedEl.textContent = player.speedLv;
    }

    function bombAt(tx, ty) {
        for (var i = 0; i < bombs.length; i++) {
            if (bombs[i].tx === tx && bombs[i].ty === ty) return true;
        }
        return false;
    }

    function placeBomb(e) {
        if (!e.alive || e.activeBombs >= e.maxBombs) return false;
        var tx = tileOfX(e.x);
        var ty = tileOfY(e.y);
        if (bombAt(tx, ty)) return false;
        bombs.push({ tx: tx, ty: ty, timer: BOMB_TIME, power: e.power, owner: e, born: performance.now() });
        e.activeBombs++;
        sound.place();
        return true;
    }

    function addExplosion(tx, ty) {
        explosions.push({ tx: tx, ty: ty, timer: EXPLODE_TIME });
    }

    function maybeItem(tx, ty) {
        if (Math.random() < 0.34) {
            var types = ['bomb', 'fire', 'speed'];
            items.push({ tx: tx, ty: ty, type: types[Math.floor(Math.random() * types.length)] });
        }
    }

    function explodeBomb(bm) {
        addExplosion(bm.tx, bm.ty);
        for (var d = 0; d < DIRS.length; d++) {
            for (var i = 1; i <= bm.power; i++) {
                var tx = bm.tx + DIRS[d][1] * i;
                var ty = bm.ty + DIRS[d][2] * i;
                var m = tileAt(tx, ty);
                if (m === WALL) break;
                if (m === BRICK) {
                    map[ty][tx] = EMPTY;
                    maybeItem(tx, ty);
                    addExplosion(tx, ty);
                    break;
                }
                addExplosion(tx, ty);
            }
        }
        if (bm.owner) bm.owner.activeBombs = Math.max(0, bm.owner.activeBombs - 1);
        sound.boom();
    }

    function canMove(e, nx, ny) {
        var half = TS * 0.34;
        var x0 = Math.floor((nx - half) / TS);
        var x1 = Math.floor((nx + half) / TS);
        var y0 = Math.floor((ny - half) / TS);
        var y1 = Math.floor((ny + half) / TS);
        for (var y = y0; y <= y1; y++) {
            for (var x = x0; x <= x1; x++) {
                if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
                var m = map[y][x];
                if (m === WALL || m === BRICK) return false;
                for (var b = 0; b < bombs.length; b++) {
                    var bm = bombs[b];
                    if (bm.tx === x && bm.ty === y) {
                        if (bm.owner !== e || !rectOverlap(e, bm)) return false;
                    }
                }
            }
        }
        return true;
    }

    function rectOverlap(e, bm) {
        var half = TS * 0.34;
        var bl = bm.tx * TS;
        var bt = bm.ty * TS;
        return (e.x + half > bl) && (e.x - half < bl + TS) &&
            (e.y + half > bt) && (e.y - half < bt + TS);
    }

    function nearestCenter(v) {
        return Math.round((v - TS / 2) / TS) * TS + TS / 2;
    }

    function moveEntity(e, dir, dt) {
        var info = null;
        for (var i = 0; i < DIRS.length; i++) {
            if (DIRS[i][0] === dir) info = DIRS[i];
        }
        if (!info) return;
        var d = e.speed * dt;
        var vertical = info[2] !== 0;

        if (vertical) {
            var cX = nearestCenter(e.x);
            var offX = cX - e.x;
            if (Math.abs(offX) > 0.6) {
                var ax = offX > 0 ? Math.min(offX, d) : Math.max(offX, -d);
                if (canMove(e, e.x + ax, e.y)) e.x += ax;
                return;
            }
            e.x = cX;
            if (canMove(e, e.x, e.y + info[2] * d)) e.y += info[2] * d;
        } else {
            var cY = nearestCenter(e.y);
            var offY = cY - e.y;
            if (Math.abs(offY) > 0.6) {
                var ay = offY > 0 ? Math.min(offY, d) : Math.max(offY, -d);
                if (canMove(e, e.x, e.y + ay)) e.y += ay;
                return;
            }
            e.y = cY;
            if (canMove(e, e.x + info[1] * d, e.y)) e.x += info[1] * d;
        }
    }

    function inputDir(list) {
        return list.length ? list[list.length - 1] : null;
    }

    function updatePlayer(dt) {
        if (!player.alive) return;
        var dir = inputDir(pressed1);
        if (dir) moveEntity(player, dir, dt);
    }

    function updatePlayer2(dt) {
        if (!player2 || !player2.alive) return;
        var dir = inputDir(pressed2);
        if (dir) moveEntity(player2, dir, dt);
    }

    function computeDanger() {
        var d = [];
        for (var y = 0; y < ROWS; y++) {
            var row = [];
            for (var x = 0; x < COLS; x++) row.push(false);
            d.push(row);
        }
        for (var e = 0; e < explosions.length; e++) d[explosions[e].ty][explosions[e].tx] = true;
        for (var b = 0; b < bombs.length; b++) {
            var bm = bombs[b];
            d[bm.ty][bm.tx] = true;
            for (var k = 0; k < DIRS.length; k++) {
                for (var i = 1; i <= bm.power; i++) {
                    var tx = bm.tx + DIRS[k][1] * i;
                    var ty = bm.ty + DIRS[k][2] * i;
                    var m = tileAt(tx, ty);
                    if (m === WALL) break;
                    d[ty][tx] = true;
                    if (m === BRICK) break;
                }
            }
        }
        return d;
    }

    function bombDangerAt(tx, ty, power, danger) {
        var d = danger.map(function (row) { return row.slice(); });
        d[ty][tx] = true;
        for (var k = 0; k < DIRS.length; k++) {
            for (var i = 1; i <= power; i++) {
                var x = tx + DIRS[k][1] * i;
                var y = ty + DIRS[k][2] * i;
                var m = tileAt(x, y);
                if (m === WALL) break;
                d[y][x] = true;
                if (m === BRICK) break;
            }
        }
        return d;
    }

    function walkable(x, y) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
        if (map[y][x] !== EMPTY) return false;
        return !bombAt(x, y);
    }

    function findStep(sx, sy, isGoal, avoidDanger, danger) {
        var visited = {};
        visited[sx + ',' + sy] = true;
        var queue = [{ x: sx, y: sy, first: null }];
        while (queue.length) {
            var cur = queue.shift();
            for (var k = 0; k < DIRS.length; k++) {
                var nx = cur.x + DIRS[k][1];
                var ny = cur.y + DIRS[k][2];
                if (!walkable(nx, ny)) continue;
                if (visited[nx + ',' + ny]) continue;
                if (avoidDanger && danger[ny][nx]) continue;
                visited[nx + ',' + ny] = true;
                var first = cur.first || DIRS[k][0];
                if (isGoal(nx, ny)) return { dir: first, x: nx, y: ny };
                queue.push({ x: nx, y: ny, first: first });
            }
        }
        return null;
    }

    function hasItemAt(x, y) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].tx === x && items[i].ty === y) return true;
        }
        return false;
    }

    function bestDigSpot(sx, sy, ptx, pty) {
        var seen = {};
        seen[sx + ',' + sy] = true;
        var queue = [{ x: sx, y: sy }];
        var bestBrick = null;
        var bestBrickD = Infinity;
        var bestAny = null;
        var bestAnyD = Infinity;
        while (queue.length) {
            var c = queue.shift();
            var dist = Math.abs(c.x - ptx) + Math.abs(c.y - pty);
            if (dist < bestAnyD) { bestAnyD = dist; bestAny = { x: c.x, y: c.y }; }
            for (var k = 0; k < DIRS.length; k++) {
                if (tileAt(c.x + DIRS[k][1], c.y + DIRS[k][2]) === BRICK) {
                    if (dist < bestBrickD) { bestBrickD = dist; bestBrick = { x: c.x, y: c.y }; }
                    break;
                }
            }
            for (var j = 0; j < DIRS.length; j++) {
                var nx = c.x + DIRS[j][1];
                var ny = c.y + DIRS[j][2];
                if (!walkable(nx, ny) || seen[nx + ',' + ny]) continue;
                seen[nx + ',' + ny] = true;
                queue.push({ x: nx, y: ny });
            }
        }
        return bestBrick || bestAny;
    }

    function computeAiDir(e) {
        var danger = computeDanger();
        var ex = tileOfX(e.x);
        var ey = tileOfY(e.y);

        // 放下炸弹后进入"逃跑"状态：直奔安全点，期间不做别的
        if (e.fleeUntil > performance.now()) {
            if (!danger[ey][ex]) {
                e.fleeUntil = 0;
            } else {
                var fleeGoal = function (x, y) { return x === e.fleeX && y === e.fleeY; };
                var fs = findStep(ex, ey, fleeGoal, false, danger);
                if (fs) return fs.dir;
                var anySafe = findStep(ex, ey, function (x, y) { return !danger[y][x]; }, false, danger);
                return anySafe ? anySafe.dir : null;
            }
        }

        if (danger[ey][ex]) {
            var safe = function (x, y) { return !danger[y][x]; };
            var step = findStep(ex, ey, safe, true, danger) || findStep(ex, ey, safe, false, danger);
            if (step) return step.dir;
            return null;
        }

        // 非"凶猛"难度：场上还有炸弹/爆炸时先老实待着（避免自爆）
        if (!e.aggressive && (bombs.length > 0 || explosions.length > 0)) {
            return null;
        }

        // 低难度会偶尔"犯傻"，随机走一步
        if (e.mistake && Math.random() < e.mistake) {
            var choices = [];
            for (var m = 0; m < DIRS.length; m++) {
                if (canMove(e, e.x + DIRS[m][1] * 12, e.y + DIRS[m][2] * 12)) choices.push(DIRS[m][0]);
            }
            if (choices.length) return choices[Math.floor(Math.random() * choices.length)];
        }

        var adjBrick = false;
        for (var k = 0; k < DIRS.length; k++) {
            if (tileAt(ex + DIRS[k][1], ey + DIRS[k][2]) === BRICK) { adjBrick = true; break; }
        }
        var ptx = tileOfX(player.x);
        var pty = tileOfY(player.y);
        var pdist = Math.abs(ex - ptx) + Math.abs(ey - pty);

        // 预判玩家走位（按当前移动方向提前一格）
        var predX = ptx;
        var predY = pty;
        var pdir = inputDir(pressed1);
        if (pdir === 'left') predX -= 1;
        else if (pdir === 'right') predX += 1;
        else if (pdir === 'up') predY -= 1;
        else if (pdir === 'down') predY += 1;
        if (predX < 0 || predY < 0 || predX >= COLS || predY >= ROWS || tileAt(predX, predY) !== EMPTY) {
            predX = ptx;
            predY = pty;
        }

        // 与玩家（或其预判位置）同一行/列、中间无阻挡且在威力范围内 → 直接放泡命中
        var alignedShot = function (tx, ty) {
            if (!(ex === tx || ey === ty)) return false;
            var ddx = tx === ex ? 0 : (tx > ex ? 1 : -1);
            var ddy = ty === ey ? 0 : (ty > ey ? 1 : -1);
            var dist = Math.abs(tx - ex) + Math.abs(ty - ey);
            if (dist === 0 || dist > e.power) return false;
            for (var s = 1; s <= dist; s++) {
                if (tileAt(ex + ddx * s, ey + ddy * s) !== EMPTY) return false;
            }
            return true;
        };
        var alignedClear = alignedShot(ptx, pty) || alignedShot(predX, predY);

        if (bombs.length === 0 && explosions.length === 0 && e.activeBombs < e.maxBombs &&
            (adjBrick || pdist <= (e.bombRange || 2) || alignedClear)) {
            var d2 = bombDangerAt(ex, ey, e.power, danger);
            // 允许沿着爆炸范围冲出去（在爆炸前逃离）
            var escape = findStep(ex, ey, function (x, y) { return !d2[y][x]; }, false, d2);
            if (escape) {
                placeBomb(e);
                e.fleeUntil = performance.now() + 1600;
                e.fleeX = escape.x;
                e.fleeY = escape.y;
                return escape.dir;
            }
        }

        var chase = function (x, y) { return x === ptx && y === pty; };

        if (items.length) {
            var goal = function (x, y) { return hasItemAt(x, y); };
            var s1 = findStep(ex, ey, goal, true, danger);
            if (s1) return s1.dir;
        }

        // 猎手难度：优先直接追击玩家（而非先挖箱子）
        if (e.hunter) {
            var s2 = findStep(ex, ey, chase, true, danger);
            if (s2) return s2.dir;
        }

        // 朝向玩家方向的、紧挨箱子的落脚点，炸开箱子开路
        var spot = bestDigSpot(ex, ey, ptx, pty);
        if (spot && !(spot.x === ex && spot.y === ey)) {
            var toSpot = function (x, y) { return x === spot.x && y === spot.y; };
            var s3 = findStep(ex, ey, toSpot, true, danger);
            if (s3) return s3.dir;
        }

        var s2b = findStep(ex, ey, chase, true, danger);
        if (s2b) return s2b.dir;

        // 兜底：场上安全时随机走一步，避免原地卡死
        if (bombs.length === 0 && explosions.length === 0) {
            var opts = [];
            for (var q = 0; q < DIRS.length; q++) {
                if (canMove(e, e.x + DIRS[q][1] * 12, e.y + DIRS[q][2] * 12)) opts.push(DIRS[q][0]);
            }
            if (opts.length) return opts[Math.floor(Math.random() * opts.length)];
        }
        return null;
    }

    function updateBots(dt) {
        for (var i = 0; i < bots.length; i++) {
            var e = bots[i];
            if (!e.alive) continue;
            e.aiTimer -= dt;
            if (e.aiTimer <= 0) {
                e.aiTimer = e.thinkInterval || 0.15;
                e.aiDir = computeAiDir(e);
            }
            if (e.aiDir) moveEntity(e, e.aiDir, dt);
        }
    }

    function pickupItems() {
        for (var i = 0; i < entities.length; i++) {
            var e = entities[i];
            if (!e.alive) continue;
            var ex = tileOfX(e.x);
            var ey = tileOfY(e.y);
            for (var j = items.length - 1; j >= 0; j--) {
                if (items[j].tx === ex && items[j].ty === ey) {
                    var type = items[j].type;
                    if (type === 'bomb') e.maxBombs++;
                    else if (type === 'fire') e.power++;
                    else if (type === 'speed') { e.speedLv++; e.speed += SPEED_STEP; }
                    items.splice(j, 1);
                    sound.item();
                    if (e === player) updateHud();
                }
            }
        }
    }

    function checkDeaths() {
        for (var i = 0; i < entities.length; i++) {
            var e = entities[i];
            if (!e.alive) continue;
            var ex = tileOfX(e.x);
            var ey = tileOfY(e.y);
            for (var j = 0; j < explosions.length; j++) {
                if (explosions[j].tx === ex && explosions[j].ty === ey) {
                    e.alive = false;
                    if (e === player) sound.die();
                    break;
                }
            }
        }
    }

    function aliveBots() {
        var n = 0;
        for (var i = 0; i < bots.length; i++) if (bots[i].alive) n++;
        return n;
    }

    function update(dt) {
        if (state !== 'playing') return;
        updatePlayer(dt);
        if (mode === 'pvp') updatePlayer2(dt);
        else updateBots(dt);

        for (var i = bombs.length - 1; i >= 0; i--) {
            bombs[i].timer -= dt;
            if (bombs[i].timer <= 0) {
                explodeBomb(bombs[i]);
                bombs.splice(i, 1);
            }
        }
        for (var j = explosions.length - 1; j >= 0; j--) {
            explosions[j].timer -= dt;
            if (explosions[j].timer <= 0) explosions.splice(j, 1);
        }

        pickupItems();
        checkDeaths();

        if (mode === 'pvp') {
            var p1 = player.alive;
            var p2 = player2 && player2.alive;
            if (!p1 || !p2) {
                state = 'over';
                var msg = (!p1 && !p2) ? '同时出局，平局！' : (!p2 ? '玩家1 获胜！' : '玩家2 获胜！');
                showResult('本局结束', msg, '再来一局', function () { reset(); });
            }
        } else {
            if (!player.alive) {
                state = 'over';
                showResult('被炸到了！', '本局失败，连胜 ' + wins, '重新开始', function () { wins = 0; reset(); });
            } else if (aliveBots() === 0) {
                state = 'over';
                wins++;
                showResult('胜利！', surp(wins), '下一局', function () { reset(); });
            }
        }
    }

    function surp(n) {
        return '干得漂亮，连胜 ' + n;
    }

    // ---------- 渲染 ----------
    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function drawFloor() {
        for (var y = 0; y < ROWS; y++) {
            for (var x = 0; x < COLS; x++) {
                var m = map[y][x];
                var px = x * TS;
                var py = y * TS;
                if (m === WALL) {
                    ctx.fillStyle = '#0d1729';
                    ctx.fillRect(px, py, TS, TS);
                    ctx.fillStyle = '#25375c';
                    ctx.fillRect(px + 3, py + 3, TS - 6, TS - 8);
                    ctx.fillStyle = '#4a6aa0';
                    ctx.fillRect(px + 3, py + 3, TS - 6, 4);
                    ctx.fillStyle = '#0a1120';
                    ctx.fillRect(px + 3, py + TS - 7, TS - 6, 4);
                } else if (m === BRICK) {
                    ctx.fillStyle = '#9c5a34';
                    ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
                    ctx.fillStyle = '#d69a67';
                    ctx.fillRect(px + 4, py + 4, TS - 8, (TS - 10) / 2);
                    ctx.fillRect(px + 4, py + TS / 2 + 1, TS - 8, (TS - 10) / 2);
                    ctx.strokeStyle = 'rgba(40, 20, 8, 0.55)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 2, py + 2, TS - 4, TS - 4);
                } else {
                    ctx.fillStyle = ((x + y) % 2 === 0) ? '#3a78bd' : '#3571b3';
                    ctx.fillRect(px, py, TS, TS);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                    ctx.fillRect(px, py, TS, 1);
                }
            }
        }
    }

    function drawBombs() {
        var t = performance.now() / 1000;
        for (var i = 0; i < bombs.length; i++) {
            var b = bombs[i];
            var cx = centerX(b.tx);
            var cy = centerY(b.ty);
            var pulse = 1 + Math.sin(t * 10 + i) * 0.08;
            var r = TS * 0.34 * pulse;
            var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
            g.addColorStop(0, '#c9f6ff');
            g.addColorStop(0.6, '#38bdf8');
            g.addColorStop(1, '#0e7490');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath();
            ctx.arc(cx - r * 0.32, cy - r * 0.36, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawExplosions() {
        for (var i = 0; i < explosions.length; i++) {
            var ex = explosions[i];
            var a = Math.max(0, ex.timer / EXPLODE_TIME);
            ctx.save();
            ctx.globalAlpha = 0.35 + a * 0.55;
            var px = ex.tx * TS;
            var py = ex.ty * TS;
            var g = ctx.createRadialGradient(px + TS / 2, py + TS / 2, 3, px + TS / 2, py + TS / 2, TS * 0.7);
            g.addColorStop(0, '#e0fbff');
            g.addColorStop(0.5, '#67e8f9');
            g.addColorStop(1, 'rgba(34,211,238,0.15)');
            ctx.fillStyle = g;
            roundRect(ctx, px + 1, py + 1, TS - 2, TS - 2, 8);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawItems() {
        var t = performance.now() / 1000;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var px = it.tx * TS;
            var py = it.ty * TS;
            var bob = Math.sin(t * 4 + i) * 2;
            ctx.save();
            ctx.translate(px + TS / 2, py + TS / 2 + bob);
            var col = it.type === 'bomb' ? '#38bdf8' : it.type === 'fire' ? '#fb923c' : '#a3e635';
            ctx.fillStyle = col;
            roundRect(ctx, -TS * 0.3, -TS * 0.3, TS * 0.6, TS * 0.6, 8);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 'bold ' + (TS * 0.36) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(it.type === 'bomb' ? 'B' : it.type === 'fire' ? 'F' : 'S', 0, 1);
            ctx.restore();
        }
    }

    function drawEntity(e) {
        if (!e.alive) return;
        var cx = e.x;
        var cy = e.y + Math.sin(e.anim * 8) * 1.5;
        var r = TS * 0.36;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, e.y + r * 0.85, r * 0.8, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fill();
        ctx.fillStyle = e.color;
        roundRect(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.7);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        roundRect(ctx, cx - r * 0.7, cy - r * 0.78, r * 1.4, r * 0.7, r * 0.5);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#0a1a30';
        ctx.beginPath();
        ctx.arc(cx - r * 0.35, cy + r * 0.05, r * 0.16, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.35, cy + r * 0.05, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        // 小帽（区分玩家/AI）
        ctx.fillStyle = e.isAI ? '#0f172a' : '#ffffff';
        roundRect(ctx, cx - r * 0.9, cy - r * 0.95, r * 1.8, r * 0.5, r * 0.3);
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawFloor();
        drawItems();
        drawBombs();
        drawExplosions();
        for (var i = 0; i < entities.length; i++) drawEntity(entities[i]);
    }

    function loop(time) {
        var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = time;
        for (var i = 0; i < entities.length; i++) entities[i].anim += dt;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    // ---------- 交互 ----------
    function addPressed(list, d) {
        if (list.indexOf(d) < 0) list.push(d);
    }

    function removePressed(list, d) {
        var i = list.indexOf(d);
        if (i >= 0) list.splice(i, 1);
    }

    function showStart() {
        state = 'ready';
        startScreen.classList.remove('hidden');
        resultScreen.classList.add('hidden');
        overlay.classList.remove('hidden');
    }

    function showResult(title, text, btn, fn) {
        ovTitle.textContent = title;
        ovText.textContent = text;
        ovBtn.textContent = btn;
        ovBtn.onclick = fn;
        startScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
    }

    function bindKeyboard() {
        var p1keys = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'
        };
        var p2keys = {
            a: 'left', A: 'left', d: 'right', D: 'right',
            w: 'up', W: 'up', s: 'down', S: 'down'
        };
        window.addEventListener('keydown', function (e) {
            var k = e.key;
            var handled = false;
            if (p1keys[k]) { addPressed(pressed1, p1keys[k]); handled = true; }
            if (p2keys[k]) {
                if (mode === 'pvp') addPressed(pressed2, p2keys[k]);
                else addPressed(pressed1, p2keys[k]);
                handled = true;
            }
            if (handled) { e.preventDefault(); return; }

            if (k === ' ' || k === 'Enter' || k === 'j' || k === 'J') {
                e.preventDefault();
                if (!e.repeat && state === 'playing') placeBomb(player);
            } else if (mode === 'pvp' && (k === 'f' || k === 'F')) {
                e.preventDefault();
                if (!e.repeat && state === 'playing' && player2) placeBomb(player2);
            }
        });
        window.addEventListener('keyup', function (e) {
            var k = e.key;
            if (p1keys[k]) removePressed(pressed1, p1keys[k]);
            if (p2keys[k]) { removePressed(pressed1, p2keys[k]); removePressed(pressed2, p2keys[k]); }
        });
    }

    function bindTouch() {
        var btns = document.querySelectorAll('.dbtn');
        Array.prototype.forEach.call(btns, function (btn) {
            var dir = btn.getAttribute('data-dir');
            function down(e) { e.preventDefault(); addPressed(pressed1, dir); }
            function up() { removePressed(pressed1, dir); }
            btn.addEventListener('pointerdown', down);
            btn.addEventListener('pointerup', up);
            btn.addEventListener('pointerleave', up);
            btn.addEventListener('pointercancel', up);
            btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
            btn.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
        });
        bombBtn.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            if (state === 'playing') placeBomb(player);
        });
        bombBtn.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    }

    function bindStartScreen() {
        diffSeg.addEventListener('click', function (e) {
            var btn = e.target;
            if (!btn || !btn.getAttribute || !btn.getAttribute('data-diff')) return;
            difficulty = btn.getAttribute('data-diff');
            var all = diffSeg.querySelectorAll('.seg-btn');
            Array.prototype.forEach.call(all, function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
        var modeBtns = document.querySelectorAll('[data-mode]');
        Array.prototype.forEach.call(modeBtns, function (btn) {
            btn.addEventListener('click', function () {
                mode = btn.getAttribute('data-mode');
                wins = 0;
                getAudio();
                reset();
            });
        });
    }

    function layout() {
        var hud = document.querySelector('.hud');
        var controls = document.querySelector('.controls');
        var hudH = hud ? hud.offsetHeight : 0;
        var ctrlH = controls ? controls.offsetHeight : 0;
        var availW = window.innerWidth - 24;
        var availH = window.innerHeight - 24 - hudH - ctrlH - 26;
        var scale = Math.min(availW / W, availH / H);
        if (scale > 1.6) scale = 1.6;
        if (scale < 0.3) scale = 0.3;
        canvas.style.width = Math.round(W * scale) + 'px';
        canvas.style.height = Math.round(H * scale) + 'px';
    }

    bindKeyboard();
    bindTouch();
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    generateMap();
    player = makeEntity(spawnPoints()[0].x, spawnPoints()[0].y, '#4ade80', false);
    entities = [player];
    bindStartScreen();
    layout();
    requestAnimationFrame(loop);
    showStart();
})();
