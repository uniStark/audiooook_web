#!/bin/sh
# ============================================================
#  audiooook_web 快速更新脚本
#  拉取最新代码并重建 Docker 容器
#
#  用法:
#    sh update.sh           # 在项目目录下执行
#    sh update.sh --force   # 强制重建（不使用缓存）
# ============================================================

set -e

CONTAINER_NAME="audiooook_web"
IMAGE_NAME="audiooook_web"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { printf "${GREEN}[INFO]${NC}  %s\n" "$1"; }
log_warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

# 检查是否在项目目录
if [ ! -f "docker-compose.yml" ] || [ ! -f "Dockerfile" ]; then
  log_error "请在 audiooook_web 项目根目录下执行此脚本"
  exit 1
fi

PROJECT_DIR="$(pwd)"
FORCE_BUILD=""
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
  FORCE_BUILD="--no-cache"
  log_info "强制重建模式（不使用缓存）"
fi

printf "\n${CYAN}══════════════════════════════════════${NC}\n"
printf "${CYAN}  audiooook_web 快速更新${NC}\n"
printf "${CYAN}══════════════════════════════════════${NC}\n\n"

# ========== 1. 拉取最新代码 ==========
log_info "拉取最新代码..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ] && [ -z "$FORCE_BUILD" ]; then
  log_info "代码已是最新版本 ($LOCAL)"
  printf "\n是否仍要重建容器？[y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) log_info "继续重建..." ;;
    *) log_info "无需更新，退出"; exit 0 ;;
  esac
else
  git reset --hard origin/main
  NEW=$(git rev-parse --short HEAD)
  log_info "代码已更新到 $NEW"
  git log --oneline -3
  echo ""
fi

# ========== 2. 检测 compose 命令 ==========
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

# ========== 3. 重建并重启 ==========
if [ -n "$COMPOSE_CMD" ]; then
  log_info "停止旧容器..."
  $COMPOSE_CMD down 2>/dev/null || true

  log_info "重建镜像..."
  $COMPOSE_CMD build $FORCE_BUILD

  log_info "启动新容器..."
  $COMPOSE_CMD up -d
else
  log_info "停止旧容器..."
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true

  log_info "重建镜像..."
  docker build $FORCE_BUILD -t "$IMAGE_NAME" .

  # 读取之前的挂载配置
  AUDIOBOOK_DIR="${AUDIOBOOK_DIR:-$HOME/audiobooks}"
  HOST_PORT="${HOST_PORT:-3001}"

  log_info "启动新容器..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${HOST_PORT}:4001" \
    -v "${AUDIOBOOK_DIR}:/audiobooks" \
    -v "$(pwd)/data:/app/server/data" \
    -e NODE_ENV=production \
    -e AUDIOBOOK_PATH=/audiobooks \
    -e PORT=4001 \
    --restart unless-stopped \
    "$IMAGE_NAME"
fi

# ========== 4. 清理旧镜像 ==========
log_info "清理无用镜像..."
docker image prune -f >/dev/null 2>&1 || true

# ========== 5. 验证 ==========
sleep 3
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if command -v curl >/dev/null 2>&1; then
    status=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT:-3001}/api/config" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
      log_info "服务正常运行 (HTTP 200)"
    else
      log_warn "服务启动中 (HTTP $status)，请稍等几秒后访问"
    fi
  else
    log_info "容器已启动"
  fi
  printf "\n${GREEN}更新完成！${NC}\n\n"
else
  log_error "容器启动失败，查看日志: docker logs $CONTAINER_NAME"
  exit 1
fi
