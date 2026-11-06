/* 账号页：显示登录状态 / 改昵称 / 退出 / 我的排行榜成绩 */
(function () {
    'use strict';

    var AUTH = window.SunAuth;
    var CLOUD = window.SunCloud;

    var setupCard = document.getElementById('setup');
    var guestCard = document.getElementById('guest');
    var memberCard = document.getElementById('member');
    var scoresCard = document.getElementById('scores');

    var avatarEl = document.getElementById('avatar');
    var nameEl = document.getElementById('me-name');
    var emailEl = document.getElementById('me-email');
    var nameInput = document.getElementById('name-input');
    var hintEl = document.getElementById('me-hint');
    var scoreList = document.getElementById('score-list');
    var seatEl = document.getElementById('me-seat');

    var GAME_HREF = { '2048': '../demo3/', tetris: '../demo2/', jump: '../demo19/' };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function show(el, on) {
        if (!el) return;
        el.classList.toggle('hide', !on);
    }

    function render() {
        if (!AUTH || !AUTH.enabled) {
            show(setupCard, true);
            show(guestCard, false);
            show(memberCard, false);
            show(scoresCard, false);
            return;
        }

        show(setupCard, false);
        var u = AUTH.user;
        show(guestCard, !u);
        show(memberCard, !!u);
        show(scoresCard, !!u);
        if (!u) return;

        var n = AUTH.displayName();
        nameEl.textContent = n || '玩家';
        emailEl.textContent = u.email || '';
        avatarEl.textContent = (n || '?').slice(0, 1).toUpperCase();
        if (document.activeElement !== nameInput) nameInput.value = n || '';
        loadSeat();
        loadScores();
    }

    /* 注册序号：只给本人看；前 100 位算创始玩家 */
    function loadSeat() {
        if (!CLOUD || !CLOUD.mySeq || !seatEl) return;
        CLOUD.mySeq().then(function (seq) {
            if (!seq) { seatEl.classList.remove('on'); return; }
            seatEl.innerHTML = seq <= 100
                ? '🏅 第 <b>' + seq + '</b> 位加入 · 创始玩家'
                : '第 <b>' + seq + '</b> 位加入';
            seatEl.classList.add('on');
        });
    }

    function loadScores() {
        if (!CLOUD || !CLOUD.mine) {
            scoreList.innerHTML = '<div class="empty">排行榜未启用</div>';
            return;
        }
        scoreList.innerHTML = '<div class="empty">加载中…</div>';
        CLOUD.mine().then(function (rows) {
            if (!rows || !rows.length) {
                scoreList.innerHTML = '<div class="empty">还没有成绩，去玩一局吧</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i];
                var href = GAME_HREF[r.game] || '../';
                html += '<a class="score-row" href="' + href + '">' +
                    '<span class="g">' + esc(CLOUD.gameName ? CLOUD.gameName(r.game) : r.game) + '</span>' +
                    '<b>' + (r.score | 0) + '</b>' +
                    '</a>';
            }
            scoreList.innerHTML = html;
        }).catch(function (e) {
            scoreList.innerHTML = '<div class="empty">加载失败：' + esc(e.message) + '</div>';
        });
    }

    /* ---------- 事件 ---------- */
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
            if (AUTH) AUTH.open();
        });
    }

    document.getElementById('save-name').addEventListener('click', function () {
        var n = nameInput.value.trim();
        if (!n) { hintEl.textContent = '昵称不能为空'; return; }
        hintEl.textContent = '保存中…';
        AUTH.updateName(n).then(function () {
            hintEl.textContent = '已保存';
            if (CLOUD && CLOUD.syncName) CLOUD.syncName();
            setTimeout(function () { hintEl.textContent = ''; }, 2200);
        }).catch(function (e) {
            hintEl.textContent = '保存失败：' + e.message;
        });
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
        hintEl.textContent = '';
        AUTH.logout();
    });

    /* ---------- 启动 ---------- */
    if (!AUTH) {
        show(setupCard, true);
        return;
    }
    AUTH.ready.then(render);
    AUTH.onChange(render);
})();
