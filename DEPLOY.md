# 部署上线指南（固定网址 + 自动更新）

目标：把本项目发布到一个**固定域名**，之后只要 `git push`，网站自动更新。
纯静态项目（HTML / CSS / JS），无需服务器，用静态托管平台即可。

推荐组合：**GitHub 仓库 + Vercel**（或 Cloudflare Pages），免费且自动部署。

---

## 一、把项目变成 Git 仓库

在 `J:\qianduan` 打开命令行，依次执行：

```bat
git init
git add .
git commit -m "init: 前端练习项目（demo1/demo2/demo3）"
git branch -M main
```

## 二、推到 GitHub

1. 在 https://github.com 新建一个仓库（空仓库，不要勾选 README）。
2. 关联并推送（把下面的地址换成你的仓库地址）：

```bat
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 之后每次改完代码：
> ```bat
> git add .
> git commit -m "更新说明"
> git push
> ```

## 三、用 Vercel 自动部署（推荐）

1. 打开 https://vercel.com ，用 GitHub 账号登录。
2. Add New → Project → 选择刚推送的仓库 → Import。
3. Framework Preset 选 **Other**（纯静态），直接 Deploy。
4. 完成后得到一个固定网址，例如 `https://你的项目名.vercel.app`，任何设备都能访问。
5. 之后每次 `git push`，Vercel 会自动重新部署，网址不变。

### 绑定自有域名（可选，得到完全固定的域名）
1. 在域名服务商处购买域名（如 `.com` / `.cn`）。
2. Vercel 项目 → Settings → Domains → 添加你的域名。
3. 按提示到域名商处添加 DNS 记录（Vercel 会给出具体值）。
4. 生效后即可用 `https://你的域名` 访问。

---

## 备选平台

| 平台 | 固定网址 | 自动部署 | 备注 |
| --- | --- | --- | --- |
| Vercel | `xxx.vercel.app` | ✅ 连接 GitHub | 首推，界面简单 |
| Cloudflare Pages | `xxx.pages.dev` | ✅ 连接 GitHub | 速度快，全球 CDN |
| Netlify | `xxx.netlify.app` | ✅ 连接 GitHub | 也可拖拽文件夹（拖拽不自动） |
| GitHub Pages | `用户名.github.io/仓库` | ✅ push 即发布 | 仓库 Settings → Pages 开启 |

### GitHub Pages 快速开启
仓库 → Settings → Pages → Build and deployment → Source 选 `Deploy from a branch`，
Branch 选 `main` / `root` → Save。稍等 1 分钟即可访问固定网址。

---

## 关于“固定 IP”

静态托管平台走 CDN，**不提供固定 IP**（IP 会变化）。如果确实需要固定 IP，只能：
- 租一台云服务器（阿里云 / 腾讯云 / EC2 等），分配固定公网 IP；
- 在服务器上装 Nginx，把项目目录作为站点根目录；
- 用 `git pull` 或 CI 脚本更新。

但对本站这种静态项目，**固定域名**完全可以满足需求，且免运维，更划算。

---

## 本地预览（开发时用）

```bat
cd /d J:\qianduan
python -m http.server 8000
```

- 电脑：http://localhost:8000
- 手机（同一 WiFi）：http://<电脑局域网IP>:8000

> `python -m http.server` 仅用于本地调试，不要用它对外长期提供服务。
