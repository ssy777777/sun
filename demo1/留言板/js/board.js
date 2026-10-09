(function () {
    'use strict';

    var STORAGE_KEY = 'demo1-board';

    var form = document.getElementById('form');
    var nameInput = document.getElementById('name');
    var contentInput = document.getElementById('content');
    var countEl = document.getElementById('count');
    var listEl = document.getElementById('list');
    var totalEl = document.getElementById('total');
    var emptyEl = document.getElementById('empty');
    var clearBtn = document.getElementById('clear');

    var messages = load();

    function load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) { /* ignore */ }
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatTime(ts) {
        var d = new Date(ts);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function hueOf(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            h = (h * 31 + str.charCodeAt(i)) % 360;
        }
        return h;
    }

    function buildItem(m) {
        var name = (m.name || '').trim() || '匿名';
        var li = document.createElement('li');
        li.className = 'item';

        var avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = name.charAt(0).toUpperCase();
        var hue = hueOf(name);
        avatar.style.background = 'linear-gradient(135deg, hsl(' + hue + ',72%,60%), hsl(' +
            ((hue + 45) % 360) + ',72%,48%))';

        var body = document.createElement('div');
        body.className = 'body';

        var meta = document.createElement('div');
        meta.className = 'meta';
        var nameEl = document.createElement('span');
        nameEl.className = 'name';
        nameEl.textContent = name;
        var timeEl = document.createElement('span');
        timeEl.className = 'time';
        timeEl.textContent = formatTime(m.time);
        meta.appendChild(nameEl);
        meta.appendChild(timeEl);

        var text = document.createElement('p');
        text.className = 'text';
        text.textContent = m.text;

        body.appendChild(meta);
        body.appendChild(text);

        var del = document.createElement('button');
        del.className = 'del';
        del.type = 'button';
        del.textContent = '删除';
        del.setAttribute('data-id', m.id);

        li.appendChild(avatar);
        li.appendChild(body);
        li.appendChild(del);
        return li;
    }

    function render() {
        listEl.textContent = '';
        totalEl.textContent = messages.length;
        emptyEl.style.display = messages.length ? 'none' : 'block';
        clearBtn.style.display = messages.length ? '' : 'none';

        messages.slice().reverse().forEach(function (m) {
            listEl.appendChild(buildItem(m));
        });
    }

    function updateCount() {
        countEl.textContent = contentInput.value.length + ' / 200';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = contentInput.value.trim();
        if (!text) {
            contentInput.focus();
            return;
        }
        messages.push({
            id: Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: nameInput.value.trim() || '匿名',
            text: text.slice(0, 200),
            time: Date.now()
        });
        save();
        render();
        contentInput.value = '';
        nameInput.value = '';
        updateCount();
        contentInput.focus();
    });

    listEl.addEventListener('click', function (e) {
        var node = e.target;
        while (node && node !== listEl && !(node.classList && node.classList.contains('del'))) {
            node = node.parentNode;
        }
        if (!node || node === listEl) return;
        var id = node.getAttribute('data-id');
        messages = messages.filter(function (m) { return m.id !== id; });
        save();
        render();
    });

    clearBtn.addEventListener('click', function () {
        if (!messages.length) return;
        if (window.confirm('确定清空全部留言吗？')) {
            messages = [];
            save();
            render();
        }
    });

    contentInput.addEventListener('input', updateCount);

    updateCount();
    render();
})();
