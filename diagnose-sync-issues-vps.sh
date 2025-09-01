#!/bin/bash

# Диагностика проблем синхронизации на VPS
# Проверяет все компоненты и выявляет проблемы

echo "🔍 Диагностика проблем синхронизации..."

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CHECK]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Не найдена директория /var/www/malabar"
    exit 1
}

echo "🔍 Проверка 1: Статус процессов"
echo "================================"

pm2 status
pm2 info malabar-server 2>/dev/null || warn "Процесс malabar-server не найден"
pm2 info malabar-frontend 2>/dev/null || warn "Процесс malabar-frontend не найден"

echo ""
echo "🔍 Проверка 2: Сетевые порты"
echo "============================"

info "Проверяем порт 3001 (бэкенд):"
ss -tulpn | grep :3001 || warn "Порт 3001 не слушается"

info "Проверяем порт 3000 (фронтенд):"
ss -tulpn | grep :3000 || warn "Порт 3000 не слушается"

echo ""
echo "🔍 Проверка 3: API endpoints"
echo "==========================="

# Health check
info "Health check:"
curl -s "http://localhost:3001/api/health" | jq . 2>/dev/null || {
    error "Health check не работает"
    curl -v "http://localhost:3001/api/health" 2>&1 | head -20
}

# Получение игроков
info "Получение игроков:"
PLAYERS_RESPONSE=$(curl -s "http://localhost:3001/api/players")
if echo "$PLAYERS_RESPONSE" | jq .players > /dev/null 2>&1; then
    PLAYERS_COUNT=$(echo "$PLAYERS_RESPONSE" | jq '.players | length')
    log "✅ Получено $PLAYERS_COUNT игроков"
else
    error "❌ Ошибка получения игроков:"
    echo "$PLAYERS_RESPONSE" | head -5
fi

# Тест обновления игрока (проблемный endpoint)
info "Тест обновления игрока:"
if echo "$PLAYERS_RESPONSE" | jq .players > /dev/null 2>&1; then
    FIRST_PLAYER=$(echo "$PLAYERS_RESPONSE" | jq '.players[0]')
    PLAYER_ID=$(echo "$FIRST_PLAYER" | jq -r '.id')
    
    if [ "$PLAYER_ID" != "null" ] && [ "$PLAYER_ID" != "" ]; then
        info "Тестируем обновление игрока ID: $PLAYER_ID"
        
        # Создаем тестовые данные
        TEST_DATA=$(echo "$FIRST_PLAYER" | jq '. + {name: "Test Player Updated"}')
        
        # Отправляем PUT запрос
        UPDATE_RESPONSE=$(curl -s -X PUT \
            -H "Content-Type: application/json" \
            -d "$TEST_DATA" \
            "http://localhost:3001/api/players/$PLAYER_ID")
        
        if echo "$UPDATE_RESPONSE" | grep -q "success\|updated"; then
            log "✅ Обновление игрока работает"
            
            # Возвращаем исходное имя
            ORIGINAL_DATA=$(echo "$FIRST_PLAYER")
            curl -s -X PUT \
                -H "Content-Type: application/json" \
                -d "$ORIGINAL_DATA" \
                "http://localhost:3001/api/players/$PLAYER_ID" > /dev/null
        else
            error "❌ Обновление игрока НЕ работает:"
            echo "$UPDATE_RESPONSE" | head -5
        fi
    else
        error "❌ Не удалось получить ID игрока"
    fi
else
    error "❌ Нет данных игроков для тестирования"
fi

echo ""
echo "🔍 Проверка 4: База данных"
echo "=========================="

# Проверяем наличие БД
if [ -f "server/malabar.db" ]; then
    log "✅ База данных найдена: server/malabar.db"
    
    # Проверяем права доступа
    ls -la server/malabar.db
    
    # Проверяем размер БД
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null)
    if [ "$DB_SIZE" -gt 0 ]; then
        log "✅ База данных не пустая (размер: $DB_SIZE байт)"
    else
        warn "⚠️ База данных пустая"
    fi
    
    # Проверяем можем ли читать БД
    if command -v sqlite3 > /dev/null; then
        info "Проверяем структуру БД:"
        echo ".tables" | sqlite3 server/malabar.db 2>/dev/null || warn "Не удалось прочитать таблицы БД"
        
        info "Количество игроков в БД:"
        echo "SELECT COUNT(*) FROM players;" | sqlite3 server/malabar.db 2>/dev/null || warn "Не удалось подсчитать игроков"
    else
        warn "sqlite3 не установлен, полная проверка БД невозможна"
    fi
else
    error "❌ База данных не найдена"
fi

echo ""
echo "🔍 Проверка 5: Логи ошибок"
echo "=========================="

info "Последние ошибки сервера:"
if [ -f "logs/server-error.log" ]; then
    tail -10 logs/server-error.log
else
    warn "Файл логов ошибок сервера не найден"
fi

info "Последние ошибки фронтенда:"
if [ -f "logs/frontend-error.log" ]; then
    tail -10 logs/frontend-error.log
else
    warn "Файл логов ошибок фронтенда не найден"
fi

# PM2 логи
info "PM2 логи (последние 5 строк):"
pm2 logs --lines 5

echo ""
echo "🔍 Проверка 6: Файлы исправлений"
echo "==============================="

# Проверяем что исправления применились
info "Проверяем pages/index.js:"
if grep -q "НЕ создаем дефолтных игроков" pages/index.js; then
    log "✅ Исправления в pages/index.js применены"
else
    warn "⚠️ Исправления в pages/index.js могут быть не применены"
fi

info "Проверяем components/PlayerProfileModal.js:"
if grep -q "debouncedSave" components/PlayerProfileModal.js; then
    log "✅ Исправления в PlayerProfileModal.js применены"
else
    warn "⚠️ Исправления в PlayerProfileModal.js могут быть не применены"
fi

info "Проверяем server/server.js:"
if grep -q "broadcastUpdate" server/server.js; then
    log "✅ Файл server.js выглядит корректно"
else
    warn "⚠️ Файл server.js может быть поврежден"
fi

echo ""
echo "🔍 Проверка 7: WebSocket"
echo "======================="

# Проверяем WebSocket
info "WebSocket endpoints:"
curl -I -s "http://localhost:3001/ws" | head -5 || warn "WebSocket endpoint не отвечает"

echo ""
echo "📊 РЕЗЮМЕ ДИАГНОСТИКИ"
echo "===================="

echo "🔧 Для исправления проблем выполните:"
echo "  1. Если API не работает: ./quick-restart-vps.sh"
echo "  2. Если проблемы с БД: chmod 664 server/malabar.db"
echo "  3. Если нужна полная переустановка: ./deploy-sync-fixes-vps.sh"
echo "  4. Для просмотра логов: pm2 logs"
echo ""

echo "🧪 Для запуска полных тестов:"
echo "  node test-sync-fixes.js"
