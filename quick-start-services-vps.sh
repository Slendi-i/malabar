#!/bin/bash

# Быстрый запуск сервисов после диагностики
# Используем когда диагностика показала что все готово

echo "🚀 Быстрый запуск сервисов..."
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
echo "🛑 1. Очистка старых процессов"
echo "=============================="

# Быстрая очистка
pkill -f "node.*server" 2>/dev/null && log "Node процессы остановлены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены"

# PM2 очистка
if command -v pm2 > /dev/null; then
    timeout 5 pm2 stop all 2>/dev/null || true
    timeout 5 pm2 delete all 2>/dev/null || true
    log "PM2 процессы очищены"
fi

sleep 2

echo ""
echo "🚀 2. Запуск API сервера"
echo "======================="

info "Запускаем API сервер через PM2..."

# Создаем простую PM2 конфигурацию для API
cat > ecosystem.api.js << 'EOF'
module.exports = {
  apps: [{
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
  }]
};
EOF

mkdir -p logs

# Запуск API сервера
timeout 15 pm2 start ecosystem.api.js 2>/dev/null

if [ $? -eq 0 ]; then
    log "PM2 запущен для API"
else
    warn "PM2 не сработал, пробуем прямой запуск..."
    
    # Прямой запуск если PM2 не работает
    cd server
    nohup node server.js > ../logs/server.log 2>&1 &
    API_PID=$!
    cd ..
    
    if [ -n "$API_PID" ]; then
        echo $API_PID > api.pid
        log "API запущен напрямую (PID: $API_PID)"
    else
        error "Не удалось запустить API!"
        exit 1
    fi
fi

# Ждем запуска API
sleep 3

echo ""
echo "🧪 3. Проверка API"
echo "=================="

# Проверяем порт
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    log "Порт 3001 занят ✓"
    
    # Тест API
    API_TEST=$(timeout 8 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
    
    if echo "$API_TEST" | grep -q "OK"; then
        log "API отвечает корректно ✓"
        
        # Тест игроков
        PLAYERS_TEST=$(timeout 5 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
        if echo "$PLAYERS_TEST" | grep -q "players"; then
            log "API игроков работает ✓"
            
            # Подсчет игроков
            if echo "$PLAYERS_TEST" | jq .players > /dev/null 2>&1; then
                PLAYERS_COUNT=$(echo "$PLAYERS_TEST" | jq '.players | length' 2>/dev/null || echo "0")
                log "Игроков в БД: $PLAYERS_COUNT"
            fi
        else
            warn "API игроков не отвечает"
        fi
    else
        warn "API не отвечает корректно: $API_TEST"
    fi
else
    error "Порт 3001 не занят - API не запустился!"
    echo ""
    echo "🔍 Проверьте логи:"
    echo "  tail -20 logs/server-error.log"
    exit 1
fi

echo ""
echo "🌐 4. Запуск фронтенда"
echo "====================="

info "Запускаем фронтенд..."

# Проверяем есть ли сборка
if [ -d ".next" ]; then
    info "Найдена сборка, запуск в production режиме"
    FRONTEND_CMD="npm start"
else
    info "Сборка не найдена, запуск в dev режиме"
    FRONTEND_CMD="npm run dev"
fi

# Запуск фронтенда в фоне
nohup $FRONTEND_CMD > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

if [ -n "$FRONTEND_PID" ]; then
    echo $FRONTEND_PID > frontend.pid
    log "Фронтенд запущен (PID: $FRONTEND_PID)"
else
    error "Не удалось запустить фронтенд!"
fi

echo ""
echo "⏳ 5. Ожидание запуска фронтенда"
echo "==============================="

info "Ждем запуска фронтенда (до 60 секунд)..."

# Ждем порт 3000
WAIT_COUNT=0
while [ $WAIT_COUNT -lt 12 ]; do
    if ss -tulpn 2>/dev/null | grep -q ":3000"; then
        log "Порт 3000 активен"
        break
    fi
    
    sleep 5
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo "  ... ожидание $((WAIT_COUNT * 5)) сек"
done

echo ""
echo "🧪 6. Финальная проверка"
echo "======================="

# Статус портов
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус портов:"
echo "  • API (3001): $([ "$PORT_3001" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"
echo "  • Фронтенд (3000): $([ "$PORT_3000" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"

# Проверка фронтенда
if [ "$PORT_3000" -gt 0 ]; then
    sleep 5
    FRONTEND_TEST=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    echo "  • HTTP ответ: $([ "$FRONTEND_TEST" = "200" ] && echo "200 ✅" || echo "$FRONTEND_TEST")"
fi

echo ""
echo "📊 РЕЗУЛЬТАТ ЗАПУСКА"
echo "==================="

if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ УСПЕШНО!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🔌 API доступен:"
    echo "  • http://46.173.17.229:3001/api/health"
    echo "  • http://46.173.17.229:3001/api/players"
    echo ""
    echo "🧪 Финальная проверка:"
    echo "  ./test-simple-vps.sh"
    
elif [ "$PORT_3001" -gt 0 ]; then
    warn "⚠️ API РАБОТАЕТ, фронтенд еще запускается"
    echo ""
    echo "✅ API готов к работе"
    echo "⏳ Фронтенд еще запускается (может занять до 2 минут)"
    echo ""
    echo "🔍 Следите за логами фронтенда:"
    echo "  tail -f logs/frontend.log"
    echo ""
    echo "🔄 Если фронтенд не запустится через 2 минуты:"
    echo "  ./start-frontend-simple-vps.sh"
    
else
    error "❌ ПРОБЛЕМЫ С ЗАПУСКОМ"
    echo ""
    echo "🔍 Диагностика:"
    echo "  1. Логи API: tail -20 logs/server-error.log"
    echo "  2. Логи фронтенда: tail -20 logs/frontend.log"
    echo "  3. Процессы: ps aux | grep node"
    echo ""
    echo "🔧 Исправление:"
    echo "  1. ./diagnose-simple-vps.sh"
    echo "  2. ./start-server-simple-vps.sh"
    echo "  3. ./start-frontend-simple-vps.sh"
fi

echo ""
echo "📋 Управление сервисами:"
echo "  • Статус: pm2 status"
echo "  • Логи API: tail -f logs/server.log"
echo "  • Логи фронтенда: tail -f logs/frontend.log"
echo "  • Остановка: pm2 stop all && kill $(cat frontend.pid 2>/dev/null)"
