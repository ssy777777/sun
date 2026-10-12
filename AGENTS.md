# AGENTS.md

## 项目说明

纯原生 HTML / CSS / JavaScript 的练习项目（无框架、无构建工具）：

- `demo1/` — HTML / CSS 基础练习 + 留言板
- `demo2/` — 俄罗斯方块（Canvas）
- `demo3/` — 2048
- `demo4/` — 泡泡堂（炸弹人对战）
- `demo5/` — 数独
- `demo6/` — 舒尔特方格
- `demo7/` — 数字记忆
- `demo8/` — 瞬时网格
- `demo9/` — 翻牌配对
- `demo10/` — 序列复现
- `demo11/` — 枪枪爆头（狙击闯关）
- `demo12/` — N-Back
- `demo13/` — 肖了个肖
- `demo14/` — 诗词大作战
- `demo15/` — 成语接龙
- `demo16/` — 愤怒的小鸟（弹弓物理闯关）
- `demo17/` — 记忆宫殿（地点法记忆训练）
- `demo18/` — 扑克牌记忆（顺序记忆训练）
- `demo19/` — 跳一跳（蓄力跳跃）
- `apps.js` — 首页数据（“数据库”）+ 自动渲染
- `index.html` — 根目录导航首页

全部手机 / 电脑双端。首页卡片由 `apps.js` 的 `APPS` 数组生成，编号自动（`CONFIG` 控制）。

## 线上与部署

- GitHub 仓库：https://github.com/ssy777777/sun
- 部署平台：**GitHub Pages**（分支部署，push 即发布，免费、无构建额度限制）
- 线上地址：https://ssy777777.github.io/sun/
- 部署说明见 `DEPLOY.md`

## 工作流程（重要）

**每次修改代码后，直接提交并推送，不要先询问用户确认。**

```bat
git add .
git commit -m "<简明说明>"
git push
```

推送后 GitHub Pages 会自动重新发布（约 1 分钟内），线上更新，网址不变。

## 约定

- 纯原生，不引入库 / 框架。
- 逻辑集中在各自 `js/*.js` 的 IIFE 内，通过 DOM id 获取元素。
- 新增 UI 元素后在对应 JS 顶部取引用并绑定事件。
- 双端统一：键盘 + 触屏都可用，移动端页面尽量一屏不滚动。
- 常量集中放文件顶部。
- 首页列表改动集中在 `apps.js`（数组顺序 = 显示顺序）。
- 不修改全局 git 配置（尤其不要动 `http.https://github.com.proxy`）。
