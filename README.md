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

**A self-hosted audiobook player web app designed for mobile — drop your audiobook folders, deploy via Docker, and start listening on your phone.**

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center">
  <sub>Built with ❤️ by <b>Adrian Stark</b></sub>
</p>

---

## 🎯 Features

- **🎵 Multi-Format Audio Support**
  - MP3, WMA, WAV, FLAC, AAC, OGG, M4A, OPUS, APE, ALAC
  - Server-side FFmpeg transcoding for non-browser-native formats
  - Background auto-transcoding with smart queue management

- **📂 Smart Folder Parsing**
  - Auto-recognizes `Novel Name / Season (Chapter) / Episode` structure
  - Supports Chinese numerals (第一季) and Arabic numerals (Season 1)
  - Single-season books (flat audio files) handled gracefully
  - Auto-play across season boundaries

- **💾 Persistent Playback Memory**
  - Remembers exact position (book + season + episode + second)
  - Auto-save every 10 seconds during playback
  - Resume with configurable rewind (0–30s) for context
  - Quick resume button on bookshelf — one tap to continue

- **⏭️ Skip Intro & Outro**
  - Per-book customizable skip duration
  - Applies globally to all episodes of a book
  - Independent settings for each book

- **📱 Offline & PWA**
  - Download entire seasons for offline listening
  - Download progress tracking with cancel support
  - Configurable cache size (50MB–5GB)
  - Add to home screen for native-like experience

- **🎨 Modern Mobile UI**
  - Dark theme with glassmorphism design
  - Smooth animations (Framer Motion)
  - Bottom navigation (Bookshelf / Favorites / Settings)
  - Mini player bar with full-screen player view
  - Lock-screen controls via Media Session API

- **📚 Library Management**
  - Bookshelf with search and sorting (Recent / A→Z / Z→A)
  - Favorites collection
  - Custom book name, description, and cover image upload
  - Server directory browser for audiobook path selection

- **🔄 Server-Side Data Persistence**
  - Favorites, progress, and settings synced to server
  - Survives redeployment, device change, and browser data clear
  - Covers, metadata, and transcode cache persisted via Docker volume

- **⚡ Smart Transcoding Engine**
  - Auto-transcode first N episodes of new books
  - Pre-transcode upcoming episodes during playback (high priority)
  - Dynamic concurrency (up to CPU cores / 2, max 10)
  - CPU/memory safeguard — pauses when system load exceeds 85%

---

## 🚀 Quick Start

### Prerequisites

- Docker (recommended for deployment)
- Node.js 18+ (for local development)
- FFmpeg (auto-included in Docker image)

### Option 1: One-Click Deploy (Linux)

```bash
# Default (port 3001, audiobooks at ~/audiobooks)
curl -fsSL https://cnb.cool/stark.inc/audiooook_web/-/git/raw/main/deploy.sh | sh

# Custom config (audiobooks at /nas/books, mount /nas for UI browsing)
AUDIOBOOK_DIR=/nas/books MOUNT_DIR=/nas HOST_PORT=8080 \
  curl -fsSL https://cnb.cool/stark.inc/audiooook_web/-/git/raw/main/deploy.sh | sh
```

Access at `http://your-ip:3001` after deployment.

### Option 2: Docker Compose

```bash
git clone https://cnb.cool/stark.inc/audiooook_web.git
cd audiooook_web

# Edit docker-compose.yml to configure volumes and paths, then:
docker compose up -d --build

# Access at http://localhost:3001
```

### Option 3: Docker CLI

```bash
docker build -t audiooook_web .

# Mount host directory at same path for consistent UI browsing
docker run -d -p 3001:4001 \
  -v /nas:/nas \
  -v ./data:/app/server/data \
  -e AUDIOBOOK_PATH=/nas/books \
  --name audiooook_web audiooook_web
```

> **Note**: Mount host directories at the **same path** inside the container (e.g., `-v /nas:/nas`) so the UI directory browser shows consistent paths. Multiple mounts supported: `-v /nas:/nas -v /mnt/media:/mnt/media`

### Option 4: Local Development

```bash
# Install all dependencies
npm run install:all

# Start dev environment
npm run dev

# Frontend: http://localhost:4001
# Backend:  http://localhost:5001
```

