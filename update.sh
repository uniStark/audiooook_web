#!/bin/sh
# ============================================================
#  audiooook_web 快速更新脚本
#  拉取最新代码并重建 Docker 容器
#
#  默认从 CNB 仓库拉取，失败时自动切换到 GitHub 备用仓库
#
#  用法:
#    sh update.sh           # 在项目目录下执行
#    sh update.sh --force   # 强制重建（不使用缓存）
# ============================================================

set -e

CONTAINER_NAME="audiooook_web"
IMAGE_NAME="audiooook_web"
CNB_URL="https://cnb.cool/stark.inc/audiooook_web.git"
GITHUB_URL="https://github.com/uniStark/audiooook_web.git"

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

# ========== 1. 确保远程仓库为 CNB ==========
CURRENT_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$CURRENT_URL" != "$CNB_URL" ]; then
  log_info "设置默认远程仓库为 CNB..."
  git remote set-url origin "$CNB_URL" 2>/dev/null || git remote add origin "$CNB_URL"
fi

# ========== 2. 拉取最新代码（CNB 优先，GitHub 备用） ==========
log_info "从 CNB 拉取最新代码..."
FETCH_OK=""
if git fetch origin 2>/dev/null; then
  FETCH_OK="cnb"
  log_info "CNB 拉取成功"
else
  log_warn "CNB 连接失败，尝试 GitHub 备用仓库..."
  git remote set-url origin "$GITHUB_URL"
  if git fetch origin 2>/dev/null; then
    FETCH_OK="github"
    log_info "GitHub 拉取成功"
    # 恢复 CNB 为默认
    git remote set-url origin "$CNB_URL"
  fi
fi

if [ -z "$FETCH_OK" ]; then
  log_error "CNB 和 GitHub 仓库均无法连接，请检查网络"
  exit 1
fi

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
  log_info "代码已更新到 $NEW (来源: $FETCH_OK)"
  git log --oneline -3
  echo ""
fi

# ========== 3. 检测 compose 命令 ==========
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

# ========== 4. 重建并重启 ==========
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

  AUDIOBOOK_DIR="${AUDIOBOOK_DIR:-/data/audiooook_web}"
  MOUNT_DIR="${MOUNT_DIR:-$AUDIOBOOK_DIR}"
  HOST_PORT="${HOST_PORT:-3001}"

  log_info "启动新容器..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${HOST_PORT}:4001" \
    -v "${MOUNT_DIR}:${MOUNT_DIR}" \
    -v "$(pwd)/data:/app/server/data" \
    -e NODE_ENV=production \
    -e AUDIOBOOK_PATH="${AUDIOBOOK_DIR}" \
    -e PORT=4001 \
    --restart unless-stopped \
    "$IMAGE_NAME"
fi

# ========== 5. 清理旧镜像 ==========
log_info "清理无用镜像..."
docker image prune -f >/dev/null 2>&1 || true

# ========== 6. 验证 ==========
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
