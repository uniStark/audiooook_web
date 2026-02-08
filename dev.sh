#!/bin/bash
# ============================================
#  AudioBook 开发环境启停脚本
#  用法:
#    ./dev.sh start   - 启动前后端开发服务器
#    ./dev.sh stop    - 停止所有开发服务器
#    ./dev.sh restart - 重启
#    ./dev.sh status  - 查看运行状态
#    ./dev.sh logs    - 查看日志
#    ./dev.sh install - 安装所有依赖
#    ./dev.sh build   - 构建生产版本
# ============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.dev-pids"
LOG_DIR="$ROOT_DIR/.dev-logs"

SERVER_PORT=5001
CLIENT_PORT=4001

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_title() { echo -e "\n${CYAN}====== $1 ======${NC}\n"; }

# 确保目录存在
ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

# 检查端口是否被占用，返回占用进程的PID
get_port_pid() {
  local port=$1
  if command -v lsof &>/dev/null; then
    lsof -ti :"$port" 2>/dev/null || true
  elif command -v netstat &>/dev/null; then
    netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $NF}' | cut -d'/' -f1 || true
  elif command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' || true
  fi
}

# 杀掉指定端口的进程
kill_port() {
  local port=$1
  local pids
  pids=$(get_port_pid "$port")
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill "$pid" 2>/dev/null && log_info "已停止端口 $port 上的进程 (PID: $pid)" || true
    done
    sleep 1
  fi
}

# 检查 Node.js 环境
check_env() {
  if ! command -v node &>/dev/null; then
    log_error "未找到 Node.js，请先安装: https://nodejs.org"
    exit 1
  fi

  if ! command -v npm &>/dev/null; then
    log_error "未找到 npm"
    exit 1
  fi

  # 检查依赖是否已安装
  if [ ! -d "$ROOT_DIR/node_modules" ] || [ ! -d "$ROOT_DIR/server/node_modules" ] || [ ! -d "$ROOT_DIR/client/node_modules" ]; then
    log_warn "依赖未完整安装，正在自动安装..."
    do_install
  fi
}

# 安装依赖
do_install() {
  log_title "安装依赖"

  log_info "安装根目录依赖..."
  cd "$ROOT_DIR" && npm install

  log_info "安装服务端依赖..."
  cd "$ROOT_DIR/server" && npm install

  log_info "安装客户端依赖..."
  cd "$ROOT_DIR/client" && npm install

  cd "$ROOT_DIR"
  log_info "所有依赖安装完成"
}

# 启动服务端
start_server() {
  ensure_dirs

  # 检查是否已在运行
  if [ -f "$PID_DIR/server.pid" ]; then
    local old_pid
    old_pid=$(cat "$PID_DIR/server.pid")
    if kill -0 "$old_pid" 2>/dev/null; then
      log_warn "服务端已在运行 (PID: $old_pid)"
      return 0
    fi
  fi

  # 释放端口
  kill_port $SERVER_PORT

  log_info "启动服务端 (端口: $SERVER_PORT)..."
  cd "$ROOT_DIR/server"
  nohup node --watch index.js > "$LOG_DIR/server.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_DIR/server.pid"
  cd "$ROOT_DIR"

  # 等待启动
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    log_info "服务端启动成功 (PID: $pid) -> http://localhost:$SERVER_PORT"
  else
    log_error "服务端启动失败，查看日志: $LOG_DIR/server.log"
    return 1
  fi
}

# 启动客户端
start_client() {
  ensure_dirs

  if [ -f "$PID_DIR/client.pid" ]; then
    local old_pid
    old_pid=$(cat "$PID_DIR/client.pid")
    if kill -0 "$old_pid" 2>/dev/null; then
      log_warn "客户端已在运行 (PID: $old_pid)"
      return 0
    fi
  fi

  kill_port $CLIENT_PORT

  log_info "启动客户端 (端口: $CLIENT_PORT)..."
  cd "$ROOT_DIR/client"
  nohup npx vite > "$LOG_DIR/client.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_DIR/client.pid"
  cd "$ROOT_DIR"

  # 等待 Vite 启动
  sleep 3
  if kill -0 "$pid" 2>/dev/null; then
    # 检查实际端口（Vite 可能使用其他端口）
    local actual_port
    actual_port=$(grep -oP 'localhost:\K[0-9]+' "$LOG_DIR/client.log" 2>/dev/null | head -1 || echo "$CLIENT_PORT")
    log_info "客户端启动成功 (PID: $pid) -> http://localhost:$actual_port"
  else
    log_error "客户端启动失败，查看日志: $LOG_DIR/client.log"
    return 1
  fi
}

