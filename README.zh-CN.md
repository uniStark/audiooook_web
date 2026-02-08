# 🎧 audiooook_web

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/FFmpeg-Transcoding-007808?style=flat-square&logo=ffmpeg&logoColor=white" alt="FFmpeg">
  <img src="https://img.shields.io/badge/PWA-Offline-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

**自托管的在线有声书播放器 — 放入有声书文件夹，Docker 一键部署，手机即可收听。**

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center">
  <sub>由 <b>Adrian Stark</b> 用 ❤️ 打造</sub>
</p>

---

## 🎯 功能特性

- **🎵 多格式音频支持**
  - MP3、WMA、WAV、FLAC、AAC、OGG、M4A、OPUS、APE、ALAC
  - 服务端 FFmpeg 自动转码非浏览器原生格式
  - 后台智能转码队列管理

- **📂 智能文件夹解析**
  - 自动识别 `小说名 / 季(章节) / 集` 目录结构
  - 支持中文数字（第一季）和阿拉伯数字（Season 1）
  - 无季结构的单本书（直接放音频文件）也能正常识别
  - 跨季自动连播

- **💾 播放记忆持久化**
  - 精确记录播放位置（书 + 季 + 集 + 秒）
  - 播放中每 10 秒自动保存
  - 继续播放时可配置回退秒数（0–30秒）
  - 书架上一键继续播放按钮

- **⏭️ 跳过片头片尾**
  - 每本书独立设置跳过时长
  - 设置后全书所有章节生效
  - 各书互不影响

- **📱 离线 & PWA**
  - 整季下载，离线收听
  - 下载进度跟踪，支持取消
  - 可配置缓存大小（50MB–5GB）
  - 添加到主屏幕，接近原生 App 体验

- **🎨 现代移动端 UI**
  - 暗色主题 + 毛玻璃效果
  - 丝滑动效（Framer Motion）
  - 底部导航栏（书架 / 收藏 / 设置）
  - 迷你播放条 + 全屏播放器
  - 锁屏控制（Media Session API）

- **📚 书库管理**
  - 书架搜索 + 排序（最近播放 / 名称正序 / 名称倒序）
  - 收藏功能
  - 自定义书名、简介、封面上传
  - UI 中浏览服务器目录并选择有声书路径

- **🔄 服务端数据持久化**
  - 收藏、播放进度、用户设置同步到服务端
  - 重新部署 / 换设备 / 清浏览器数据后不丢失
  - 封面、元数据、转码缓存通过 Docker 卷持久化

- **⚡ 智能转码引擎**
  - 新书自动转码前 N 集
  - 播放时预转码接下来的几集（高优先级）
  - 动态并发（最高 CPU 核数 / 2，上限 10）
  - CPU / 内存超 85% 时自动暂停，防止服务器宕机

---

## 🚀 快速开始

### 环境要求

- Docker（推荐用于部署）
- Node.js 18+（本地开发）
- FFmpeg（Docker 镜像已自带）

### 方案一：一键部署（Linux）

```bash
# 默认部署（端口 3001，有声书目录 ~/audiobooks）
curl -fsSL https://cnb.cool/stark.inc/audiooook_web/-/git/raw/main/deploy.sh | sh

# 自定义配置（有声书在 /nas/books，挂载 /nas 以支持 UI 目录浏览）
AUDIOBOOK_DIR=/nas/books MOUNT_DIR=/nas HOST_PORT=8080 \
  curl -fsSL https://cnb.cool/stark.inc/audiooook_web/-/git/raw/main/deploy.sh | sh
```

部署完成后访问 `http://你的IP:3001` 即可使用。

### 方案二：Docker Compose

```bash
git clone https://cnb.cool/stark.inc/audiooook_web.git
cd audiooook_web

# 修改 docker-compose.yml 中的挂载路径，然后：
docker compose up -d --build

# 访问 http://localhost:3001
```

### 方案三：Docker 命令

```bash
docker build -t audiooook_web .

# 将宿主机目录以同路径挂载进容器，确保 UI 浏览路径一致
docker run -d -p 3001:4001 \
  -v /nas:/nas \
  -v ./data:/app/server/data \
  -e AUDIOBOOK_PATH=/nas/books \
  --name audiooook_web audiooook_web
```

> **注意**：挂载的宿主机目录在容器内保持同路径（如 `-v /nas:/nas`），这样 UI 中浏览和选择的目录路径在容器内外一致。支持多目录挂载：`-v /nas:/nas -v /mnt/media:/mnt/media`

### 方案四：本地开发

```bash
# 安装所有依赖
npm run install:all

# 启动开发环境
npm run dev

# 前端: http://localhost:4001
# 后端: http://localhost:5001
```

开发环境管理脚本（Linux/macOS）：

