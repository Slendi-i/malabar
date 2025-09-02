#!/bin/bash

# Простой запуск фронтенда

echo "🌐 Запуск фронтенда..."
echo "====================="

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
echo "🔍 1. Проверка готовности"
echo "========================="

# Проверяем зависимости
if [ ! -d "node_modules" ]; then
    error "node_modules не найдена!"
    echo "Установите зависимости:"
    echo "  ./install-critical-deps-vps.sh"
    exit 1
fi

# Проверяем что API работает
if ! ss -tulpn 2>/dev/null | grep -q ":3001"; then
    error "API сервер не запущен!"
    echo "Запустите сначала API:"
    echo "  ./start-server-simple-vps.sh"
    exit 1
fi

log "Готовность проверена"

echo ""
echo "🏗️ 2. Подготовка фронтенда"
echo "=========================="

# Проверяем есть ли сборка
if [ ! -d ".next" ]; then
    info "Сборка отсутствует, запускаем быструю сборку..."
    
    # Быстрая сборка с таймаутом
    timeout 120 npm run build 2>/dev/null
    
    if [ $? -eq 0 ] && [ -d ".next" ]; then
        log "Быстрая сборка завершена"
    else
        warn "Сборка не удалась, попробуем запуск в dev режиме"
    fi
else
    log "Сборка найдена"
fi

echo ""
echo "🚀 3. Запуск фронтенда"
echo "====================="

# Останавливаем старые процессы
pkill -f "npm.*start" 2>/dev/null
pkill -f "next.*start" 2>/dev/null

sleep 2

# Определяем режим запуска
if [ -d ".next" ]; then
    info "Запуск в production режиме..."
    COMMAND="npm start"
else
    info "Запуск в development режиме..."
    COMMAND="npm run dev"
fi

# Запускаем фронтенд в фоне
nohup $COMMAND > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

if [ -n "$FRONTEND_PID" ]; then
    echo $FRONTEND_PID > frontend.pid
    log "Фронтенд запущен (PID: $FRONTEND_PID)"
else
    error "Не удалось запустить фронтенд!"
    exit 1
fi

echo ""
echo "⏳ 4. Ожидание запуска"
echo "====================="

info "Ждем запуска фронтенда (может занять 30-60 секунд)..."

# Ждем появления порта 3000
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
echo "🧪 5. Проверка запуска"
echo "====================="

# Проверяем порт
if ss -tulpn 2>/dev/null | grep -q ":3000"; then
    log "Порт 3000 занят (фронтенд работает)"
    
    # Проверяем ответ
    sleep 5
    FRONTEND_TEST=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    
    if [ "$FRONTEND_TEST" = "200" ]; then
        log "Фронтенд отвечает корректно"
    elif [ "$FRONTEND_TEST" = "timeout" ]; then
        warn "Фронтенд не отвечает (еще загружается)"
    else
        warn "Фронтенд отвечает с кодом: $FRONTEND_TEST"
    fi
else
    error "Порт 3000 свободен (фронтенд не запустился)"
    echo ""
    echo "🔍 Проверьте логи:"
    echo "  tail -20 logs/frontend.log"
fi

echo ""
echo "📊 СТАТУС ФРОНТЕНДА"
echo "=================="

# Статус процессов
FRONTEND_PROCESSES=$(ps aux | grep -E "(npm|next)" | grep -v grep | wc -l)
echo "Процессов фронтенда: $FRONTEND_PROCESSES"

# Порты
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
echo "Порт 3000: $([ "$PORT_3000" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"

# Ответ
echo "HTTP ответ: $([ "$FRONTEND_TEST" = "200" ] && echo "OK ✅" || echo "$FRONTEND_TEST ❌")"

echo ""
if [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ФРОНТЕНД ЗАПУЩЕН!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://localhost:3000"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🧪 Полная проверка:"
    echo "  ./test-simple-vps.sh"
    echo ""
    echo "📋 Управление:"
    echo "  • Логи: tail -f logs/frontend.log"
    echo "  • Остановка: kill $(cat frontend.pid 2>/dev/null)"
    echo "  • Перезапуск: ./start-frontend-simple-vps.sh"
else
    error "❌ ФРОНТЕНД НЕ ЗАПУСТИЛСЯ"
    echo ""
    echo "🔍 Возможные причины:"
    echo "1. Не хватает зависимостей: ./install-deps-safe-vps.sh"
    echo "2. Ошибки в коде: tail -50 logs/frontend.log"
    echo "3. Недостаток памяти: free -h"
    echo "4. API сервер не работает: ./test-simple-vps.sh"
fi
