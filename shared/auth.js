/* ============================================================
 * 共用账号（Supabase Auth）—— 纯原生 fetch，无任何依赖
 * ------------------------------------------------------------
 * 引入顺序（三个共用脚本都要）：
 *   <script src="../shared/cloud-config.js"></script>
 *   <script src="../shared/auth.js"></script>
 *   <script src="../shared/cloud.js"></script>
 *
 * 对外接口：
 *   SunAuth.enabled            // 是否已配置
 *   SunAuth.ready              // Promise，会话恢复完成后 resolve
 *   SunAuth.user               // 当前登录用户（null = 游客）
 *   SunAuth.onChange(fn)       // 登录 / 退出 / 改昵称时回调
 *   SunAuth.open()             // 打开登录弹层（已登录则显示账号面板）
 *   SunAuth.login(email, pwd)  SunAuth.signup(email, pwd)
 *   SunAuth.logout()
 *   SunAuth.token()            // Promise<string|null>，自动刷新过期 token
 *   SunAuth.updateName(name)   // 改昵称（存进账户 metadata，跨设备同步）
 *   SunAuth.displayName()
 *
 * 说明：密码只发给 Supabase，本站不保存密码；
 *      会话（access/refresh token）存在 localStorage，登出即清除。
 * ============================================================ */
