# 部署上线指南（GitHub Pages · 固定网址 + 自动更新）

目标：把本项目发布到一个**固定网址**，之后只要 `git push`，网站自动更新。
纯静态项目（HTML / CSS / JS），无需服务器、无需构建，用 **GitHub Pages** 即可，**免费且没有构建额度限制**。

- 仓库：https://github.com/ssy777777/sun
- 线上地址：**https://ssy777777.github.io/sun/**

---

## 一、推到 GitHub

在 `J:\qianduan` 打开命令行，依次执行（若尚未初始化过 git）：

```bat
git init
git add .
git commit -m "init: 前端练习项目"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 之后每次改完代码：
> ```bat
> git add .
> git commit -m "更新说明"
> git push
> ```

## 二、开启 GitHub Pages（一次性）

1. 打开仓库 **Settings → Pages**：
   `https://github.com/<用户名>/<仓库名>/settings/pages`
2. **Build and deployment → Source** 选 **Deploy from a branch**。
3. **Branch** 选 `main`，文件夹选 **`/ (root)`** → **Save**。
4. 等 1~2 分钟，访问：
   `https://<用户名>.github.io/<仓库名>/`

本仓库即：`https://ssy777777.github.io/sun/`

> 免费账号的 Pages 需要仓库为 **Public（公开）**：
> Settings → General → 拉到最底 **Danger Zone → Change repository visibility → Public**。

## 三、之后怎么更新

改完代码 `git push` 即可，GitHub Pages 会自动重新发布，网址不变（通常 1 分钟内）。

> 若页面没更新，多为浏览器缓存：手机/电脑强刷一次（`Ctrl+F5`），或在网址后加 `?v=2`。

---

## 常见问题

- **打开是 404**：确认 Pages 的 Source/Branch 设为 `main` + `/ (root)`；确认仓库为 Public；首次开启需等 1~2 分钟。
- **样式/脚本没加载**：本项目一律用**相对路径**（如 `./demo2/`、`./js/xxx.js`），放在 `/sun/` 子路径下也能正常工作，无需改路径。
- **想用自定义域名**：
  1. 在 Pages 设置 **Custom domain** 填你的域名（如 `sunsite.com`）。
  2. 到域名商的 DNS 添加：根域名 4 条 **A 记录**指向
     `185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153`；
     `www` 加一条 **CNAME** 指向 `<用户名>.github.io`。
  3. 保存后勾选 **Enforce HTTPS**（GitHub 免费提供证书）。
  - GitHub Pages 是海外服务器，用自定义域名**不需要备案**，但国内访问速度一般。

---

## 本地预览（开发时用）

```bat
cd /d J:\qianduan
python -m http.server 8000
```

- 电脑：http://localhost:8000
- 手机（同一 WiFi）：http://<电脑局域网IP>:8000

> `python -m http.server` 仅用于本地调试，不要用它对外长期提供服务。

---

## 为什么不用 Netlify / Vercel

- **Netlify**：免费额度（构建分钟）用尽后会暂停生产部署，需等周期重置或付费。
- **Vercel**：注册需要海外手机号验证，国内号码常失败。
- **GitHub Pages**：直接读现有仓库分支，推送即发布，**无构建额度**，最省心。

（三者都可通过同一 GitHub 仓库部署，可按需切换。）
