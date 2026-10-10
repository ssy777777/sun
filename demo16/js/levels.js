/* 关卡与小鸟类型数据（demo16） */
(function () {
    'use strict';

    var BIRD_TYPES = {
        red: { color: '#e8483e', dark: '#b52f27', r: 16, density: 3.0, power: 'none', label: '红鸟' },
        yellow: { color: '#f6c531', dark: '#c99a16', r: 15, density: 2.6, power: 'dash', label: '黄鸟·冲刺' },
        blue: { color: '#4aa8e8', dark: '#2f7fc0', r: 12, density: 2.0, power: 'split', label: '蓝鸟·分裂' },
        black: { color: '#3a3f46', dark: '#20242a', r: 17, density: 3.4, power: 'bomb', label: '黑鸟·爆破' },
        white: { color: '#f2f2f2', dark: '#c9c9c9', r: 16, density: 2.8, power: 'egg', label: '白鸟·下蛋' }
    };

    var GY = 520;

    function hut(bx, mat, legH, span, legW) {
        legH = legH || 100; span = span || 80; legW = legW || 24;
        var plankW = span + legW + 34, plankH = 22;
        return {
            blocks: [
                [bx - span / 2, GY - legH / 2, legW, legH, mat],
                [bx + span / 2, GY - legH / 2, legW, legH, mat],
                [bx, GY - legH - plankH / 2, plankW, plankH, mat]
            ],
            topY: GY - legH - plankH
        };
    }
    function addHut(o, bx, mat, legH, span) {
        var h = hut(bx, mat, legH, span);
        for (var i = 0; i < h.blocks.length; i++) o.blocks.push(h.blocks[i]);
        return h.topY;
    }
    function L(name, birds, fn) {
        var o = { name: name, birds: birds, blocks: [], pigs: [] };
        var box = {
            block: function (baseY, bx, w, h, mat) { o.blocks.push([bx, baseY - h / 2, w, h, mat]); },
            pigOn: function (baseY, x) { o.pigs.push([x, baseY - 20]); },
            pig: function (x, y) { o.pigs.push([x, y]); },
            addHut: function (bx, mat, legH, span) { return addHut(o, bx, mat, legH, span); }
        };
        fn(box);
        return o;
    }

    var LEVELS = [
        L('1-1', ['red', 'red', 'red'], function (o) {
            o.addHut(760, 'wood'); o.pig(760, 500);
        }),
        L('1-2', ['red', 'red', 'red'], function (o) {
            o.addHut(720, 'wood'); o.addHut(860, 'wood'); o.pig(720, 500); o.pig(860, 500);
        }),
        L('1-3', ['red', 'yellow', 'red'], function (o) {
            var t = o.addHut(770, 'wood'); o.block(t, 770, 130, 26, 'stone'); o.pig(770, 500); o.pigOn(t - 26, 770);
        }),
        L('1-4', ['red', 'blue', 'red'], function (o) {
            var t = o.addHut(770, 'glass'); o.pig(770, 500); o.pigOn(t, 770);
        }),
        L('1-5', ['yellow', 'black', 'red'], function (o) {
            var t = o.addHut(770, 'stone'); o.pig(770, 500); o.pigOn(t, 770);
        }),
        L('1-6', ['red', 'blue', 'black'], function (o) {
            var a = o.addHut(690, 'wood'); o.addHut(890, 'wood'); o.block(a, 790, 240, 20, 'wood');
            o.pig(690, 500); o.pig(890, 500); o.pigOn(a - 20, 790);
        }),
        L('1-7', ['red', 'red', 'yellow'], function (o) {
            var t = o.addHut(770, 'wood'); o.block(t, 770, 150, 24, 'glass'); o.block(t - 24, 770, 120, 22, 'wood');
            o.pig(770, 500); o.pigOn(t - 46, 770);
        }),
        L('1-8', ['red', 'red', 'blue'], function (o) {
            o.addHut(660, 'wood'); o.addHut(770, 'wood'); o.addHut(880, 'wood');
            o.pig(660, 500); o.pig(770, 500); o.pig(880, 500);
        }),
        L('1-9', ['red', 'blue', 'red'], function (o) {
            var a = o.addHut(700, 'glass'); o.addHut(870, 'glass'); o.block(a, 785, 250, 24, 'stone');
            o.pig(700, 500); o.pig(870, 500); o.pigOn(a - 24, 785);
        }),
        L('1-10', ['yellow', 'black', 'red'], function (o) {
            var t = o.addHut(770, 'stone', 120); o.block(t, 730, 20, 70, 'glass'); o.block(t, 810, 20, 70, 'glass');
            o.block(t - 70, 770, 150, 24, 'stone'); o.pig(770, 500); o.pigOn(t - 94, 770);
        }),
        L('1-11', ['red', 'blue', 'black'], function (o) {
            var a = o.addHut(690, 'glass'); o.addHut(890, 'glass'); o.block(a, 790, 240, 20, 'wood');
            o.pig(690, 500); o.pig(890, 500); o.pigOn(a - 20, 790);
        }),
        L('1-12', ['red', 'yellow', 'red'], function (o) {
            var t = o.addHut(770, 'wood', 140); o.block(t, 770, 160, 26, 'stone'); o.pig(770, 500); o.pigOn(t - 26, 770);
        }),
        L('1-13', ['yellow', 'black', 'red'], function (o) {
            var t = o.addHut(770, 'stone'); o.block(t, 770, 150, 30, 'stone'); o.block(t - 30, 770, 120, 26, 'stone');
            o.pig(770, 500); o.pigOn(t - 56, 770);
        }),
        L('1-14', ['red', 'blue', 'red'], function (o) {
            o.addHut(660, 'glass'); o.addHut(770, 'glass'); o.addHut(880, 'glass');
            o.pig(660, 500); o.pig(770, 500); o.pig(880, 500);
        }),
        L('1-15', ['red', 'red', 'yellow'], function (o) {
            var t = o.addHut(770, 'wood'); o.block(t, 770, 150, 24, 'stone');
            o.pig(620, 500); o.pig(770, 500); o.pigOn(t - 24, 770);
        }),
        L('1-16', ['red', 'blue', 'black'], function (o) {
            var a = o.addHut(660, 'wood'); o.addHut(880, 'wood'); o.block(a, 770, 260, 20, 'wood');
            o.block(a - 20, 770, 120, 22, 'stone');
            o.pig(660, 500); o.pig(880, 500); o.pigOn(a - 42, 770);
        }),
        L('1-17', ['yellow', 'black', 'red'], function (o) {
            var t = o.addHut(770, 'glass', 120); o.block(t, 770, 140, 24, 'wood');
            o.pig(770, 500); o.pigOn(t - 24, 770);
        }),
        L('1-18', ['red', 'blue', 'red'], function (o) {
            o.addHut(650, 'glass'); o.addHut(890, 'glass'); o.pig(650, 500); o.pig(890, 500);
            o.pig(770, 500);
        }),
        L('1-19', ['red', 'blue', 'black'], function (o) {
            var a = o.addHut(680, 'wood'); o.addHut(880, 'wood');
            o.block(a, 780, 260, 22, 'wood'); o.block(a - 22, 780, 130, 24, 'stone');
            o.pig(680, 500); o.pig(880, 500); o.pigOn(a - 46, 780);
        }),
        L('1-20', ['yellow', 'black', 'black'], function (o) {
            var t = o.addHut(770, 'stone', 120);
            o.block(t, 720, 22, 80, 'glass'); o.block(t, 820, 22, 80, 'glass');
            o.block(t - 80, 770, 170, 26, 'stone');
            o.pig(770, 500); o.pig(680, 500); o.pigOn(t - 106, 770);
        })
    ];

    window.BIRD_TYPES = BIRD_TYPES;
    window.LEVELS = LEVELS;
})();
