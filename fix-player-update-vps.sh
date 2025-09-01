#!/bin/bash

# Исправление проблемы с обновлением игроков на VPS
# Специально для решения ошибки в тесте 3

echo "🔧 Исправление проблемы с обновлением игроков..."

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[FIX]${NC} $1"
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

log "1. Проверяем и исправляем права доступа к БД..."

# Исправляем права доступа к БД
if [ -f "server/malabar.db" ]; then
    chmod 664 server/malabar.db
    chown www-data:www-data server/malabar.db 2>/dev/null || warn "Не удалось изменить владельца БД"
    log "✅ Права доступа к БД исправлены"
else
    error "❌ База данных не найдена"
    exit 1
fi

log "2. Проверяем структуру таблицы игроков..."

# Проверяем структуру таблицы
if command -v sqlite3 > /dev/null; then
    info "Структура таблицы players:"
    echo ".schema players" | sqlite3 server/malabar.db
    
    info "Количество игроков:"
    PLAYER_COUNT=$(echo "SELECT COUNT(*) FROM players;" | sqlite3 server/malabar.db)
    echo "Найдено игроков: $PLAYER_COUNT"
    
    if [ "$PLAYER_COUNT" -eq 0 ]; then
        warn "База данных пустая, создаем тестовых игроков..."
        
        # Создаем тестового игрока если БД пустая
        cat > /tmp/insert_test_player.sql << 'EOF'
INSERT OR REPLACE INTO players (id, name, avatar, socialLinks, stats, games, isOnline, position, x, y) 
VALUES (1, 'Test Player 1', '/avatars/player1.jpg', '{"twitch":"","telegram":"","discord":""}', '{"wins":0,"rerolls":0,"drops":0}', '[]', 0, 1, 100, 100);
EOF
        
        sqlite3 server/malabar.db < /tmp/insert_test_player.sql
        rm /tmp/insert_test_player.sql
        
        log "✅ Создан тестовый игрок"
    fi
else
    warn "sqlite3 не установлен"
fi

log "3. Проверяем endpoint обновления игрока в коде..."

# Проверяем что endpoint существует в server.js
if grep -q "app.put('/api/players/:id'" server/server.js; then
    log "✅ Endpoint PUT /api/players/:id найден"
else
    error "❌ Endpoint PUT /api/players/:id не найден в server.js"
    
    # Показываем что есть в файле
    info "Доступные endpoints:"
    grep -n "app\.\(get\|post\|put\|delete\)" server/server.js | head -10
fi

log "4. Перезапускаем только сервер (не фронтенд)..."

pm2 restart malabar-server

# Ждем запуска
sleep 3

log "5. Тестируем исправление..."

# Получаем список игроков
PLAYERS_RESPONSE=$(curl -s "http://localhost:3001/api/players")

if echo "$PLAYERS_RESPONSE" | jq .players > /dev/null 2>&1; then
    FIRST_PLAYER=$(echo "$PLAYERS_RESPONSE" | jq '.players[0]')
    PLAYER_ID=$(echo "$FIRST_PLAYER" | jq -r '.id')
    
    if [ "$PLAYER_ID" != "null" ] && [ "$PLAYER_ID" != "" ]; then
        info "Тестируем обновление игрока ID: $PLAYER_ID"
        
        # Получаем текущие данные игрока
        CURRENT_PLAYER=$(curl -s "http://localhost:3001/api/players/$PLAYER_ID")
        
        if echo "$CURRENT_PLAYER" | jq . > /dev/null 2>&1; then
            # Создаем обновленные данные
            UPDATED_PLAYER=$(echo "$CURRENT_PLAYER" | jq '. + {name: "Updated Test Player"}')
            
            info "Отправляем PUT запрос..."
            UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT \
                -H "Content-Type: application/json" \
                -d "$UPDATED_PLAYER" \
                "http://localhost:3001/api/players/$PLAYER_ID")
            
            HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
            RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | grep -v "HTTP_STATUS")
            
            info "HTTP статус: $HTTP_STATUS"
            info "Ответ сервера: $RESPONSE_BODY"
            
            if [ "$HTTP_STATUS" = "200" ]; then
                log "✅ Обновление игрока работает!"
                
                # Проверяем что изменения сохранились
                sleep 1
                UPDATED_CHECK=$(curl -s "http://localhost:3001/api/players/$PLAYER_ID")
                UPDATED_NAME=$(echo "$UPDATED_CHECK" | jq -r '.name')
                
                if [ "$UPDATED_NAME" = "Updated Test Player" ]; then
                    log "✅ Изменения сохранились в БД"
                    
                    # Возвращаем исходное имя
                    ORIGINAL_NAME=$(echo "$CURRENT_PLAYER" | jq -r '.name')
                    RESTORE_DATA=$(echo "$CURRENT_PLAYER")
                    
                    curl -s -X PUT \
                        -H "Content-Type: application/json" \
                        -d "$RESTORE_DATA" \
                        "http://localhost:3001/api/players/$PLAYER_ID" > /dev/null
                    
                    log "✅ Исходное имя восстановлено"
                else
                    warn "⚠️ Изменения не сохранились в БД"
                fi
            else
                error "❌ Обновление игрока не работает (HTTP $HTTP_STATUS)"
                echo "Ответ: $RESPONSE_BODY"
            fi
        else
            error "❌ Не удалось получить данные игрока"
        fi
    else
        error "❌ Не удалось получить ID игрока"
    fi
else
    error "❌ Не удалось получить список игроков"
    echo "Ответ: $PLAYERS_RESPONSE"
fi

log "6. Проверяем логи сервера..."

pm2 logs malabar-server --lines 10

echo ""
echo "🔧 РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ"
echo "======================="

# Финальный тест
info "Запускаем быстрый тест..."
if curl -s "http://localhost:3001/api/health" | grep -q "OK"; then
    if curl -s "http://localhost:3001/api/players" | grep -q "players"; then
        log "✅ Базовые функции работают"
        
        echo ""
        echo "🧪 Запустите полный тест для проверки:"
        echo "  node test-sync-fixes.js"
        echo ""
        echo "📊 Если проблемы остались:"
        echo "  • Проверьте логи: pm2 logs malabar-server"
        echo "  • Диагностика: ./diagnose-sync-issues-vps.sh"
        echo "  • Полная переустановка: ./deploy-sync-fixes-vps.sh"
    else
        error "❌ API игроков не работает"
    fi
else
    error "❌ API сервер не отвечает"
fi
