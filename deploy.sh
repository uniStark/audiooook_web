#!/bin/sh
# ============================================================
#  audiooook_web 一键部署脚本
#  从 CNB 仓库拉取代码并通过 Docker 部署
#
#  用法:
#    curl -fsSL https://cnb.cool/stark.inc/audiooook_web/-/git/raw/main/deploy.sh | sh
#  或:
#    sh deploy.sh
#
#  可选参数:
#    AUDIOBOOK_DIR  有声书本地目录 (默认: ~/audiobooks)
#    HOST_PORT      对外访问端口   (默认: 3001)
#    INSTALL_DIR    项目安装目录   (默认: /opt/audiooook_web)
# ============================================================

set -e

# ========== 配置 ==========
REPO_URL="https://cnb.cool/stark.inc/audiooook_web.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/audiooook_web}"
AUDIOBOOK_DIR="${AUDIOBOOK_DIR:-$HOME/audiobooks}"
HOST_PORT="${HOST_PORT:-3001}"
CONTAINER_PORT=4001
CONTAINER_NAME="audiooook_web"
IMAGE_NAME="audiooook_web"

# ========== 颜色 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { printf "${GREEN}[INFO]${NC}  %s\n" "$1"; }
log_warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }
log_title() { printf "\n${CYAN}══════════════════════════════════════${NC}\n"; printf "${CYAN}  %s${NC}\n" "$1"; printf "${CYAN}══════════════════════════════════════${NC}\n\n"; }

# ========== 检查依赖 ==========
check_dependencies() {
  log_title "检查环境依赖"

  # 检查 git
  if ! command -v git >/dev/null 2>&1; then
    log_error "未找到 git，请先安装:"
    echo "  Ubuntu/Debian: sudo apt install -y git"
    echo "  CentOS/RHEL:   sudo yum install -y git"
    exit 1
  fi
  log_info "git .............. $(git --version | head -1)"

  # 检查 docker
  if ! command -v docker >/dev/null 2>&1; then
    log_warn "未找到 Docker，正在尝试自动安装..."
    install_docker
  fi
  log_info "docker ........... $(docker --version)"

  # 检查 docker compose
  COMPOSE_CMD=""
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    log_info "docker compose ... $(docker compose version --short 2>/dev/null || echo 'available')"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    log_info "docker-compose ... $(docker-compose --version | head -1)"
  else
    log_warn "未找到 docker compose，将使用 docker build/run 方式部署"
  fi

  # 检查 Docker 是否运行
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker 未运行，请先启动 Docker"
    echo "  sudo systemctl start docker"
    exit 1
  fi
}

# 自动安装 Docker
install_docker() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian)
        sudo apt-get update -qq
        sudo apt-get install -y -qq docker.io docker-compose-plugin
        sudo systemctl enable --now docker
        ;;
      centos|rhel|fedora)
        sudo yum install -y docker docker-compose-plugin
        sudo systemctl enable --now docker
        ;;
      *)
        log_error "不支持自动安装 Docker 的系统: $ID"
        echo "请手动安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
        ;;
    esac
    # 将当前用户加入 docker 组
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    log_info "Docker 安装完成"
  else
    log_error "无法检测操作系统，请手动安装 Docker"
    exit 1
  fi
}

# ========== 拉取代码 ==========
pull_code() {
  log_title "拉取代码"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "项目已存在，正在更新..."
    cd "$INSTALL_DIR"
    git fetch origin
    git reset --hard origin/main
    log_info "代码已更新到最新"
  else
    log_info "克隆项目到: $INSTALL_DIR"
    sudo mkdir -p "$(dirname "$INSTALL_DIR")"
    sudo chown "$USER":"$USER" "$(dirname "$INSTALL_DIR")" 2>/dev/null || true
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    log_info "代码克隆完成"
  fi
}

# ========== 准备目录 ==========
prepare_dirs() {
  log_title "准备目录"

  # 创建有声书目录
  if [ ! -d "$AUDIOBOOK_DIR" ]; then
    mkdir -p "$AUDIOBOOK_DIR"
    log_info "已创建有声书目录: $AUDIOBOOK_DIR"
  else
    log_info "有声书目录已存在: $AUDIOBOOK_DIR"
  fi

  # 统计有声书
  book_count=$(find "$AUDIOBOOK_DIR" -maxdepth 1 -type d | wc -l)
  book_count=$((book_count - 1))
  if [ "$book_count" -gt 0 ]; then
    log_info "检测到 $book_count 本有声书"
  else
    log_warn "有声书目录为空，部署后请将有声书放入: $AUDIOBOOK_DIR"
  fi
}