# 停止服务
stop_service() {
  local name=$1
  local pid_file="$PID_DIR/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      # 先发 SIGTERM，优雅退出
      kill "$pid" 2>/dev/null
      # 等待最多5秒
      local count=0
      while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
        sleep 1
        count=$((count + 1))
      done
      # 还在运行就强制杀
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
      log_info "$name 已停止 (PID: $pid)"
    else
      log_warn "$name 进程已不存在 (PID: $pid)"
    fi
    rm -f "$pid_file"
  else
    log_warn "$name 未在运行"
  fi
}

# ========== 命令 ==========

cmd_start() {
  log_title "启动开发环境"
  check_env
  start_server
  start_client

  echo ""
  log_info "开发环境已就绪:"
  echo -e "  ${CYAN}后端 API${NC}  -> http://localhost:$SERVER_PORT"
  echo -e "  ${CYAN}前端页面${NC}  -> http://localhost:$CLIENT_PORT"
  echo -e "  ${CYAN}有声书目录${NC} -> $ROOT_DIR/audiobooks"
  echo ""
  log_info "使用 ${YELLOW}./dev.sh stop${NC} 停止, ${YELLOW}./dev.sh logs${NC} 查看日志"
}

cmd_stop() {
  log_title "停止开发环境"
  stop_service "client"
  stop_service "server"

  # 兜底：确保端口释放
  kill_port $SERVER_PORT
  kill_port $CLIENT_PORT

  log_info "开发环境已全部停止"
}

cmd_restart() {
  cmd_stop
  sleep 1
  cmd_start
}

cmd_status() {
  log_title "服务状态"

  for name in server client; do
    local pid_file="$PID_DIR/${name}.pid"
    if [ -f "$pid_file" ]; then
      local pid
      pid=$(cat "$pid_file")
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} $name  运行中 (PID: $pid)"
      else
        echo -e "  ${RED}●${NC} $name  已停止 (PID文件残留)"
        rm -f "$pid_file"
      fi
    else
      echo -e "  ${RED}●${NC} $name  未运行"
    fi
  done
  echo ""
}

cmd_logs() {
  local target=${1:-all}
  log_title "开发日志"

  if [ "$target" = "server" ] || [ "$target" = "all" ]; then
    if [ -f "$LOG_DIR/server.log" ]; then
      echo -e "${CYAN}--- 服务端日志 (最近30行) ---${NC}"
      tail -n 30 "$LOG_DIR/server.log"
      echo ""
    fi
  fi

  if [ "$target" = "client" ] || [ "$target" = "all" ]; then
    if [ -f "$LOG_DIR/client.log" ]; then
      echo -e "${CYAN}--- 客户端日志 (最近30行) ---${NC}"
      tail -n 30 "$LOG_DIR/client.log"
      echo ""
    fi
  fi

  if [ "$target" != "server" ] && [ "$target" != "client" ] && [ "$target" != "all" ]; then
    log_error "未知日志目标: $target (可选: server, client, all)"
  fi
}

cmd_build() {
  log_title "构建生产版本"
  check_env
  cd "$ROOT_DIR/client" && npm run build
  cd "$ROOT_DIR"
  log_info "构建完成，输出目录: client/dist/"
  log_info "使用 ${YELLOW}npm start${NC} 启动生产服务"
}

cmd_help() {
  echo ""
  echo "AudioBook 开发环境启停脚本"
  echo ""
  echo "用法: ./dev.sh <命令>"
  echo ""
  echo "命令:"
  echo "  start          启动前后端开发服务器"
  echo "  stop           停止所有开发服务器"
  echo "  restart        重启开发环境"
  echo "  status         查看运行状态"
  echo "  logs [target]  查看日志 (target: server|client|all)"
  echo "  install        安装所有依赖"
  echo "  build          构建生产版本"
  echo "  help           显示帮助信息"
  echo ""
}

# ========== 入口 ==========

case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs "$2" ;;
  install) do_install ;;
  build)   cmd_build ;;
  help|-h|--help) cmd_help ;;
  *)
    log_error "未知命令: $1"
    cmd_help
    exit 1
    ;;
esac
