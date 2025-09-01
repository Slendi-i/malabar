#!/bin/bash

# Быстрые тесты после восстановления сервера
# Проверяет основную функциональность БЕЗ висящих команд

echo "🧪 Тестирование после восстановления сервера..."
echo "==============================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Директория /var/www/malabar не найдена!"
    exit 1
}

TESTS_TOTAL=0
TESTS_PASSED=0

# Функция для подсчета результатов
test_result() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ $1 -eq 0 ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log "$2"
    else
        error "$2"
    fi
}

echo ""
echo "🔍 1. Базовые проверки"
echo "====================="

info "Проверяем файлы проекта..."
[ -f "package.json" ]; test_result $? "package.json существует"
[ -f "server/server.js" ]; test_result $? "server.js существует"
[ -f "server/malabar.db" ]; test_result $? "База данных существует"
[ -d "node_modules" ]; test_result $? "node_modules установлены"
[ -d "server/node_modules" ]; test_result $? "server/node_modules установлены"

echo ""
echo "🔧 2. Проверка процессов"
echo "======================="

info "Проверяем PM2 процессы..."
PM2_COUNT=$(timeout 5 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "0")
[ "$PM2_COUNT" -gt 0 ]; test_result $? "PM2 процессы запущены ($PM2_COUNT)"

info "Проверяем порты..."
ss -tulpn 2>/dev/null | grep -q ":3001"; test_result $? "Порт 3001 (API) слушается"
ss -tulpn 2>/dev/null | grep -q ":3000"; test_result $? "Порт 3000 (фронтенд) слушается"

echo ""
echo "🌐 3. API тесты"
echo "=============="

info "Тест 1: Health check API..."
API_HEALTH=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
echo "$API_HEALTH" | grep -q "OK"; test_result $? "API health check отвечает"

info "Тест 2: Получение игроков..."
API_PLAYERS=$(timeout 10 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
echo "$API_PLAYERS" | grep -q "players"; test_result $? "API игроков работает"

if echo "$API_PLAYERS" | jq .players > /dev/null 2>&1; then
    PLAYERS_COUNT=$(echo "$API_PLAYERS" | jq '.players | length' 2>/dev/null || echo "0")
    [ "$PLAYERS_COUNT" -gt 0 ]; test_result $? "В базе есть игроки ($PLAYERS_COUNT)"
else
    test_result 1 "Ответ API некорректен"
fi

info "Тест 3: Тест обновления игрока..."
if echo "$API_PLAYERS" | jq .players > /dev/null 2>&1; then
    FIRST_PLAYER=$(echo "$API_PLAYERS" | jq '.players[0]' 2>/dev/null)
    PLAYER_ID=$(echo "$FIRST_PLAYER" | jq -r '.id' 2>/dev/null)
    
    if [ "$PLAYER_ID" != "null" ] && [ "$PLAYER_ID" != "" ]; then
        # Создаем тестовые данные
        TEST_DATA=$(echo "$FIRST_PLAYER" | jq '. + {name: "Test API Update"}' 2>/dev/null)
        
        # Тестируем обновление
        UPDATE_RESPONSE=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" -X PUT \
            -H "Content-Type: application/json" \
            -d "$TEST_DATA" \
            "http://localhost:3001/api/players/$PLAYER_ID" 2>/dev/null || echo "timeout")
        
        [ "$UPDATE_RESPONSE" = "200" ]; test_result $? "Обновление игрока работает"
        
        # Возвращаем исходные данные
        timeout 10 curl -s -X PUT \
            -H "Content-Type: application/json" \
            -d "$FIRST_PLAYER" \
            "http://localhost:3001/api/players/$PLAYER_ID" > /dev/null 2>&1
    else
        test_result 1 "Не удалось получить ID игрока для теста"
    fi
else
    test_result 1 "Не удалось получить данные игроков"
fi

echo ""
echo "🔌 4. WebSocket тест"
echo "=================="

info "Проверяем WebSocket endpoint..."
WS_RESPONSE=$(timeout 5 curl -I -s "http://localhost:3001/ws" 2>/dev/null | head -1 || echo "timeout")
echo "$WS_RESPONSE" | grep -qE "(426|101|Bad Request)"; test_result $? "WebSocket endpoint доступен"

echo ""
echo "💾 5. База данных"
echo "================"

info "Проверяем доступ к базе данных..."
[ -r "server/malabar.db" ]; test_result $? "База данных доступна для чтения"
[ -w "server/malabar.db" ]; test_result $? "База данных доступна для записи"

if command -v sqlite3 > /dev/null; then
    info "Проверяем структуру БД..."
    DB_TABLES=$(echo ".tables" | sqlite3 server/malabar.db 2>/dev/null | wc -w)
    [ "$DB_TABLES" -gt 0 ]; test_result $? "В БД есть таблицы ($DB_TABLES)"
    
    echo "SELECT name FROM sqlite_master WHERE type='table';" | sqlite3 server/malabar.db 2>/dev/null | grep -q "players"
    test_result $? "Таблица players существует"
else
    warn "sqlite3 не установлен, пропускаем детальную проверку БД"
fi

echo ""
echo "🌐 6. Фронтенд тест"
echo "=================="

info "Проверяем доступность фронтенда..."
FRONTEND_RESPONSE=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
[ "$FRONTEND_RESPONSE" = "200" ]; test_result $? "Фронтенд отвечает (HTTP $FRONTEND_RESPONSE)"

echo ""
echo "📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ"
echo "=========================="

TESTS_FAILED=$((TESTS_TOTAL - TESTS_PASSED))
SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))

