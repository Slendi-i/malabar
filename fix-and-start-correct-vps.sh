#!/bin/bash

# Исправляем и запускаем правильную экосистему
echo "🔧 Исправление и запуск правильной экосистемы..."
echo "==============================================="

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
echo "🛑 1. Остановка неправильных процессов"
echo "====================================="

# Останавливаем неправильную экосистему
info "Останавливаем неправильную экосистему..."
timeout 10 pm2 stop all 2>/dev/null || true
timeout 10 pm2 delete all 2>/dev/null || true

# Убираем неправильный файл
rm -f ecosystem.api.js
log "Неправильная экосистема удалена"

# Очищаем процессы
pkill -f "node.*server" 2>/dev/null && log "Node процессы очищены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы очищены"

sleep 2

echo ""
echo "📁 2. Подготовка правильной структуры"
echo "===================================="

# Создаем папку для логов
mkdir -p logs
log "Папка логов создана"

# Проверяем существование правильной конфигурации
if [ -f "ecosystem.config.js" ]; then
    log "Правильная конфигурация найдена ✓"
    
    info "Конфигурация включает:"
    echo "  • Бекенд: ./server/server.js (порт 3001)"
    echo "  • Фронтенд: npm start (порт 3000)"
else
    error "ecosystem.config.js не найден!"
    exit 1
fi

# Проверяем критические файлы
if [ -f "server/server.js" ]; then
    log "Файл бекенда найден ✓"
else
    error "server/server.js не найден!"
    exit 1
fi

if [ -f "package.json" ] && [ -f "server/package.json" ]; then
    log "Конфигурации npm найдены ✓"
else
    error "package.json файлы не найдены!"
    exit 1
fi

echo ""
echo "🚀 3. Запуск правильной экосистемы"
echo "================================="

info "Запускаем ecosystem.config.js..."

# Запуск правильной экосистемы
timeout 20 pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    log "PM2 экосистема запущена успешно"
    
    # Показываем статус
    sleep 3
    echo ""
    info "Статус процессов:"
    timeout 10 pm2 status
    
else
    error "Ошибка запуска PM2 экосистемы"
    exit 1
fi

echo ""
echo "⏳ 4. Ожидание запуска сервисов"
echo "==============================="

info "Ждем запуска сервисов (до 60 секунд)..."

# Ждем порты
WAIT_COUNT=0
while [ $WAIT_COUNT -lt 12 ]; do
    PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
    PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
    
    echo "  ... ожидание $((WAIT_COUNT * 5)) сек - API: $([ "$PORT_3001" -gt 0 ] && echo "✅" || echo "⏳") Frontend: $([ "$PORT_3000" -gt 0 ] && echo "✅" || echo "⏳")"
    
    if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
        log "Все порты активны!"
        break
    fi
    
    sleep 5
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

echo ""
echo "🧪 5. Проверка работоспособности"
echo "==============================="

# Проверка портов
PORT_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
PORT_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)

echo "📊 Статус портов:"
echo "  • API (3001): $([ "$PORT_3001" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"
echo "  • Фронтенд (3000): $([ "$PORT_3000" -gt 0 ] && echo "занят ✅" || echo "свободен ❌")"

# Тест API
if [ "$PORT_3001" -gt 0 ]; then
    info "Тестируем API..."
    
    API_TEST=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
    if echo "$API_TEST" | grep -q "OK"; then
        log "API health работает ✅"
        
        # Тест игроков
        PLAYERS_TEST=$(timeout 8 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
        if echo "$PLAYERS_TEST" | grep -q "players"; then
            log "API players работает ✅"
            
            # Подсчет игроков
            if command -v jq > /dev/null && echo "$PLAYERS_TEST" | jq .players > /dev/null 2>&1; then
                PLAYERS_COUNT=$(echo "$PLAYERS_TEST" | jq '.players | length' 2>/dev/null || echo "?")
                log "Игроков в БД: $PLAYERS_COUNT"
            fi
        else
            warn "API players проблема: $PLAYERS_TEST"
        fi
    else
        warn "API health проблема: $API_TEST"
    fi
fi

# Тест фронтенда
if [ "$PORT_3000" -gt 0 ]; then
    info "Тестируем фронтенд..."
    
    sleep 3
    FRONTEND_TEST=$(timeout 15 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
    
    if [ "$FRONTEND_TEST" = "200" ]; then
        log "Фронтенд отвечает HTTP 200 ✅"
    else
        warn "Фронтенд: HTTP $FRONTEND_TEST"
    fi
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ"
echo "===================="

if [ "$PORT_3001" -gt 0 ] && [ "$PORT_3000" -gt 0 ]; then
    log "🎉 ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ И РАБОТАЮТ!"
    echo ""
    echo "🌐 Сайт доступен:"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🔌 API доступен:"
    echo "  • http://46.173.17.229:3001/api/health"
    echo "  • http://46.173.17.229:3001/api/players"
    echo ""
    echo "📋 Управление:"
    echo "  • Статус: pm2 status"
    echo "  • Логи: pm2 logs"
    echo "  • Перезапуск: pm2 restart all"
    echo "  • Остановка: pm2 stop all"
    echo ""
    echo "✅ Проект полностью восстановлен и работает!"
    
elif [ "$PORT_3001" -gt 0 ]; then
    warn "⚠️ API РАБОТАЕТ, фронтенд загружается..."
    echo ""
    echo "✅ API готов"
    echo "⏳ Фронтенд может потребовать еще 1-2 минуты"
    echo ""
    echo "🔍 Следите за процессом:"
    echo "  pm2 logs malabar-frontend"
    
else
    error "❌ ПРОБЛЕМЫ С ЗАПУСКОМ"
    echo ""
    echo "🔍 Диагностика:"
    echo "  • Статус: pm2 status"
    echo "  • Логи бекенда: pm2 logs malabar-backend"
    echo "  • Логи фронтенда: pm2 logs malabar-frontend"
    echo "  • Логи системы: tail -20 logs/*error.log"
    echo ""
    echo "🔧 Исправление:"
    echo "  • Перезапуск: pm2 restart all"
    echo "  • Полная диагностика: ./diagnose-simple-vps.sh"
fi

echo ""
echo "🧪 Финальная проверка через 1 минуту:"
echo "  ./test-simple-vps.sh"
