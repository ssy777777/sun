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

    // blocks: [x, y, w, h, mat]，pigs: [x, y]
    var LEVELS = [
        {
            name: '1-1', birds: ['red', 'red', 'red'],
            blocks: [[720, 470, 24, 100, 'wood'], [800, 470, 24, 100, 'wood'], [760, 409, 130, 22, 'wood']],
            pigs: [[760, 500]]
        },
        {
            name: '1-2', birds: ['red', 'red', 'red'],
            blocks: [[700, 470, 24, 100, 'wood'], [780, 470, 24, 100, 'wood'], [740, 409, 130, 22, 'wood'],
                     [840, 470, 24, 100, 'wood'], [920, 470, 24, 100, 'wood'], [880, 409, 130, 22, 'wood']],
            pigs: [[740, 500], [880, 500]]
        },
        {
            name: '1-3', birds: ['red', 'yellow', 'red'],
            blocks: [[720, 460, 26, 120, 'wood'], [820, 460, 26, 120, 'wood'], [770, 388, 150, 24, 'wood'],
                     [740, 346, 20, 60, 'glass'], [800, 346, 20, 60, 'glass'], [770, 304, 140, 24, 'stone']],
            pigs: [[770, 500], [770, 272]]
        },
        {
            name: '1-4', birds: ['red', 'blue', 'red'],
            blocks: [[720, 465, 22, 110, 'glass'], [820, 465, 22, 110, 'glass'], [770, 399, 150, 22, 'wood'],
                     [770, 377, 120, 20, 'glass']],
            pigs: [[770, 500], [770, 347]]
        },
        {
            name: '1-5', birds: ['yellow', 'black', 'red'],
            blocks: [[710, 465, 28, 110, 'stone'], [830, 465, 28, 110, 'stone'], [770, 394, 170, 24, 'stone'],
                     [740, 352, 20, 60, 'glass'], [800, 352, 20, 60, 'glass'], [770, 310, 130, 24, 'stone']],
            pigs: [[760, 500], [770, 278]]
        },
        {
            name: '1-6', birds: ['red', 'blue', 'black'],
            blocks: [[700, 470, 24, 100, 'wood'], [780, 470, 24, 100, 'wood'], [740, 409, 140, 22, 'wood'],
                     [860, 470, 24, 100, 'wood'], [940, 470, 24, 100, 'wood'], [900, 409, 140, 22, 'wood'],
                     [820, 388, 180, 20, 'wood']],
            pigs: [[740, 500], [900, 500], [820, 358]]
        }
    ];

    window.BIRD_TYPES = BIRD_TYPES;
    window.LEVELS = LEVELS;
})();