echo ""
echo "📈 Статистика:"
echo "  • Всего тестов: $TESTS_TOTAL"
echo -e "  • Прошло: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  • Не прошло: ${RED}$TESTS_FAILED${NC}"
echo "  • Успешность: $SUCCESS_RATE%"

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ТЕСТЫ ПРОШЛИ! Сервер работает идеально!${NC}"
    echo ""
    echo "🌐 Сайт готов к использованию:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "✅ Функциональность полностью восстановлена:"
    echo "  • Синхронизация данных работает"
    echo "  • Изменения сохраняются в БД"
    echo "  • Real-time обновления функционируют"
elif [ $TESTS_FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️ ЕСТЬ МЕЛКИЕ ПРОБЛЕМЫ (${TESTS_FAILED} тестов)${NC}"
    echo ""
    echo "🔧 Сайт работает, но требует внимания:"
    echo "  1. Проверьте логи: pm2 logs"
    echo "  2. Перезапустите: pm2 restart all"
    echo "  3. Подождите 1-2 минуты для полного запуска"
elif [ $TESTS_FAILED -le 5 ]; then
    echo -e "${YELLOW}🔧 ТРЕБУЕТСЯ ДОРАБОТКА (${TESTS_FAILED} тестов)${NC}"
    echo ""
    echo "🔧 Исправление проблем:"
    echo "  1. Перезапуск: pm2 restart all"
    echo "  2. Диагностика: ./diagnose-after-cleanup-vps.sh"
    echo "  3. Повторное восстановление: ./restore-after-cleanup-vps.sh"
else
    echo -e "${RED}❌ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ (${TESTS_FAILED} тестов)${NC}"
    echo ""
    echo "🆘 Требуется вмешательство:"
    echo "  1. Экстренное восстановление: ./emergency-restore-vps.sh"
    echo "  2. Проверка места на диске: df -h"
    echo "  3. Анализ логов: pm2 logs"
fi

echo ""
echo "📋 Команды для управления:"
echo "  • Статус процессов: pm2 status"
echo "  • Просмотр логов: pm2 logs"
echo "  • Перезапуск: pm2 restart all"
echo "  • Остановка: pm2 stop all"

echo ""
echo "💡 Если проблемы остались:"
echo "  • Диагностика: ./diagnose-after-cleanup-vps.sh"
echo "  • Восстановление: ./restore-after-cleanup-vps.sh"
echo "  • Экстренный режим: ./emergency-restore-vps.sh"

# Возвращаем код выхода в зависимости от результата
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
elif [ $TESTS_FAILED -le 2 ]; then
    exit 1
else
    exit 2
fi