```bash
./dev.sh start     # 启动
./dev.sh stop      # 停止
./dev.sh restart   # 重启
./dev.sh status    # 查看状态
./dev.sh logs      # 查看日志
```

### 快速更新（Docker）

```bash
./update.sh           # 拉取最新代码并重建
./update.sh --force   # 强制重建（即使代码已是最新）
```

---

## 📂 有声书目录结构

```
audiobooks/
├── 盗墓笔记/                              ← 小说名（自动识别为书名）
│   ├── cover.jpg                          ← 封面图片（可选）
│   ├── 盗墓笔记1之七星鲁王宫(周建龙)[42回]/  ← 第一季
│   │   ├── 盗墓笔记1-七星鲁王宫01.wma
│   │   ├── 盗墓笔记1-七星鲁王宫02.wma
│   │   └── ...
│   ├── 盗墓笔记2之怒海潜沙(周建龙)[40回]/    ← 第二季
│   │   └── ...
│   └── ...
├── 鬼吹灯/
│   ├── 第一季/
│   │   └── 01.mp3 ...
│   └── 第二季/
│       └── ...
└── 三体/                                  ← 也支持无季结构（直接放音频文件）
    ├── 三体01.mp3
    └── ...
```

---

## 📂 项目结构

```
audiooook_web/
├── client/                      # React 前端（Vite）
│   ├── src/
│   │   ├── components/          # BookCard, BottomNav, EpisodeList, MiniPlayer, Player
│   │   ├── pages/               # Bookshelf, BookDetail, Favorites, Settings
│   │   ├── stores/              # Zustand 状态管理（player, book, download）
│   │   └── utils/               # API 客户端, IndexedDB + 服务端同步, 格式化工具
│   └── vite.config.js
├── server/                      # Express 后端
│   ├── routes/                  # books, audio, config, user（数据持久化）
│   ├── services/                # scanner, transcoder, oss
│   └── utils/                   # parser, paths
├── Dockerfile                   # 多阶段构建（含 FFmpeg）
├── docker-compose.yml           # 生产环境容器配置
├── deploy.sh                    # 一键部署脚本（POSIX sh 兼容）
├── update.sh                    # Docker 快速更新脚本
├── dev.sh                       # 开发环境管理脚本
├── .gitattributes               # 强制 LF 换行符
└── PROJECT_CONTEXT.md           # AI 友好的项目全量文档
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18、Vite、Tailwind CSS、Zustand、Framer Motion、React Router DOM |
| **后端** | Node.js、Express、FFmpeg（音频转码） |
| **离线** | IndexedDB（`idb`）、Service Worker、VitePWA |
| **图标** | react-icons（Heroicons v2） |
| **部署** | Docker、Docker Compose、POSIX Shell 脚本 |

---

## ⚙️ 配置说明

### 端口配置

| 环境 | 前端 | 后端 | 访问地址 |
|------|------|------|---------|
| 开发环境 | 4001 (Vite) | 5001 (Express) | http://localhost:4001 |
| Docker | —（静态文件） | 4001（容器内） | http://宿主机:3001 |

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 开发: `5001` / Docker: `4001` |
| `AUDIOBOOK_PATH` | 有声书目录路径 | `./audiobooks` |
| `NODE_ENV` | 运行环境 | `production`（Docker） |
| `OSS_REGION` | 阿里云 OSS 区域 | — |
| `OSS_ACCESS_KEY_ID` | OSS Access Key ID | — |
| `OSS_ACCESS_KEY_SECRET` | OSS Access Key Secret | — |
| `OSS_BUCKET` | OSS Bucket 名称 | — |
| `OSS_PREFIX` | OSS 文件前缀 | `audiobooks/` |

### 数据持久化（Docker）

所有持久化数据存储在 `./data`（挂载到容器内 `/app/server/data`）：

| 文件 / 目录 | 内容 |
|-------------|------|
| `config.json` | 服务器设置（有声书路径、转码配置） |
| `metadata.json` | 书籍元数据（自定义书名、片头片尾设置、封面路径） |
| `user-data.json` | 用户数据（收藏、播放进度、用户设置） |
| `covers/` | 上传的封面图片 |
| `transcode-cache/` | 转码后的 MP3 文件 |

> **重要**：更新时请勿删除 `./data` 目录。请使用 `./update.sh` 进行安全更新。

---

## 🔗 仓库地址

- **GitHub**: https://github.com/uniStark/audiooook_web
- **CNB**: https://cnb.cool/stark.inc/audiooook_web

---

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 打开一个 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证。

---

<p align="center">
  <sub>由 <b>Adrian Stark</b> 用 ❤️ 打造</sub>
</p>

**[⬆ 返回顶部](#-audiooook_web)**
