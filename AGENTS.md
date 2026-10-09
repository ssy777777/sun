# AGENTS.md

## 项目说明

纯原生 HTML / CSS / JavaScript 的练习项目（无框架、无构建工具）：

- `demo1/` — HTML / CSS 基础练习
- `demo2/` — 俄罗斯方块（Canvas，手机电脑双端）
- `demo3/` — 2048（DOM + 动画，手机电脑双端）
- `index.html` — 根目录导航首页

## 线上与部署

- GitHub 仓库：https://github.com/ssy777777/sun
- 部署平台：Netlify（连接 GitHub 自动部署）
- 线上地址：https://luxury-squirrel-b0b910.netlify.app/

## 工作流程（重要）

**每次修改代码后，直接提交并推送，不要先询问用户确认。**

```bat
git add .
git commit -m "<简明说明>"
git push
```

推送后 Netlify 会自动重新部署，约 10 秒后线上更新，网址不变。

## 约定

- 纯原生，不引入库 / 框架。
- 逻辑集中在各自 `js/*.js` 的 IIFE 内，通过 DOM id 获取元素。
- 新增 UI 元素后在对应 JS 顶部取引用并绑定事件。
- 双端统一：键盘 + 触屏都可用，移动端页面尽量一屏不滚动。
- 常量集中放文件顶部。
- 不修改全局 git 配置（尤其不要动 `http.https://github.com.proxy`）。
