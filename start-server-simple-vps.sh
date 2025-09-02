#!/bin/bash

# Простой запуск сервера без зависаний

echo "🚀 Простой запуск сервера..."
echo "============================"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

cd /var/www/malabar || { error "Директория не найдена!"; exit 1; }

echo ""
echo "🛑 1. Остановка старых процессов"
echo "================================"

pkill -f "node.*server" 2>/dev/null && log "Node процессы остановлены" || info "Node процессы не найдены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены" || info "npm процессы не найдены"

if command -v pm2 > /dev/null; then
    timeout 5 pm2 delete all 2>/dev/null || true
    log "PM2 процессы очищены"
fi

sleep 2

echo ""
echo "🔍 2. Проверка готовности"
echo "========================="

# Проверяем файлы
if [ ! -f "server/server.js" ]; then
    error "server/server.js не найден!"
    exit 1
fi

if [ ! -d "server/node_modules" ]; then
    error "server/node_modules не найдена!"
    echo "Сначала установите зависимости:"
    echo "  ./install-critical-deps-vps.sh"
    exit 1
fi

log "Файлы сервера готовы"

# Проверяем БД
if [ ! -f "server/malabar.db" ]; then
    warn "База данных не найдена, создаем пустую..."
    touch server/malabar.db
    chmod 664 server/malabar.db 2>/dev/null
fi

log "База данных готова"

echo ""
echo "⚙️ 3. Создание простой конфигурации"
echo "==================================="

# Создаем минимальную PM2 конфигурацию
cat > ecosystem.simple.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'malabar-server',
      script: 'server.js',
      cwd: './server',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: '../logs/server.log',
      error_file: '../logs/server-error.log',
      out_file: '../logs/server-out.log',
      time: true
    }
  ]
};
EOF

mkdir -p logs
log "Конфигурация создана"

echo ""
echo "🚀 4. Запуск сервера"
echo "==================="

info "Запускаем API сервер через PM2..."

# Запускаем с таймаутом
timeout 15 pm2 start ecosystem.simple.js 2>/dev/null

if [ $? -eq 0 ]; then
    log "PM2 запущен"
else
    warn "PM2 не сработал, пробуем прямой запуск..."
    
    # Альтернативный запуск
    cd server
    nohup node server.js > ../logs/server.log 2>&1 &
    DIRECT_PID=$!
    cd ..
    
    if [ -n "$DIRECT_PID" ]; then
        echo $DIRECT_PID > server.pid
        log "Сервер запущен напрямую (PID: $DIRECT_PID)"
    else
        error "Не удалось запустить сервер!"
        exit 1
    fi
fi

# Ждем запуска
sleep 3

echo ""
echo "🧪 5. Быстрая проверка"
echo "====================="

# Проверяем порт
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    log "Порт 3001 занят (API сервер работает)"
else
    error "Порт 3001 свободен (сервер не запущен)"
    echo ""
    echo "🔍 Проверьте логи:"
    echo "  tail -20 logs/server.log"
    echo "  tail -20 logs/server-error.log"
    exit 1
fi

# Быстрая проверка API
info "Тестируем API..."
API_TEST=$(timeout 5 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")

if echo "$API_TEST" | grep -q "OK"; then
    log "API отвечает корректно"
elif [ "$API_TEST" = "timeout" ]; then
    warn "API не отвечает (таймаут)"
else
    warn "API отвечает некорректно: $API_TEST"
fi

echo ""
echo "📊 СТАТУС ЗАПУСКА"
echo "================="

# Статус процессов
if command -v pm2 > /dev/null; then
    PM2_COUNT=$(timeout 5 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "0")
    echo "PM2 процессов: $PM2_COUNT"
fi

# Порты
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
echo "Порт 3001: $([ "$PORT_3001" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"

# API
echo "API: $(echo "$API_TEST" | grep -q "OK" && echo "работает ✅" || echo "не работает ❌")"

echo ""
if [ "$PORT_3001" -gt 0 ]; then
    log "🎉 СЕРВЕР ЗАПУЩЕН УСПЕШНО!"
    echo ""
    echo "🌐 API доступен:"
    echo "  • http://localhost:3001/api/health"
    echo "  • http://46.173.17.229:3001/api/health"
    echo ""
    echo "🔧 Следующие шаги:"
    echo "1. Запуск фронтенда: ./start-frontend-simple-vps.sh"  
    echo "2. Полная проверка: ./test-simple-vps.sh"
    echo ""
    echo "📋 Управление сервером:"
    echo "  • Статус: pm2 status"
    echo "  • Логи: tail -f logs/server.log"
    echo "  • Остановка: pm2 stop malabar-server"
    echo "  • Перезапуск: pm2 restart malabar-server"
else
    error "❌ СЕРВЕР НЕ ЗАПУСТИЛСЯ"
    echo ""
    echo "🔍 Диагностика:"
    echo "1. Проверьте логи: tail -20 logs/server-error.log"
    echo "2. Проверьте зависимости: ls server/node_modules | wc -l"
    echo "3. Запустите диагностику: ./diagnose-simple-vps.sh"
fi
