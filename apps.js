/* 站点数据（“数据库”）+ 首页自动渲染
 * 调整顺序：直接移动下面 APPS 里对象的位置即可（分类内顺序 = 显示顺序）。
 * 编号自动生成（每个分类从 1 开始），无需手写序号。
 * 调整分类顺序：修改 CATEGORIES 数组。 */

var CATEGORIES = ['小游戏', '记忆力训练', '益智', '基础练习'];

var APPS = [
    // ---------- 小游戏 ----------
    {
        cat: '小游戏', title: '2048', href: './demo3/', color: '#f0b429',
        desc: '四方向合并数字方块，无上限一直合到失败，带滑动动画与最高分记录。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="2" y="2" width="9" height="9" rx="2" opacity=".9"/><rect x="13" y="2" width="9" height="9" rx="2" opacity=".45"/><rect x="2" y="13" width="9" height="9" rx="2" opacity=".45"/><rect x="13" y="13" width="9" height="9" rx="2" opacity=".9"/></svg>'
    },
    {
        cat: '小游戏', title: '俄罗斯方块', href: './demo2/', color: '#3ad6f0',
        desc: '方向键 / 触屏操作，含暂存、消行动画、音效与连击提示。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="9" y="3" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/><rect x="15" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="15" width="6" height="6" rx="1.5" opacity=".5"/></svg>'
    },
    {
        cat: '小游戏', title: '泡泡堂', href: './demo4/', color: '#a78bfa',
        desc: '放水泡炸箱子吃道具，单人对抗电脑 AI（含恶梦难度）或双人同屏。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7"/><circle cx="9.4" cy="10.8" r="1.5" fill="currentColor" stroke="none"/><path d="M12 4.5l1.4 2.3h-2.8z" fill="currentColor" stroke="none"/></svg>'
    },
    {
        cat: '小游戏', title: '枪枪爆头', href: './demo11/', color: '#ff5b3d',
        desc: '第一人称狙击暗杀：长按瞄准、松手开枪、爆头一击必杀，含爆炸连锁、枪械解锁与无尽模式。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>'
    },

    // ---------- 记忆力训练 ----------
    {
        cat: '记忆力训练', title: '舒尔特方格', href: './demo6/', color: '#22c55e',
        desc: '按顺序点击 1→N，训练注意力与周边视觉，3×3 至 7×7、计时与中心点。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="6" cy="6" r="1.8"/><circle cx="12" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="12" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/></svg>'
    },
    {
        cat: '记忆力训练', title: '数字记忆', href: './demo7/', color: '#0ea5e9',
        desc: '记住一闪而过的数字并按输入，每过一关多加一位，挑战最长记忆。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="3" y="4" width="18" height="16" rx="3" opacity=".35"/><circle cx="8" cy="10" r="1.9"/><circle cx="12" cy="10" r="1.9"/><circle cx="16" cy="10" r="1.9"/><rect x="7" y="15" width="10" height="2.4" rx="1.2"/></svg>'
    },
    {
        cat: '记忆力训练', title: '瞬时网格', href: './demo8/', color: '#f97316',
        desc: '记住一闪而过的亮格，网格逐关变大、格数增多，考验瞬间记忆。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" opacity=".35"/><rect x="3" y="14" width="7" height="7" rx="1.5" opacity=".35"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
    },
    {
        cat: '记忆力训练', title: '翻牌配对', href: './demo9/', color: '#14b8a6',
        desc: '翻开两张找相同图案，三种尺寸，记录步数与时间，考验记忆力。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="11" height="14" rx="2"/><rect x="10" y="5" width="11" height="14" rx="2" fill="currentColor" opacity=".2"/></svg>'
    },
    {
        cat: '记忆力训练', title: '序列复现', href: './demo10/', color: '#f43f5e',
        desc: '记住闪烁的先后顺序并照着重复，每过一关多加一步，带音效。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="7" cy="7" r="4" opacity=".4"/><circle cx="17" cy="7" r="4" opacity=".4"/><circle cx="7" cy="17" r="4" opacity=".4"/><circle cx="17" cy="17" r="4"/></svg>'
    },
    {
        cat: '记忆力训练', title: 'N-Back', href: './demo12/', color: '#a3e635',
        desc: '判断当前刺激与 N 步前是否相同：方块位置 + 字母声音的双重 N-back，训练工作记忆。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><polyline points="3 4 3 9.5 8.5 9.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/></svg>'
    },

    // ---------- 益智 ----------
    {
        cat: '益智', title: '数独', href: './demo5/', color: '#818cf8',
        desc: '9×9 数字推理，唯一解生成、难度可选，支持笔记与键盘 / 触屏。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>'
    },

    // ---------- 基础练习 ----------
    {
        cat: '基础练习', title: '我的第一个网页', href: './demo1/Welcome.html', color: '#63e6be',
        desc: '标签、选择器、盒模型、背景、字体等 HTML / CSS 基础练习起点。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 6 3 12 8 18"/><polyline points="16 6 21 12 16 18"/><line x1="13.5" y1="4" x2="10.5" y2="20"/></svg>'
    },
    {
        cat: '基础练习', title: '留言板', href: './demo1/留言板/', color: '#f472b6',
        desc: '发布留言并保存在本机，支持删除、清空与双端自适应。',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="14.5" x2="13" y2="14.5"/></svg>'
    }
];

(function renderHome() {
    var root = document.getElementById('app-groups');
    if (!root) return;

    function hexToRgba(hex, a) {
        var h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    CATEGORIES.forEach(function (cat) {
        var items = APPS.filter(function (x) { return x.cat === cat; });
        if (!items.length) return;

        var section = document.createElement('section');
        section.className = 'group';

        var title = document.createElement('h2');
        title.className = 'group-title';
        title.appendChild(document.createTextNode(cat + ' '));
        var count = document.createElement('span');
        count.className = 'count';
        count.textContent = items.length;
        title.appendChild(count);

        var cards = document.createElement('div');
        cards.className = 'cards';

        items.forEach(function (it, idx) {
            var a = document.createElement('a');
            a.className = 'card';
            a.href = it.href;
            a.style.setProperty('--c', it.color);
            a.style.setProperty('--c-soft', hexToRgba(it.color, 0.18));

            var badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = idx + 1; // 分类内自动编号，从 1 开始

            var icon = document.createElement('span');
            icon.className = 'icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = it.icon;

            var h = document.createElement('h2');
            h.textContent = it.title;

            var p = document.createElement('p');
            p.textContent = it.desc;

            var go = document.createElement('span');
            go.className = 'go';
            go.innerHTML = '立即进入 <i>→</i>';

            a.appendChild(badge);
            a.appendChild(icon);
            a.appendChild(h);
            a.appendChild(p);
            a.appendChild(go);
            cards.appendChild(a);
        });

        section.appendChild(title);
        section.appendChild(cards);
        root.appendChild(section);
    });
})();
