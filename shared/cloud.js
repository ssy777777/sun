/* ============================================================
 * 共用云排行榜（Supabase）—— 纯原生 fetch，无任何依赖
 * ------------------------------------------------------------
 * 用法（在游戏脚本之前引入即可）：
 *   <script src="../shared/cloud-config.js"></script>
 *   <script src="../shared/cloud.js"></script>
 *
 *   SunCloud.enabled                        // 是否已配置
 *   SunCloud.submit('2048', best)           // 上报最高分（只会越报越高）
 *   SunCloud.openLeaderboard('2048', '2048 排行榜', best)  // 打开榜单弹层
 *
 * 设计：本地优先。没配置 / 断网 / 接口挂了，都只是排行榜不可用，
 *       游戏本身与本地最高分不受任何影响。
 * ============================================================ */
(function () {
    'use strict';

    var CFG = window.SUN_CLOUD || {};
    var URL_BASE = String(CFG.url || '').replace(/\/+$/, '');
    var ANON = String(CFG.anonKey || '');
    var ENABLED = !!(URL_BASE && ANON);

    var TABLE = 'scores';
    var ID_KEY = 'sun-cloud-id';
    var NAME_KEY = 'sun-cloud-name';
    var LAST_KEY = 'sun-cloud-last';
    var TIMEOUT = 8000;

    /* ---------------- 本地身份（昵称 + 设备号） ---------------- */
    function store(k, v) {
        try {
            if (v === undefined) return localStorage.getItem(k);
            localStorage.setItem(k, v);
        } catch (e) { /* 隐私模式等 */ }
        return null;
    }
    function deviceId() {
        var id = store(ID_KEY);
        if (!id) {
            id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            store(ID_KEY, id);
        }
        return id;
    }
    function getName() {
        var n = store(NAME_KEY);
        if (n) return n;
        var def = '无名侠' + deviceId().slice(-4);
        return def;
    }
    function setName(n) {
        n = String(n || '').replace(/[\s<>]/g, '').slice(0, 12);
        if (n) store(NAME_KEY, n);
        return getName();
    }

    /* ---------------- HTTP ---------------- */
    function req(path, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
            var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
            var headers = {
                apikey: ANON,
                Authorization: 'Bearer ' + ANON,
                'Content-Type': 'application/json'
            };
            if (opts.headers) for (var k in opts.headers) if (opts.headers.hasOwnProperty(k)) headers[k] = opts.headers[k];

            fetch(URL_BASE + path, {
                method: opts.method || 'GET',
                headers: headers,
                body: opts.body,
                signal: ctrl ? ctrl.signal : undefined
            }).then(function (r) {
                clearTimeout(timer);
                if (!r.ok) {
                    return r.text().then(function (t) {
                        reject(new Error('HTTP ' + r.status + ' ' + String(t).slice(0, 160)));
                    });
                }
                var ct = r.headers.get('content-type') || '';
                if (ct.indexOf('json') < 0) return resolve(null);
                return r.json().then(resolve, function () { resolve(null); });
            }).catch(function (e) {
                clearTimeout(timer);
                reject(e);
            });
        });
    }

    /* ---------------- 上报成绩 ---------------- */
    function lastMap() {
        try { return JSON.parse(store(LAST_KEY) || '{}') || {}; } catch (e) { return {}; }
    }

    function submit(game, score, force) {
        score = Math.round(Number(score) || 0);
        if (!(score > 0)) return Promise.resolve({ ok: false, reason: 'empty' });

        var last = lastMap();
        if (!force && last[game] != null && score <= last[game]) {
            return Promise.resolve({ ok: false, reason: 'stale' });
        }
        if (!ENABLED) return Promise.resolve({ ok: false, reason: 'disabled' });

        var row = {
            device_id: deviceId(),
            game: game,
            name: getName(),
            score: score,
            updated_at: new Date().toISOString()
        };

        // 1) 先尝试“仅在更高时”更新已有记录
        var patch = '/' + TABLE +
            '?device_id=eq.' + encodeURIComponent(row.device_id) +
            '&game=eq.' + encodeURIComponent(game) +
            '&score=lt.' + score;

        return req(patch, {
            method: 'PATCH',
            body: JSON.stringify({ score: row.score, name: row.name, updated_at: row.updated_at }),
            headers: { Prefer: 'return=representation' }
        }).then(function (rows) {
            if (rows && rows.length) return { ok: true, updated: true };
            // 2) 没有旧记录 → 插入；已被抢先插入（409）就当成功
            return req('/' + TABLE, {
                method: 'POST',
                body: JSON.stringify([row]),
                headers: { Prefer: 'return=minimal' }
            }).then(function () {
                return { ok: true, inserted: true };
            }).catch(function (e) {
                if (/HTTP 409/.test(e.message)) return { ok: true, existed: true };
                throw e;
            });
        }).then(function (res) {
            last[game] = score;
            store(LAST_KEY, JSON.stringify(last));
            return res;
        });
    }

    /* ---------------- 拉取榜单 ---------------- */
    function top(game, limit) {
        if (!ENABLED) return Promise.resolve([]);
        var q = '/' + TABLE +
            '?select=name,score,updated_at,device_id' +
            '&game=eq.' + encodeURIComponent(game) +
            '&order=score.desc,updated_at.asc' +
            '&limit=' + (limit || 20);
        return req(q).then(function (rows) { return rows || []; });
    }

    /* ---------------- 弹层 UI ---------------- */
    var CSS = [
        '.sc-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;',
        'background:rgba(16,26,40,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);',
        'font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:#21384f}',
        '.sc-card{width:100%;max-width:380px;max-height:86vh;display:flex;flex-direction:column;background:#fff;',
        'border-radius:16px;box-shadow:0 18px 50px rgba(10,25,45,.34);overflow:hidden}',
        '.sc-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;',
        'background:linear-gradient(135deg,#ffb457,#ff8a3d);color:#fff}',
        '.sc-title{font-size:17px;font-weight:800;letter-spacing:1px}',
        '.sc-close{border:0;background:rgba(255,255,255,.24);color:#fff;width:28px;height:28px;border-radius:50%;',
        'font-size:15px;line-height:1;cursor:pointer;font-family:inherit}',
        '.sc-sub{padding:9px 16px 2px;font-size:12px;color:#7c93a8}',
        '.sc-list{flex:1;overflow:auto;padding:6px 10px 10px;-webkit-overflow-scrolling:touch}',
        '.sc-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;font-size:14px}',
        '.sc-row+.sc-row{margin-top:3px}',
        '.sc-row.mine{background:#fff4e5;box-shadow:inset 0 0 0 1px #ffd9a8}',
        '.sc-rank{width:30px;text-align:center;font-weight:800;color:#8aa0b4}',
        '.sc-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}',
        '.sc-you{font-style:normal;font-size:11px;color:#fff;background:#ff8a3d;border-radius:6px;padding:1px 5px;margin-left:4px}',
        '.sc-score{font-weight:800;color:#e8722a;font-variant-numeric:tabular-nums}',
        '.sc-empty{padding:22px 10px;text-align:center;color:#8aa0b4;font-size:13px;line-height:1.9}',
        '.sc-steps{text-align:left;font-size:12.5px;line-height:1.9;color:#5c7a92;padding:4px 6px}',
        '.sc-steps b{color:#e8722a}',
        '.sc-steps code{background:#eef3f8;border-radius:5px;padding:1px 5px;font-size:12px}',
        '.sc-me{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #eef3f8;background:#fafcfe}',
        '.sc-me label{font-size:12px;color:#7c93a8}',
        '.sc-me input{flex:1;min-width:0;border:1px solid #d9e5ef;border-radius:8px;padding:8px 10px;font-size:14px;',
        'font-family:inherit;color:#21384f;outline:none}',
        '.sc-me input:focus{border-color:#ffab5e}',
        '.sc-btn{border:0;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;font-family:inherit;',
        'cursor:pointer;background:#ff8a3d;color:#fff;white-space:nowrap}',
        '.sc-btn.ghost{background:#eef3f8;color:#5c7a92}',
        '.sc-foot{display:flex;gap:8px;padding:0 14px 12px;background:#fafcfe}',
        '.sc-foot .sc-btn{flex:1;padding:9px 10px}',
        '.sc-msg{padding:0 14px 12px;font-size:12px;color:#8aa0b4;min-height:16px;background:#fafcfe}'
    ].join('');

    function injectCss() {
        if (document.getElementById('sun-cloud-css')) return;
        var s = document.createElement('style');
        s.id = 'sun-cloud-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    var openEl = null;
    var escHandler = null;

    function close() {
        if (openEl && openEl.parentNode) openEl.parentNode.removeChild(openEl);
        openEl = null;
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
    }

    function openLeaderboard(game, title, myBest, limit) {
        injectCss();
        close();

        limit = limit || 20;
        var ov = document.createElement('div');
        ov.className = 'sc-overlay';
        ov.innerHTML =
            '<div class="sc-card">' +
                '<div class="sc-head">' +
                    '<span class="sc-title">🏆 ' + esc(title || '排行榜') + '</span>' +
                    '<button class="sc-close" type="button" aria-label="关闭">✕</button>' +
                '</div>' +
                '<div class="sc-sub"></div>' +
                '<div class="sc-list"><div class="sc-empty">加载中…</div></div>' +
                '<div class="sc-me"><label>昵称</label>' +
                    '<input class="sc-name" maxlength="12" value="' + esc(getName()) + '">' +
                    '<button class="sc-save sc-btn" type="button">保存</button>' +
                '</div>' +
                '<div class="sc-msg"></div>' +
                '<div class="sc-foot"></div>' +
            '</div>';

        var subEl = ov.querySelector('.sc-sub');
        var listEl = ov.querySelector('.sc-list');
        var nameEl = ov.querySelector('.sc-name');
        var msgEl = ov.querySelector('.sc-msg');
        var footEl = ov.querySelector('.sc-foot');

        function msg(t) { msgEl.textContent = t || ''; }

        ov.querySelector('.sc-close').addEventListener('click', close);
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        escHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);

        ov.querySelector('.sc-save').addEventListener('click', function () {
            setName(nameEl.value);
            nameEl.value = getName();
            msg('昵称已保存，下次上报生效');
        });

        document.body.appendChild(ov);
        openEl = ov;

        if (!ENABLED) {
            subEl.textContent = '未启用';
            listEl.innerHTML =
                '<div class="sc-steps">' +
                    '<b>排行榜还没配置</b><br>' +
                    '① 在 <code>shared/cloud-config.js</code> 填入 Supabase 的 <code>url</code> 和 <code>anonKey</code><br>' +
                    '② 在 Supabase 的 SQL Editor 执行 <code>排行榜接入.md</code> 里的建表 SQL<br>' +
                    '详见根目录 <b>排行榜接入.md</b>。不配置也不影响游戏与本地最高分。' +
                '</div>';
            footEl.innerHTML = '<button class="sc-btn ghost" type="button" data-close>知道了</button>';
            footEl.querySelector('[data-close]').addEventListener('click', close);
            return;
        }

        subEl.textContent = '前 ' + limit + ' 名' + (myBest > 0 ? '　我的最好成绩 ' + myBest : '');
        footEl.innerHTML =
            '<button class="sc-btn" type="button" data-upload>上传我的成绩</button>' +
            '<button class="sc-btn ghost" type="button" data-refresh>刷新</button>';

        var uploadBtn = footEl.querySelector('[data-upload]');
        if (!(myBest > 0)) uploadBtn.style.display = 'none';
        uploadBtn.addEventListener('click', function () {
            msg('上传中…');
            submit(game, myBest, true).then(function () {
                msg('已上传');
                load();
            }).catch(function (e) {
                msg('上传失败：' + e.message);
            });
        });

        function render(rows) {
            var mine = deviceId();
            if (!rows.length) {
                listEl.innerHTML = '<div class="sc-empty">还没有人上榜<br>做个第一吧 🥇</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i];
                var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
                var isMine = r.device_id === mine;
                html += '<div class="sc-row' + (isMine ? ' mine' : '') + '">' +
                    '<span class="sc-rank">' + medal + '</span>' +
                    '<span class="sc-name">' + esc(r.name || '无名侠') + (isMine ? '<em class="sc-you">你</em>' : '') + '</span>' +
                    '<span class="sc-score">' + (r.score | 0) + '</span>' +
                    '</div>';
            }
            listEl.innerHTML = html;
        }

        function load() {
            listEl.innerHTML = '<div class="sc-empty">加载中…</div>';
            top(game, limit).then(function (rows) {
                render(rows);
            }).catch(function (e) {
                listEl.innerHTML = '<div class="sc-empty">加载失败：' + esc(e.message) +
                    '<br>（检查网络 / Supabase 项目是否被闲置暂停）</div>';
            });
        }

        footEl.querySelector('[data-refresh]').addEventListener('click', function () { msg(''); load(); });
        load();
    }

    /* ---------------- 对外接口 ---------------- */
    window.SunCloud = {
        enabled: ENABLED,
        submit: submit,
        top: top,
        openLeaderboard: openLeaderboard,
        close: close,
        getName: getName,
        setName: setName,
        deviceId: deviceId
    };
})();