# ========== 停止旧容器 ==========
stop_old() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_info "停止并移除旧容器..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
  fi
}

# ========== 构建和启动 ==========
deploy() {
  log_title "构建和部署"

  cd "$INSTALL_DIR"
  stop_old

  if [ -n "$COMPOSE_CMD" ]; then
    # 使用 docker compose 部署
    export AUDIOBOOK_DIR HOST_PORT

    # 生成临时 compose 覆盖文件
    cat > docker-compose.override.yml <<EOF
version: '3.8'
services:
  audiooook_web:
    ports:
      - "${HOST_PORT}:${CONTAINER_PORT}"
    volumes:
      - ${AUDIOBOOK_DIR}:/audiobooks
      - audiooook_data:/app/server/data
EOF

    log_info "使用 Docker Compose 构建镜像..."
    $COMPOSE_CMD build

    log_info "启动容器..."
    $COMPOSE_CMD up -d

    rm -f docker-compose.override.yml
  else
    # 直接使用 docker 命令
    log_info "构建 Docker 镜像..."
    docker build -t "$IMAGE_NAME" .

    log_info "启动容器..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p "${HOST_PORT}:${CONTAINER_PORT}" \
      -v "${AUDIOBOOK_DIR}:/audiobooks" \
      -v audiooook_data:/app/server/data \
      -e NODE_ENV=production \
      -e AUDIOBOOK_PATH=/audiobooks \
      -e PORT=${CONTAINER_PORT} \
      --restart unless-stopped \
      "$IMAGE_NAME"
  fi
}

# ========== 验证部署 ==========
verify() {
  log_title "验证部署"

  # 等待容器启动
  retries=10
  i=0
  while [ $i -lt $retries ]; do
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      break
    fi
    sleep 1
    i=$((i + 1))
  done

  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_info "容器运行中"

    # 等待服务就绪
    sleep 3

    # 测试接口
    if command -v curl >/dev/null 2>&1; then
      status=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/api/config" 2>/dev/null || echo "000")
      if [ "$status" = "200" ]; then
        log_info "API 接口正常 (HTTP 200)"
      else
        log_warn "API 接口暂未就绪 (HTTP $status)，可能正在启动中"
      fi
    fi
  else
    log_error "容器启动失败，查看日志:"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -20
    exit 1
  fi
}

# ========== 完成 ==========
done_msg() {
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")

  printf "\n"
  printf "${GREEN}══════════════════════════════════════${NC}\n"
  printf "${GREEN}  部署成功！${NC}\n"
  printf "${GREEN}══════════════════════════════════════${NC}\n"
  printf "\n"
  printf "  ${CYAN}访问地址${NC}    http://localhost:%s\n" "$HOST_PORT"
  if [ -n "$ip" ]; then
    printf "  ${CYAN}局域网地址${NC}  http://%s:%s\n" "$ip" "$HOST_PORT"
  fi
  printf "  ${CYAN}有声书目录${NC}  %s\n" "$AUDIOBOOK_DIR"
  printf "  ${CYAN}项目目录${NC}    %s\n" "$INSTALL_DIR"
  printf "\n"
  printf "  常用命令:\n"
  printf "    ${YELLOW}docker logs -f %s${NC}        查看日志\n" "$CONTAINER_NAME"
  printf "    ${YELLOW}docker restart %s${NC}        重启服务\n" "$CONTAINER_NAME"
  printf "    ${YELLOW}docker stop %s${NC}           停止服务\n" "$CONTAINER_NAME"
  printf "    ${YELLOW}cd %s && sh deploy.sh${NC}  更新部署\n" "$INSTALL_DIR"
  printf "\n"
  printf "  将有声书按如下结构放入 ${CYAN}%s${NC} 即可:\n" "$AUDIOBOOK_DIR"
  printf "    小说名/季(章节)文件夹/音频文件.mp3\n"
  printf "\n"
}

# ========== 主流程 ==========
main() {
  log_title "audiooook_web 一键部署"
  echo "  仓库: $REPO_URL"
  echo "  安装: $INSTALL_DIR"
  echo "  端口: $HOST_PORT -> $CONTAINER_PORT"
  echo "  书库: $AUDIOBOOK_DIR"

  check_dependencies
  pull_code
  prepare_dirs
  deploy
  verify
  done_msg
}

main "$@"
