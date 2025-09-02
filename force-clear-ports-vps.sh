#!/bin/bash

# Принудительная очистка портов и перезапуск
echo "💀 Принудительная очистка портов и перезапуск..."
echo "=============================================="

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
echo "💀 1. ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ВСЕХ ПРОЦЕССОВ"
echo "==========================================="

info "Убиваем все Node.js процессы..."

# Убиваем все node процессы
pkill -9 -f "node" 2>/dev/null && log "Все Node процессы убиты"

# Убиваем все npm процессы  
pkill -9 -f "npm" 2>/dev/null && log "Все npm процессы убиты"

# Убиваем PM2
pm2 kill 2>/dev/null && log "PM2 убит полностью"

# Принудительно освобождаем порты
info "Принудительно освобождаем порты..."

# Убиваем процессы на портах
for port in 3000 3001; do
    PIDS=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "Убиваем процессы на порту $port: $PIDS"
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        log "Порт $port освобожден"
    else
        log "Порт $port уже свободен"
    fi
done

# Ждем полной очистки
sleep 5

echo ""
echo "🔍 2. ПРОВЕРКА ОЧИСТКИ"
echo "====================="

# Проверяем что порты свободны
info "Проверяем порты..."

PORT_3001_CHECK=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000_CHECK=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус портов:"
echo "  • Порт 3001: $([ "$PORT_3001_CHECK" -eq 0 ] && echo "свободен ✅" || echo "ЗАНЯТ ❌")"
echo "  • Порт 3000: $([ "$PORT_3000_CHECK" -eq 0 ] && echo "свободен ✅" || echo "ЗАНЯТ ❌")"

if [ "$PORT_3001_CHECK" -gt 0 ]; then
    error "Порт 3001 все еще занят!"
    ss -tulpn | grep :3001
fi

if [ "$PORT_3000_CHECK" -gt 0 ]; then
    error "Порт 3000 все еще занят!"
    ss -tulpn | grep :3000
fi

if [ "$PORT_3001_CHECK" -gt 0 ] || [ "$PORT_3000_CHECK" -gt 0 ]; then
    error "Порты не освободились! Нужен перезапуск VPS"
    echo ""
    echo "🆘 Экстренные меры:"
    echo "  sudo systemctl restart networking"
    echo "  sudo reboot"
    exit 1
fi

log "Все порты свободны!"

# Проверяем что node процессы убиты
NODE_COUNT=$(ps aux | grep -v grep | grep node | wc -l)
echo "  • Node процессы: $([ "$NODE_COUNT" -eq 0 ] && echo "отсутствуют ✅" || echo "$NODE_COUNT процессов ❌")"

if [ "$NODE_COUNT" -gt 0 ]; then
    warn "Есть оставшиеся node процессы:"
    ps aux | grep -v grep | grep node
fi

echo ""
echo "📁 3. ПОДГОТОВКА К ЗАПУСКУ"
echo "========================="

# Создаем папки
mkdir -p logs
rm -f *.pid
log "Папки подготовлены"

# Проверяем сборку
if [ ! -d ".next" ]; then
    info "Сборка не найдена, собираем фронтенд..."
    
    timeout 300 npm run build > logs/build.log 2>&1
    
    if [ $? -eq 0 ] && [ -d ".next" ]; then
        log "Сборка фронтенда успешна ✅"
    else
        error "Ошибка сборки!"
        tail -10 logs/build.log
        exit 1
    fi
else
    log "Сборка .next найдена ✅"
fi

echo ""
echo "🖥️ 4. ЗАПУСК БЕКЕНДА (порт 3001)"
echo "================================"

info "Запускаем бекенд в папке server..."

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
info "Ждем запуска бекенда (15 секунд)..."
sleep 15

# Проверяем бекенд
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    log "Бекенд занял порт 3001 ✅"
    
    # Тест API
    API_TEST=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
    
    if echo "$API_TEST" | grep -q "OK"; then
        log "API health работает ✅"
    else
        warn "API health: $API_TEST"
    fi
else
    error "Бекенд не запустился на порту 3001!"
    echo ""
    echo "🔍 Последние логи бекенда:"
    tail -10 logs/backend.log
    exit 1
fi

echo ""
echo "🌐 5. ЗАПУСК ФРОНТЕНДА (порт 3000)"
echo "=================================="

info "Запускаем фронтенд в production режиме..."

nohup npm start > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

if [ -n "$FRONTEND_PID" ]; then
    echo $FRONTEND_PID > frontend.pid
    log "Фронтенд запущен (PID: $FRONTEND_PID)"
else
    error "Не удалось запустить фронтенд!"
    exit 1
fi

# Ждем запуска фронтенда
info "Ждем запуска фронтенда (до 60 секунд)..."

WAIT_COUNT=0
while [ $WAIT_COUNT -lt 12 ]; do
    if ss -tulpn 2>/dev/null | grep -q ":3000"; then
        log "Фронтенд занял порт 3000 ✅"
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
    sleep 8
    FRONTEND_TEST=$(timeout 15 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    
    if [ "$FRONTEND_TEST" = "200" ]; then
        log "Фронтенд отвечает HTTP 200 ✅"
    else
        warn "Фронтенд HTTP: $FRONTEND_TEST"
    fi
else
    warn "Фронтенд не запустился на порту 3000"
    echo ""
    echo "🔍 Последние логи фронтенда:"
    tail -10 logs/frontend.log
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ"
echo "===================="

# Финальная проверка
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
NODE_PROCESSES=$(ps aux | grep -v grep | grep node | wc -l)

echo "📊 Статус системы:"
echo "  • Бекенд (3001): $([ "$PORT_3001" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"
echo "  • Фронтенд (3000): $([ "$PORT_3000" -gt 0 ] && echo "работает ✅" || echo "не работает ❌")"
echo "  • Node процессы: $NODE_PROCESSES"

if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ОБА СЕРВИСА ЗАПУЩЕНЫ И РАБОТАЮТ!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🔌 API доступен:"
    echo "  • http://46.173.17.229:3001/api/health"
    echo "  • http://46.173.17.229:3001/api/players"
    echo ""
    echo "✅ Проект полностью восстановлен!"
    
elif [ "$PORT_3001" -gt 0 ]; then
    warn "⚠️ Бекенд работает, фронтенд загружается..."
    echo ""
    echo "✅ Бекенд готов"
    echo "⏳ Дайте фронтенду еще 1-2 минуты"
    echo ""
    echo "🔍 Следите за логами:"
    echo "  tail -f logs/frontend.log"
    
else
    error "❌ Проблемы с запуском"
    echo ""
    echo "🔍 Диагностика:"
    echo "  • Логи бекенда: tail -20 logs/backend.log"
    echo "  • Логи фронтенда: tail -20 logs/frontend.log"
    echo "  • Процессы: ps aux | grep node"
fi

echo ""
echo "📋 Управление процессами:"
echo "  • Статус процессов: ps aux | grep node"
echo "  • Логи бекенда: tail -f logs/backend.log"
echo "  • Логи фронтенда: tail -f logs/frontend.log"
echo "  • Остановка бекенда: kill $(cat backend.pid 2>/dev/null)"
echo "  • Остановка фронтенда: kill $(cat frontend.pid 2>/dev/null)"
echo "  • Остановка всех: pkill -f node"
echo ""
echo "🧪 Финальный тест:"
echo "  ./test-simple-vps.sh"