Dev management script (Linux/macOS):

```bash
./dev.sh start     # Start
./dev.sh stop      # Stop
./dev.sh restart   # Restart
./dev.sh status    # Check status
./dev.sh logs      # View logs
```

### Quick Update (Docker)

```bash
./update.sh           # Pull latest code & rebuild
./update.sh --force   # Force rebuild even if code is up-to-date
```

---

## 📂 Audiobook Directory Structure

```
audiobooks/
├── Tomb Raiders/                        ← Book name (auto-detected)
│   ├── cover.jpg                        ← Cover image (optional)
│   ├── Season 1 - Seven Star Palace/    ← Season 1
│   │   ├── episode01.wma
│   │   ├── episode02.wma
│   │   └── ...
│   ├── Season 2 - Angry Sea/            ← Season 2
│   │   └── ...
│   └── ...
├── Three-Body Problem/                  ← Single-season book (no subdirs)
│   ├── 01.mp3
│   ├── 02.mp3
│   └── ...
└── Ghost Blows Out the Light/
    ├── 第一季/                           ← Chinese season names supported
    │   └── ...
    └── 第二季/
        └── ...
```

---

## 📂 Project Structure

```
audiooook_web/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/          # BookCard, BottomNav, EpisodeList, MiniPlayer, Player
│   │   ├── pages/               # Bookshelf, BookDetail, Favorites, Settings
│   │   ├── stores/              # Zustand stores (player, book, download)
│   │   └── utils/               # API client, IndexedDB + server sync, formatters
│   └── vite.config.js
├── server/                      # Express backend
│   ├── routes/                  # books, audio, config, user (data persistence)
│   ├── services/                # scanner, transcoder, oss
│   └── utils/                   # parser, paths
├── Dockerfile                   # Multi-stage build with FFmpeg
├── docker-compose.yml           # Production container config
├── deploy.sh                    # One-click Linux deployment (POSIX sh)
├── update.sh                    # Quick Docker update script
├── dev.sh                       # Development environment manager
├── .gitattributes               # Force LF line endings
└── PROJECT_CONTEXT.md           # Comprehensive AI-oriented project docs
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Framer Motion, React Router DOM |
| **Backend** | Node.js, Express, FFmpeg (audio transcoding) |
| **Offline** | IndexedDB (`idb`), Service Worker, VitePWA |
| **Icons** | react-icons (Heroicons v2) |
| **Deployment** | Docker, Docker Compose, POSIX shell scripts |

---

## ⚙️ Configuration

### Port Configuration

| Environment | Frontend | Backend | Access URL |
|------------|----------|---------|------------|
| Development | 4001 (Vite) | 5001 (Express) | http://localhost:4001 |
| Docker | — (static) | 4001 (internal) | http://host:3001 |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | Dev: `5001` / Docker: `4001` |
| `AUDIOBOOK_PATH` | Audiobook directory path | `./audiobooks` |
| `NODE_ENV` | Environment | `production` (Docker) |
| `OSS_REGION` | Alibaba Cloud OSS region | — |
| `OSS_ACCESS_KEY_ID` | OSS Access Key ID | — |
| `OSS_ACCESS_KEY_SECRET` | OSS Access Key Secret | — |
| `OSS_BUCKET` | OSS Bucket name | — |
| `OSS_PREFIX` | OSS file prefix | `audiobooks/` |

### Data Persistence (Docker)

All persistent data is stored in `./data` (bind-mounted to `/app/server/data`):

| File / Directory | Content |
|-----------------|---------|
| `config.json` | Server settings (audiobook path, transcode config) |
| `metadata.json` | Book metadata (custom names, skip settings, covers) |
| `user-data.json` | User data (favorites, progress, settings) |
| `covers/` | Uploaded cover images |
| `transcode-cache/` | Transcoded MP3 files |

> **Important**: Never delete `./data` during updates. Use `./update.sh` for safe updates.

---

## 🔗 Repositories

- **GitHub**: https://github.com/uniStark/audiooook_web
- **CNB**: https://cnb.cool/stark.inc/audiooook_web

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  <sub>Made with ❤️ by <b>Adrian Stark</b></sub>
</p>

**[⬆ Back to Top](#-audiooook_web)**
