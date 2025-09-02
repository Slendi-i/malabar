#!/bin/bash

# Запуск простых процессов фронтенда и бекенда (без PM2 ecosystem)
echo "🚀 Запуск простых процессов фронтенда и бекенда..."
echo "================================================"

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
echo "🛑 1. Остановка всех PM2 процессов"
echo "=================================="

info "Останавливаем все PM2 процессы..."
timeout 10 pm2 stop all 2>/dev/null || true
timeout 10 pm2 delete all 2>/dev/null || true
log "PM2 процессы остановлены"

# Останавливаем все node процессы
pkill -f "node.*server" 2>/dev/null && log "Node процессы остановлены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены"

sleep 2

echo ""
echo "📋 2. Проверка готовности"
echo "========================"

# Проверяем файлы
if [ -f "server/server.js" ]; then
    log "Файл бекенда найден ✓"
else
    error "server/server.js не найден!"
    exit 1
fi

if [ -f "package.json" ] && [ -f "server/package.json" ]; then
    log "Конфигурации найдены ✓"
else
    error "package.json файлы не найдены!"
    exit 1
fi

# Проверяем зависимости
if [ -d "node_modules" ] && [ -d "server/node_modules" ]; then
    log "Зависимости установлены ✓"
else
    error "Зависимости не установлены!"
    exit 1
fi

# Создаем папку для логов
mkdir -p logs

echo ""
echo "🖥️ 3. Запуск БЕКЕНДА (порт 3001)"
echo "================================"

info "Запускаем бекенд: cd server && npm start"

# Запуск бекенда в фоне
cd server
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

if [ -n "$BACKEND_PID" ]; then
    echo $BACKEND_PID > backend.pid
    log "Бекенд запущен (PID: $BACKEND_PID)"
    info "Логи бекенда: tail -f logs/backend.log"
else
    error "Не удалось запустить бекенд!"
    exit 1
fi

# Ждем запуска бекенда
sleep 5

echo ""
echo "🧪 4. Проверка БЕКЕНДА"
echo "====================="

# Проверяем порт
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    log "Порт 3001 занят ✅"
    
    # Тест API
    info "Тестируем API..."
    API_TEST=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
    
    if echo "$API_TEST" | grep -q "OK"; then
        log "API health работает ✅"
        
        # Тест игроков
        PLAYERS_TEST=$(timeout 8 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
        if echo "$PLAYERS_TEST" | grep -q "players"; then
            log "API players работает ✅"
        else
            warn "API players: $PLAYERS_TEST"
        fi
    else
        warn "API health: $API_TEST"
    fi
else
    error "Порт 3001 не занят - бекенд не запустился!"
    echo ""
    echo "🔍 Проверьте логи бекенда:"
    echo "  tail -20 logs/backend.log"
    exit 1
fi

echo ""
echo "🌐 5. Запуск ФРОНТЕНДА (порт 3000)"
echo "=================================="

info "Запускаем фронтенд: npm start"

# Проверяем есть ли сборка
if [ -d ".next" ]; then
    info "Найдена сборка .next - запуск в production режиме"
    FRONTEND_CMD="npm start"
else
    info "Сборка не найдена - запуск в dev режиме"
    FRONTEND_CMD="npm run dev"
fi

# Запуск фронтенда в фоне
nohup $FRONTEND_CMD > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

if [ -n "$FRONTEND_PID" ]; then
    echo $FRONTEND_PID > frontend.pid
    log "Фронтенд запущен (PID: $FRONTEND_PID)"
    info "Логи фронтенда: tail -f logs/frontend.log"
else
    error "Не удалось запустить фронтенд!"
fi

echo ""
echo "⏳ 6. Ожидание запуска фронтенда"
echo "==============================="

info "Ждем запуска фронтенда (до 90 секунд)..."

# Ждем порт 3000
WAIT_COUNT=0
while [ $WAIT_COUNT -lt 18 ]; do
    if ss -tulpn 2>/dev/null | grep -q ":3000"; then
        log "Порт 3000 активен"
        break
    fi
    
    sleep 5
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo "  ... ожидание $((WAIT_COUNT * 5)) сек"
done

echo ""
echo "🧪 7. Проверка ФРОНТЕНДА"
echo "======================="

# Проверяем порт фронтенда
if ss -tulpn 2>/dev/null | grep -q ":3000"; then
    log "Порт 3000 занят ✅"
    
    # Тест фронтенда
    sleep 5
    info "Тестируем фронтенд..."
    FRONTEND_TEST=$(timeout 15 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    
    if [ "$FRONTEND_TEST" = "200" ]; then
        log "Фронтенд отвечает HTTP 200 ✅"
    else
        warn "Фронтенд HTTP: $FRONTEND_TEST"
    fi
else
    warn "Порт 3000 не занят - фронтенд еще загружается или есть проблема"
    echo ""
    echo "🔍 Проверьте логи фронтенда:"
    echo "  tail -20 logs/frontend.log"
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ"
echo "===================="

# Финальная проверка портов
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус портов:"
echo "  • Бекенд (3001): $([ "$PORT_3001" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"
echo "  • Фронтенд (3000): $([ "$PORT_3000" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"

echo ""
echo "📋 Запущенные процессы:"
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    echo "  • Бекенд PID: $BACKEND_PID"
fi
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    echo "  • Фронтенд PID: $FRONTEND_PID"
fi

if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ОБА ПРОЦЕССА ЗАПУЩЕНЫ И РАБОТАЮТ!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🔌 API доступен:"
    echo "  • http://46.173.17.229:3001/api/health"
    echo "  • http://46.173.17.229:3001/api/players"
    echo ""
    echo "✅ Два простых процесса работают отлично!"
    
elif [ "$PORT_3001" -gt 0 ]; then
    warn "⚠️ БЕКЕНД РАБОТАЕТ, фронтенд загружается..."
    echo ""
    echo "✅ Бекенд готов"
    echo "⏳ Фронтенд может потребовать еще 1-2 минуты"
    echo ""
    echo "🔍 Следите за логами:"
    echo "  tail -f logs/frontend.log"
    
else
    error "❌ ПРОБЛЕМЫ С ЗАПУСКОМ"
    echo ""
    echo "🔍 Диагностика:"
    echo "  • Логи бекенда: tail -20 logs/backend.log"
    echo "  • Логи фронтенда: tail -20 logs/frontend.log"
    echo "  • Процессы: ps aux | grep node"
fi

echo ""
echo "📋 Управление процессами:"
echo "  • Статус: ps aux | grep node"
echo "  • Логи бекенда: tail -f logs/backend.log"
echo "  • Логи фронтенда: tail -f logs/frontend.log"
echo "  • Остановка бекенда: kill $(cat backend.pid 2>/dev/null)"
echo "  • Остановка фронтенда: kill $(cat frontend.pid 2>/dev/null)"
echo ""
echo "🧪 Финальный тест:"
echo "  ./test-simple-vps.sh"