(function () {
    'use strict';

    var CFG = window.SUN_CLOUD || {};
    var API = String(CFG.url || '').replace(/\/+$/, '');
    var ANON = String(CFG.anonKey || '');
    var ENABLED = !!(API && ANON);
    var BASE = API + '/auth/v1';
    var SESSION_KEY = 'sun-auth-session';
    var REFRESH_AHEAD = 60 * 1000;      // 提前 1 分钟刷新

    var session = null;                 // { access_token, refresh_token, expires_at, user }
    var user = null;
    var readyResolve;
    var ready = new Promise(function (r) { readyResolve = r; });
    var listeners = [];

    /* ================= 基础 ================= */
    function emit() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](user); } catch (e) { /* ignore */ }
        }
    }
    function persist() {
        try {
            if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* ignore */ }
    }
    function applyAuth(data) {
        if (!data || !data.access_token) return null;
        session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || (session && session.refresh_token) || null,
            expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
            user: data.user || (session && session.user) || null
        };
        user = session.user;
        persist();
        emit();
        return session;
    }
    function clearSession() {
        session = null;
        user = null;
        persist();
        emit();
    }

    /* ================= 错误提示 ================= */
    var ZH = [
        ['invalid login credentials', '邮箱或密码不正确'],
        ['email not confirmed', '邮箱还没验证，请先去邮箱点确认链接'],
        ['user already registered', '这个邮箱已经注册过了，直接登录即可'],
        ['password should be at least 6 characters', '密码至少 6 位'],
        ['new password should be different', '新密码不能和旧密码一样'],
        ['unable to validate email address', '邮箱格式不正确'],
        ['email address is invalid', '邮箱格式不正确'],
        ['signup is disabled', '站点关闭了注册'],
        ['email signups are disabled', '站点关闭了邮箱注册'],
        ['rate limit', '操作太频繁，请过一会儿再试'],
        ['for security purposes', '操作太频繁，请过一会儿再试'],
        ['token has expired', '登录已过期，请重新登录'],
        ['invalid refresh token', '登录已过期，请重新登录'],
        ['user not found', '账号不存在']
    ];
    function zh(raw) {
        var s = String(raw || '');
        var low = s.toLowerCase();
        for (var i = 0; i < ZH.length; i++) {
            if (low.indexOf(ZH[i][0]) >= 0) return ZH[i][1];
        }
        return s || '请求失败';
    }
    function apiErr(msg) { var e = new Error(zh(msg)); e.api = true; return e; }

    /* ================= HTTP ================= */
    function call(method, path, body, tok) {
        var headers = {
            apikey: ANON,
            Authorization: 'Bearer ' + (tok || ANON),
            'Content-Type': 'application/json'
        };
        return fetch(BASE + path, {
            method: method,
            headers: headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        }).then(function (r) {
            return r.text().then(function (t) {
                var d = null;
                try { d = t ? JSON.parse(t) : null; } catch (e) { d = null; }
                if (!r.ok) {
                    var raw = (d && (d.msg || d.error_description || d.message || d.error_code || d.error)) || ('HTTP ' + r.status);
                    throw apiErr(raw);
                }
                return d;
            });
        }, function () {
            throw new Error('网络错误，请检查网络后重试');
        });
    }

    /* ================= 会话 ================= */
    function refresh() {
        if (!ENABLED || !session || !session.refresh_token) return Promise.resolve(null);
        return call('POST', '/token?grant_type=refresh_token', { refresh_token: session.refresh_token })
            .then(function (d) { return applyAuth(d); })
            .catch(function () { clearSession(); return null; });
    }

    function token() {
        if (!ENABLED) return Promise.resolve(null);
        return ready.then(function () {
            if (!session || !session.access_token) return null;
            if (session.expires_at - Date.now() > REFRESH_AHEAD) return session.access_token;
            return refresh().then(function (s) { return s ? s.access_token : null; });
        });
    }

    function init() {
        if (!ENABLED) { readyResolve(); return; }
        var raw = null;
        try { raw = localStorage.getItem(SESSION_KEY); } catch (e) { raw = null; }
        if (!raw) { readyResolve(); return; }
        try { session = JSON.parse(raw); } catch (e) { session = null; }
        if (!session || !session.access_token) { session = null; readyResolve(); return; }

        user = session.user || null;
        if (session.expires_at - Date.now() > REFRESH_AHEAD) {
            emit();
            readyResolve();
            return;
        }
        refresh().then(function () { readyResolve(); }, function () { readyResolve(); });
    }

    /* ================= 登录 / 注册 / 登出 ================= */
    function login(email, password) {
        if (!ENABLED) return Promise.reject(new Error('登录未配置'));
        return call('POST', '/token?grant_type=password', { email: email, password: password })
            .then(function (d) { applyAuth(d); return user; });
    }

    function signup(email, password) {
        if (!ENABLED) return Promise.reject(new Error('登录未配置'));
        return call('POST', '/signup', { email: email, password: password }).then(function (d) {
            if (d && d.access_token) { applyAuth(d); return { ok: true, session: true }; }
            if (d && d.session && d.session.access_token) { applyAuth(d.session); return { ok: true, session: true }; }
            // 开启了“邮箱验证”时，这里只拿到 user，需要用户去邮箱点确认
            return { ok: true, needConfirm: true };
        });
    }

    function logout() {
        var p = (session && session.access_token)
            ? call('POST', '/logout', {}, session.access_token).catch(function () {})
            : Promise.resolve();
        return p.then(function () { clearSession(); return true; });
    }

    function updateName(name) {
        name = String(name || '').replace(/[\s<>]/g, '').slice(0, 12);
        return token().then(function (t) {
            if (!t) throw new Error('未登录');
            return call('PUT', '/user', { data: { name: name } }, t);
        }).then(function (d) {
            if (d && d.id) {
                user = d;
                if (session) session.user = d;
                persist();
                emit();
            }
            return user;
        });
    }

    function displayName() {
        if (!user) return '';
        var meta = user.user_metadata || {};
        if (meta.name) return String(meta.name).slice(0, 12);
        if (user.email) return user.email.split('@')[0].slice(0, 12);
        return '玩家';
    }

    /* ================= 弹层 UI ================= */
    var CSS = [
        '.sa-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;',
        'background:rgba(12,20,34,.58);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);',
        'font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#21384f}',
        '.sa-card{width:100%;max-width:360px;max-height:88vh;overflow:auto;background:#fff;border-radius:16px;',
        'box-shadow:0 18px 50px rgba(10,25,45,.36)}',
        '.sa-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;',
        'background:linear-gradient(135deg,#6d8cff,#4a63e8);color:#fff}',
        '.sa-title{font-size:16px;font-weight:800;letter-spacing:1px}',
        '.sa-close{border:0;background:rgba(255,255,255,.24);color:#fff;width:28px;height:28px;border-radius:50%;',
        'font-size:15px;line-height:1;cursor:pointer;font-family:inherit}',
        '.sa-inner{padding:14px 16px 16px}',
        '.sa-tabs{display:flex;gap:8px;margin-bottom:14px}',
        '.sa-tabs button{flex:1;border:0;border-radius:9px;padding:9px 0;font-size:14px;font-weight:700;',
        'font-family:inherit;cursor:pointer;background:#eef3f8;color:#5c7a92}',
        '.sa-tabs button.on{background:#4a63e8;color:#fff}',
        '.sa-form label,.sa-name{display:block;font-size:12px;color:#7c93a8;margin-bottom:10px}',
        '.sa-form input,.sa-name input{display:block;width:100%;margin-top:5px;border:1px solid #d9e5ef;border-radius:9px;',
        'padding:10px 11px;font-size:14px;font-family:inherit;color:#21384f;outline:none;background:#fff}',
        '.sa-form input:focus,.sa-name input:focus{border-color:#6d8cff}',
        '.sa-btn{width:100%;border:0;border-radius:9px;padding:11px 0;font-size:14px;font-weight:700;',
        'font-family:inherit;cursor:pointer;background:#4a63e8;color:#fff}',
        '.sa-btn[disabled]{opacity:.6;cursor:default}',
        '.sa-btn.ghost{background:#eef3f8;color:#5c7a92}',
        '.sa-actions{display:flex;flex-direction:column;gap:8px;margin-top:4px}',
        '.sa-err{min-height:18px;font-size:12.5px;color:#d9534f;margin:2px 0 8px;line-height:1.5}',
        '.sa-err.ok{color:#1f9d63}',
        '.sa-tip{font-size:12px;line-height:1.7;color:#8aa0b4;margin-top:10px}',
        '.sa-tip code{background:#eef3f8;border-radius:5px;padding:1px 5px;font-size:11.5px}',
        '.sa-me{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
        '.sa-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6d8cff,#4a63e8);',
        'color:#fff;display:grid;place-items:center;font-size:18px;font-weight:800;flex-shrink:0}',
        '.sa-me-info{min-width:0}',
        '.sa-me-info b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.sa-me-info span{display:block;font-size:12px;color:#8aa0b4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.sa-steps{font-size:12.5px;line-height:1.9;color:#5c7a92}',
        '.sa-steps b{color:#4a63e8}'
    ].join('');

    function injectCss() {
        if (document.getElementById('sun-auth-css')) return;
        var s = document.createElement('style');
        s.id = 'sun-auth-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    var openEl = null;
    var keyHandler = null;
    function close() {
        if (openEl && openEl.parentNode) openEl.parentNode.removeChild(openEl);
        openEl = null;
        if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    }

    function open() {
        injectCss();
        close();

        var ov = document.createElement('div');
        ov.className = 'sa-overlay';
        ov.innerHTML =
            '<div class="sa-card">' +
                '<div class="sa-head">' +
                    '<span class="sa-title">账号</span>' +
                    '<button class="sa-close" type="button" aria-label="关闭">✕</button>' +
                '</div>' +
                '<div class="sa-inner"></div>' +
            '</div>';
        document.body.appendChild(ov);
        openEl = ov;

        ov.querySelector('.sa-close').addEventListener('click', close);
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        keyHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', keyHandler);

        if (!ENABLED) { renderSetup(ov); return; }
        if (user) renderAccount(ov); else renderForm(ov, 'login');
    }

    function renderSetup(ov) {
        ov.querySelector('.sa-inner').innerHTML =
            '<div class="sa-steps">' +
                '<b>登录还没配置</b><br>' +
                '① 在 <code>shared/cloud-config.js</code> 填 Supabase 的 <code>url</code> 和 <code>anonKey</code><br>' +
                '② 在 Supabase 控制台 <b>Authentication → Providers → Email</b> 打开邮箱登录<br>' +
                '③ 建议把 <b>Confirm email</b> 关掉（练习站没必要收验证邮件）<br>' +
                '④ 按 <code>排行榜接入.md</code> 第七节更新排行榜的行级安全策略' +
            '</div>' +
            '<button class="sa-btn ghost" type="button" style="margin-top:14px">知道了</button>';
        ov.querySelector('.sa-btn').addEventListener('click', close);
    }

    function renderForm(ov, mode) {
        var inner = ov.querySelector('.sa-inner');
        inner.innerHTML =
            '<div class="sa-tabs">' +
                '<button type="button" data-tab="login" class="' + (mode === 'login' ? 'on' : '') + '">登录</button>' +
                '<button type="button" data-tab="signup" class="' + (mode === 'signup' ? 'on' : '') + '">注册</button>' +
            '</div>' +
            '<form class="sa-form" autocomplete="on">' +
                '<label>邮箱<input type="email" autocomplete="email" placeholder="you@example.com"></label>' +
                '<label>密码<input type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="至少 6 位"></label>' +
                '<div class="sa-err"></div>' +
                '<button class="sa-btn" type="submit">' + (mode === 'login' ? '登录' : '注册') + '</button>' +
            '</form>' +
            '<p class="sa-tip">游客也能玩。登录后排行榜成绩可跨设备同步，昵称跟着账号走。密码由 Supabase 托管，本站不保存。</p>';

        var form = inner.querySelector('form');
        var err = inner.querySelector('.sa-err');
        var btn = inner.querySelector('.sa-btn');
        var inputs = inner.querySelectorAll('input');

        inner.querySelectorAll('.sa-tabs button').forEach(function (b) {
            b.addEventListener('click', function () { renderForm(ov, b.getAttribute('data-tab')); });
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = inputs[0].value.trim();
            var pwd = inputs[1].value;
            err.classList.remove('ok');
            err.textContent = '';

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = '请输入正确的邮箱地址'; return; }
            if (pwd.length < 6) { err.textContent = '密码至少 6 位'; return; }

            btn.disabled = true;
            btn.textContent = mode === 'login' ? '登录中…' : '注册中…';

            var p = mode === 'login' ? login(email, pwd) : signup(email, pwd);
            p.then(function (r) {
                if (mode === 'signup' && r && r.needConfirm) {
                    err.classList.add('ok');
                    err.textContent = '注册成功！请去邮箱点确认链接，然后回来登录。';
                    btn.disabled = false;
                    btn.textContent = '注册';
                    return;
                }
                close();
            }).catch(function (e2) {
                err.textContent = e2.message;
                btn.disabled = false;
                btn.textContent = mode === 'login' ? '登录' : '注册';
            });
        });

        setTimeout(function () { try { inputs[0].focus(); } catch (e) {} }, 30);
    }

    function renderAccount(ov) {
        var inner = ov.querySelector('.sa-inner');
        inner.innerHTML =
            '<div class="sa-me">' +
                '<div class="sa-avatar">' + esc((displayName() || '?').slice(0, 1).toUpperCase()) + '</div>' +
                '<div class="sa-me-info">' +
                    '<b>' + esc(displayName()) + '</b>' +
                    '<span>' + esc(user.email || '') + '</span>' +
                '</div>' +
            '</div>' +
            '<label class="sa-name">昵称<input maxlength="12" value="' + esc(displayName()) + '"></label>' +
            '<div class="sa-err"></div>' +
            '<div class="sa-actions">' +
                '<button class="sa-btn" type="button" data-save>保存昵称</button>' +
                '<button class="sa-btn ghost" type="button" data-logout>退出登录</button>' +
            '</div>' +
            '<p class="sa-tip">排行榜按账号合并成绩，换设备登录同一邮箱即可看到同一份成绩。</p>';

        var input = inner.querySelector('input');
        var err = inner.querySelector('.sa-err');
        var save = inner.querySelector('[data-save]');
        var out = inner.querySelector('[data-logout]');

        save.addEventListener('click', function () {
            var n = input.value.trim();
            if (!n) { err.textContent = '昵称不能为空'; return; }
            err.classList.remove('ok');
            err.textContent = '';
            save.disabled = true;
            save.textContent = '保存中…';
            updateName(n).then(function () {
                err.classList.add('ok');
                err.textContent = '已保存';
                save.disabled = false;
                save.textContent = '保存昵称';
                var nameEl = inner.querySelector('.sa-me-info b');
                var avatarEl = inner.querySelector('.sa-avatar');
                if (nameEl) nameEl.textContent = displayName();
                if (avatarEl) avatarEl.textContent = (displayName() || '?').slice(0, 1).toUpperCase();
            }).catch(function (e) {
                err.textContent = e.message;
                save.disabled = false;
                save.textContent = '保存昵称';
            });
        });

        out.addEventListener('click', function () {
            out.disabled = true;
            out.textContent = '退出中…';
            logout().then(function () { close(); });
        });
    }

    /* ================= 启动 ================= */
    init();
    // 兜底：无论如何 9 秒内要让 ready resolve，避免页面卡在等待
    setTimeout(function () { try { readyResolve(); } catch (e) {} }, 9000);

    /* ================= 对外 ================= */
    window.SunAuth = {
        enabled: ENABLED,
        ready: ready,
        get user() { return user; },
        onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
        open: open,
        close: close,
        login: login,
        signup: signup,
        logout: logout,
        token: token,
        updateName: updateName,
        displayName: displayName
    };
})();
