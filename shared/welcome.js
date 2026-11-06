/* ============================================================
 * 登录 / 注册成功后的全屏欢迎页
 * ------------------------------------------------------------
 * 引入顺序（放在 auth.js 之后）：
 *   <script src="../shared/cloud-config.js"></script>
 *   <script src="../shared/auth.js"></script>
 *   <script src="../shared/cloud.js"></script>
 *   <script src="../shared/welcome.js"></script>
 *
 * 自动行为：登录成功 / 注册成功时自动弹出（刷新页面恢复登录不会弹）。
 * 手动调用：SunWelcome.show({ name, email, mode: 'login' | 'signup' })
 * ============================================================ */
(function () {
    'use strict';

    var PALETTE = ['#6d8cff', '#43e0c0', '#f7a1c4', '#ffd166', '#a78bfa', '#ffffff'];

    /* 账号页地址：以 welcome.js 自身位置推导，适配首页 / 子目录 */
    var SCRIPT = document.currentScript || (function () {
        var all = document.getElementsByTagName('script');
        for (var i = all.length - 1; i >= 0; i--) {
            if (all[i].src && all[i].src.indexOf('welcome.js') >= 0) return all[i];
        }
        return null;
    })();
    var ACCOUNT_URL = '../account/';
    try {
        if (SCRIPT && SCRIPT.src) ACCOUNT_URL = new URL('../account/', SCRIPT.src).href;
    } catch (e) { /* ignore */ }

    var prefersReduced = false;
    try {
        prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* ignore */ }

    /* ================= 样式 ================= */
    var CSS = [
        '.sw-overlay,.sw-overlay *{box-sizing:border-box;margin:0;padding:0}',
        '.sw-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;',
        'padding:20px;overflow:hidden;color:#eef1ff;',
        'font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
        'background:radial-gradient(ellipse at 50% 0%,#1d2552 0%,#0b0f22 55%,#05060f 100%);',
        'animation:sw-fade .35s ease both}',
        '.sw-overlay:focus{outline:none}',

        '.sw-aurora{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;pointer-events:none;',
        'mix-blend-mode:screen;will-change:transform}',
        '.sw-a1{width:62vmax;height:62vmax;left:-26vmax;top:-32vmax;',
        'background:radial-gradient(circle,#4a63e8,transparent 65%);animation:sw-f1 16s ease-in-out infinite alternate}',
        '.sw-a2{width:52vmax;height:52vmax;right:-22vmax;bottom:-26vmax;',
        'background:radial-gradient(circle,#43e0c0,transparent 65%);animation:sw-f2 19s ease-in-out infinite alternate}',
        '.sw-a3{width:44vmax;height:44vmax;left:50%;top:58%;transform:translate(-50%,-50%);',
        'background:radial-gradient(circle,#f472b6,transparent 68%);opacity:.28;animation:sw-f3 13s ease-in-out infinite alternate}',

        '.sw-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}',

        '.sw-spark{position:absolute;width:4px;height:4px;border-radius:50%;background:#9fb4ff;',
        'box-shadow:0 0 10px 2px rgba(120,150,255,.7);opacity:0;pointer-events:none;z-index:1;',
        'animation:sw-twinkle 4s ease-in-out infinite}',

        '.sw-card{position:relative;z-index:2;width:100%;max-width:430px;padding:34px 28px 24px;border-radius:28px;',
        'text-align:center;background:linear-gradient(165deg,rgba(46,54,110,.78),rgba(13,17,36,.9));',
        'box-shadow:0 30px 90px -18px rgba(74,99,232,.55),inset 0 1px 0 rgba(255,255,255,.09);',
        '-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);',
        'animation:sw-pop .8s cubic-bezier(.16,.9,.28,1.25) both}',

        '.sw-card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;',
        'background:linear-gradient(140deg,rgba(109,140,255,.9),rgba(67,224,192,.5),rgba(247,161,196,.55),rgba(109,140,255,.9));',
        '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);',
        '-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);',
        'mask-composite:exclude}',

        '.sw-close{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;border:0;',
        'background:rgba(255,255,255,.08);color:#9fb0d8;font-size:14px;line-height:1;cursor:pointer;',
        'font-family:inherit;transition:background .15s ease,color .15s ease}',
        '.sw-close:hover{background:rgba(255,255,255,.16);color:#fff}',

        '.sw-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;letter-spacing:2px;',
        'padding:6px 13px;border-radius:999px;border:1px solid rgba(140,160,255,.3);',
        'background:rgba(109,140,255,.13);color:#aab8ff;opacity:0;animation:sw-up .55s .18s ease forwards}',
        '.sw-badge i{width:6px;height:6px;border-radius:50%;background:#43e0c0;',
        'box-shadow:0 0 8px 2px rgba(67,224,192,.7);animation:sw-pulse 2s ease-in-out infinite}',

        '.sw-avatar-wrap{position:relative;width:96px;height:96px;margin:22px auto 0}',
        '.sw-halo{position:absolute;inset:-30px;border-radius:50%;pointer-events:none;',
        'background:radial-gradient(circle,rgba(109,140,255,.5),transparent 68%);animation:sw-breathe 3.4s ease-in-out infinite}',
        '.sw-ring{position:absolute;inset:-6px;border-radius:50%;',
        'background:conic-gradient(from 0deg,#6d8cff,#43e0c0,#f7a1c4,#ffd166,#6d8cff);',
        'animation:sw-spin 6s linear infinite}',
        '.sw-avatar{position:absolute;inset:4px;border-radius:50%;display:grid;place-items:center;',
        'font-size:34px;font-weight:800;color:#fff;letter-spacing:1px;',
        'background:radial-gradient(circle at 32% 24%,#2b3668,#0e1228 72%);',
        'box-shadow:inset 0 0 24px rgba(109,140,255,.28);text-shadow:0 0 18px rgba(160,180,255,.75)}',

        '.sw-title{display:flex;justify-content:center;gap:1px;margin:18px 0 10px;',
        'font-size:clamp(30px,8vw,44px);font-weight:900;letter-spacing:5px;line-height:1.15}',
        '.sw-title span{display:inline-block;opacity:0;',
        'background:linear-gradient(120deg,#fff 10%,#b9c8ff 42%,#43e0c0 72%,#f7a1c4 100%);',
        '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;',
        'animation:sw-char .62s cubic-bezier(.2,.9,.25,1.3) forwards;animation-delay:calc(var(--i) * 90ms + 240ms)}',

        '.sw-sub{margin-top:2px;font-size:14.5px;line-height:1.7;color:#a9b6dd;opacity:0;',
        'animation:sw-up .55s .62s ease forwards}',
        '.sw-sub b{color:#fff;font-weight:800}',

        '.sw-email{margin-top:4px;font-size:12px;color:#7183b5;word-break:break-all;opacity:0;',
        'animation:sw-up .55s .7s ease forwards}',

        '.sw-seat{display:none;margin:12px auto 0;width:max-content;max-width:100%;padding:7px 14px;',
        'border-radius:999px;font-size:12.5px;font-weight:700;color:#ffd98a;',
        'background:linear-gradient(120deg,rgba(255,209,102,.16),rgba(247,161,196,.12));',
        'border:1px solid rgba(255,209,102,.35);box-shadow:0 0 26px -6px rgba(255,209,102,.55)}',
        '.sw-seat.on{display:inline-flex;align-items:center;gap:6px;animation:sw-up .5s ease both}',
        '.sw-seat b{color:#fff;font-weight:900}',

        '.sw-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:18px 0 4px}',
        '.sw-chips span{font-size:12px;padding:7px 12px;border-radius:999px;color:#b9c4ea;',
        'background:rgba(255,255,255,.055);border:1px solid rgba(140,160,255,.18);opacity:0;',
        'animation:sw-up .5s ease forwards}',
        '.sw-chips span:nth-child(1){animation-delay:.78s}',
        '.sw-chips span:nth-child(2){animation-delay:.87s}',
        '.sw-chips span:nth-child(3){animation-delay:.96s}',

        '.sw-btn{position:relative;overflow:hidden;width:100%;margin-top:20px;padding:15px;border:0;',
        'border-radius:14px;font-size:16px;font-weight:800;font-family:inherit;color:#fff;cursor:pointer;',
        'background:linear-gradient(120deg,#4a63e8,#6d8cff 38%,#43e0c0);',
        'box-shadow:0 14px 34px -10px rgba(90,120,255,.85);',
        'transition:transform .12s ease,filter .25s ease;opacity:0;',
        'animation:sw-up .55s 1.02s ease forwards}',
        '.sw-btn:hover{filter:brightness(1.1)}',
        '.sw-btn:active{transform:scale(.98)}',
        '.sw-btn::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;',
        'background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);',
        'transform:skewX(-20deg);animation:sw-shine 2.8s 1.7s infinite}',
        '.sw-btn i{font-style:normal;display:inline-block;margin-left:4px}',

        '.sw-link{display:inline-block;margin-top:12px;font-size:12.5px;color:#7f90c4;text-decoration:none;',
        'border-bottom:1px dashed rgba(127,144,196,.5);padding-bottom:1px}',
        '.sw-link:hover{color:#c9d4ff;border-color:#c9d4ff}',

        '@keyframes sw-fade{from{opacity:0}to{opacity:1}}',
        '@keyframes sw-pop{0%{opacity:0;transform:translateY(26px) scale(.9);filter:blur(8px)}',
        '100%{opacity:1;transform:none;filter:none}}',
        '@keyframes sw-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
        '@keyframes sw-char{0%{opacity:0;transform:translateY(16px) rotateX(65deg) scale(.82);filter:blur(6px)}',
        '100%{opacity:1;transform:none;filter:none}}',
        '@keyframes sw-spin{to{transform:rotate(360deg)}}',
        '@keyframes sw-breathe{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}',
        '@keyframes sw-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
        '@keyframes sw-twinkle{0%,100%{opacity:0;transform:scale(.6)}50%{opacity:.9;transform:scale(1.25)}}',
        '@keyframes sw-shine{0%{left:-60%}45%,100%{left:120%}}',
        '@keyframes sw-f1{to{transform:translate(8vmax,6vmax) scale(1.15)}}',
        '@keyframes sw-f2{to{transform:translate(-7vmax,-5vmax) scale(1.12)}}',
        '@keyframes sw-f3{to{transform:translate(-50%,-50%) scale(1.25);opacity:.45}}',

        '@media (max-width:420px){.sw-card{padding:28px 20px 20px;border-radius:24px}',
        '.sw-title{letter-spacing:3px}.sw-avatar-wrap{width:84px;height:84px}',
        '.sw-avatar{font-size:30px}.sw-chips span{font-size:11.5px;padding:6px 10px}}',

        '@media (prefers-reduced-motion: reduce){.sw-overlay *{animation-duration:.001s!important;',
        'animation-delay:0s!important;animation-iteration-count:1!important}}'
    ].join('');

    function injectCss() {
        if (document.getElementById('sun-welcome-css')) return;
        var s = document.createElement('style');
        s.id = 'sun-welcome-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ================= 礼花 ================= */
    function startConfetti(canvas) {
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var W = 0, H = 0;
        var parts = [];
        var stopped = false;
        var raf = 0;
        var timer = 0;

        function resize() {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();

        function add(x, y, n, power) {
            for (var i = 0; i < n; i++) {
                var a = Math.random() * Math.PI * 2;
                var sp = (0.3 + Math.random() * 0.7) * power;
                parts.push({
                    x: x + (Math.random() - 0.5) * 30,
                    y: y + (Math.random() - 0.5) * 30,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - power * 0.35,
                    size: 3 + Math.random() * 6,
                    color: PALETTE[(Math.random() * PALETTE.length) | 0],
                    rot: Math.random() * Math.PI * 2,
                    vr: (Math.random() - 0.5) * 14,
                    life: 0,
                    ttl: 1.5 + Math.random() * 1.5,
                    round: Math.random() < 0.45
                });
            }
        }

        add(W * 0.5, H * 0.4, 100, 430);
        timer = setTimeout(function () {
            if (stopped) return;
            add(0, H * 0.72, 60, 560);
            add(W, H * 0.72, 60, 560);
        }, 200);
        timer = setTimeout(function () {
            if (stopped) return;
            add(W * 0.5, H * 0.55, 70, 380);
        }, 650);

        var last = performance.now();
        function tick(now) {
            if (stopped) return;
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            ctx.clearRect(0, 0, W, H);
            var alive = 0;

            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.life += dt;
                if (p.life >= p.ttl) continue;
                alive++;
                p.vy += 880 * dt;
                p.vx *= 0.994;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.vr * dt;

                var k = p.life / p.ttl;
                ctx.save();
                ctx.globalAlpha = k < 0.08 ? k / 0.08 : (1 - k) * 1.05;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.round) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.5);
                }
                ctx.restore();
            }
            if (alive) raf = requestAnimationFrame(tick);
            else ctx.clearRect(0, 0, W, H);
        }
        raf = requestAnimationFrame(tick);

        return function stop() {
            stopped = true;
            clearTimeout(timer);
            cancelAnimationFrame(raf);
            ctx.clearRect(0, 0, W, H);
        };
    }

    /* ================= 弹层 ================= */
    var overlay = null;
    var stopConfetti = null;
    var keyHandler = null;
    var prevOverflow = '';

    function close() {
        if (stopConfetti) { stopConfetti(); stopConfetti = null; }
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
        document.documentElement.style.overflow = prevOverflow;
        document.body.style.overflow = prevOverflow;
    }

    function show(opts) {
        opts = opts || {};
        close();
        injectCss();

        var mode = opts.mode === 'signup' ? 'signup' : 'login';
        var name = opts.name || '朋友';
        var email = opts.email || '';
        var title = mode === 'signup' ? '欢迎加入' : '欢迎回来';
        var badge = mode === 'signup' ? '注册成功' : '登录成功';
        var sub = mode === 'signup' ? '，账号创建成功，云同步已开启' : '，很高兴又见到你';
        var initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?';

        var chars = title.split('').map(function (c, i) {
            return '<span style="--i:' + i + '">' + esc(c) + '</span>';
        }).join('');

        overlay = document.createElement('div');
        overlay.className = 'sw-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', title);
        overlay.tabIndex = -1;
        overlay.innerHTML =
            '<div class="sw-aurora sw-a1"></div>' +
            '<div class="sw-aurora sw-a2"></div>' +
            '<div class="sw-aurora sw-a3"></div>' +
            '<canvas class="sw-canvas"></canvas>' +
            '<div class="sw-card">' +
                '<button class="sw-close" type="button" aria-label="关闭">✕</button>' +
                '<span class="sw-badge"><i></i>' + esc(badge) + '</span>' +
                '<div class="sw-avatar-wrap">' +
                    '<span class="sw-halo"></span>' +
                    '<span class="sw-ring"></span>' +
                    '<span class="sw-avatar">' + esc(initial) + '</span>' +
                '</div>' +
                '<h1 class="sw-title">' + chars + '</h1>' +
                '<p class="sw-sub"><b>' + esc(name) + '</b>' + esc(sub) + '</p>' +
                '<div class="sw-email">' + esc(email) + '</div>' +
                '<div class="sw-seat"></div>' +
                '<div class="sw-chips">' +
                    '<span>☁ 云端同步</span>' +
                    '<span>🏆 排行榜</span>' +
                    '<span>📱 多端一致</span>' +
                '</div>' +
                '<button class="sw-btn" type="button">开始探索 <i>→</i></button>' +
                '<a class="sw-link" href="' + esc(ACCOUNT_URL) + '">查看我的账号</a>' +
            '</div>';

        prevOverflow = document.documentElement.style.overflow || '';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        document.body.appendChild(overlay);

        // 漂浮光点
        if (!prefersReduced) {
            for (var i = 0; i < 16; i++) {
                var sp = document.createElement('span');
                sp.className = 'sw-spark';
                sp.style.left = (Math.random() * 100).toFixed(2) + '%';
                sp.style.top = (Math.random() * 100).toFixed(2) + '%';
                sp.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
                sp.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + 's';
                overlay.appendChild(sp);
            }
        }

        var canvas = overlay.querySelector('.sw-canvas');
        if (!prefersReduced && canvas) stopConfetti = startConfetti(canvas);

        /* 「第 N 位」——只显示给本人；前 100 位算创始玩家 */
        var seatEl = overlay.querySelector('.sw-seat');
        var thisOverlay = overlay;
        function applySeat(seq) {
            seq = Number(seq);
            if (!seq || overlay !== thisOverlay || !seatEl) return;
            seatEl.innerHTML = seq <= 100
                ? '🏅 第 <b>' + seq + '</b> 位加入 · 创始玩家'
                : '第 <b>' + seq + '</b> 位加入';
            seatEl.classList.add('on');
        }
        if (opts.seat) {
            applySeat(opts.seat);
        } else if (window.SunCloud && window.SunCloud.mySeq) {
            window.SunCloud.mySeq().then(applySeat);
        }

        overlay.querySelector('.sw-btn').addEventListener('click', close);
        overlay.querySelector('.sw-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        keyHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', keyHandler);

        setTimeout(function () {
            if (overlay === thisOverlay) {
                try { thisOverlay.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
            }
        }, 60);
    }

    /* ================= 自动触发 ================= */
    if (window.SunAuth && window.SunAuth.onChange) {
        window.SunAuth.onChange(function (user, meta) {
            if (!user) return;
            var reason = meta && meta.reason;
            if (reason !== 'login' && reason !== 'signup') return;
            var fallback = (user.email || '').split('@')[0];
            show({
                name: window.SunAuth.displayName() || fallback || '朋友',
                email: user.email || '',
                mode: reason
            });
        });
    }

    window.SunWelcome = { show: show, close: close };
})();
