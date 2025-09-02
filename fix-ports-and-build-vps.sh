#!/bin/bash

# Исправление портов и сборка проекта
echo "🔧 Исправление портов и сборка проекта..."
echo "========================================="

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
echo "🛑 1. Полная очистка процессов"
echo "=============================="

info "Останавливаем все процессы..."

# Останавливаем PM2
timeout 10 pm2 stop all 2>/dev/null || true
timeout 10 pm2 delete all 2>/dev/null || true
log "PM2 процессы остановлены"

# Убиваем все node процессы
pkill -f "node.*server" 2>/dev/null && log "Node сервер процессы убиты"
pkill -f "npm.*start" 2>/dev/null && log "npm start процессы убиты"
pkill -f "next.*start" 2>/dev/null && log "Next.js процессы убиты"

# Освобождаем порты принудительно
info "Освобождаем порты 3000 и 3001..."

# Найти и убить процессы на портах
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null || true)
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null || true)

if [ -n "$PORT_3001_PID" ]; then
    kill -9 $PORT_3001_PID 2>/dev/null || true
    log "Процесс на порту 3001 убит (PID: $PORT_3001_PID)"
fi

if [ -n "$PORT_3000_PID" ]; then
    kill -9 $PORT_3000_PID 2>/dev/null || true
    log "Процесс на порту 3000 убит (PID: $PORT_3000_PID)"
fi

sleep 3

# Проверяем порты свободны
PORT_3001_CHECK=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000_CHECK=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус портов после очистки:"
echo "  • Порт 3001: $([ "$PORT_3001_CHECK" -eq 0 ] && echo "свободен ✅" || echo "занят ❌")"
echo "  • Порт 3000: $([ "$PORT_3000_CHECK" -eq 0 ] && echo "свободен ✅" || echo "занят ❌")"

if [ "$PORT_3001_CHECK" -gt 0 ] || [ "$PORT_3000_CHECK" -gt 0 ]; then
    error "Порты все еще заняты! Нужен перезапуск системы"
    echo ""
    echo "🔍 Какие процессы занимают порты:"
    ss -tulpn | grep :300
    exit 1
fi

echo ""
echo "🏗️ 2. Сборка фронтенда"
echo "======================"

info "Проверяем состояние сборки..."

if [ -d ".next" ]; then
    warn "Папка .next существует, но сборка может быть устаревшей"
    rm -rf .next
    log "Старая сборка удалена"
fi

info "Собираем фронтенд: npm run build"

# Создаем папку для логов
mkdir -p logs

# Сборка фронтенда
timeout 300 npm run build > logs/build.log 2>&1

BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    log "Сборка фронтенда успешна ✅"
    
    if [ -d ".next" ]; then
        log "Папка .next создана ✅"
        
        # Проверяем размер сборки
        BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
        info "Размер сборки: $BUILD_SIZE"
    else
        error "Папка .next не создалась!"
        echo "🔍 Логи сборки:"
        tail -20 logs/build.log
        exit 1
    fi
else
    error "Ошибка сборки фронтенда!"
    echo ""
    echo "🔍 Логи сборки:"
    tail -20 logs/build.log
    exit 1
fi

echo ""
echo "🖥️ 3. Запуск БЕКЕНДА"
echo "===================="

info "Запускаем бекенд: cd server && npm start"

cd server
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

if [ -n "$BACKEND_PID" ]; then
    echo $BACKEND_PID > backend.pid
    log "Бекенд запущен (PID: $BACKEND_PID)"
else
    error "Не удалось запустить бекенд!"
    exit 1
fi

# Ждем запуска бекенда
sleep 5

# Проверяем бекенд
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    log "Порт 3001 занят бекендом ✅"
    
    # Тест API
    API_TEST=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
    
    if echo "$API_TEST" | grep -q "OK"; then
        log "API работает ✅"
    else
        warn "API не отвечает: $API_TEST"
    fi
else
    error "Бекенд не запустился!"
    echo "🔍 Логи бекенда:"
    tail -10 logs/backend.log
    exit 1
fi

echo ""
echo "🌐 4. Запуск ФРОНТЕНДА"
echo "====================="

info "Запускаем фронтенд: npm start (production)"

# Запуск фронтенда в production режиме
nohup npm start > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

if [ -n "$FRONTEND_PID" ]; then
    echo $FRONTEND_PID > frontend.pid
    log "Фронтенд запущен (PID: $FRONTEND_PID)"
else
    error "Не удалось запустить фронтенд!"
    exit 1
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

# Проверяем фронтенд
if ss -tulpn 2>/dev/null | grep -q ":3000"; then
    log "Фронтенд запустился ✅"
    
    # Тест фронтенда
    sleep 5
    FRONTEND_TEST=$(timeout 15 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    
    if [ "$FRONTEND_TEST" = "200" ]; then
        log "Фронтенд отвечает HTTP 200 ✅"
    else
        warn "Фронтенд HTTP: $FRONTEND_TEST"
    fi
else
    warn "Фронтенд еще не запустился"
    echo "🔍 Логи фронтенда:"
    tail -10 logs/frontend.log
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ"
echo "===================="

# Финальная проверка
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус:"
echo "  • Бекенд (3001): $([ "$PORT_3001" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"
echo "  • Фронтенд (3000): $([ "$PORT_3000" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"

if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ОБА ПРОЦЕССА ЗАПУЩЕНЫ!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🔌 API доступен:"
    echo "  • http://46.173.17.229:3001/api/health"
    echo ""
    echo "✅ Проект работает!"
    
elif [ "$PORT_3001" -gt 0 ]; then
    warn "⚠️ Бекенд работает, фронтенд загружается..."
    echo ""
    echo "🔍 Следите за логами:"
    echo "  tail -f logs/frontend.log"
    
else
    error "❌ Проблемы с запуском"
    echo ""
    echo "🔍 Диагностика:"
    echo "  • Логи бекенда: tail -10 logs/backend.log"
    echo "  • Логи фронтенда: tail -10 logs/frontend.log"
fi

echo ""
echo "📋 Управление:"
echo "  • Остановка бекенда: kill $(cat backend.pid 2>/dev/null)"
echo "  • Остановка фронтенда: kill $(cat frontend.pid 2>/dev/null)"
echo "  • Логи: tail -f logs/backend.log logs/frontend.log"
