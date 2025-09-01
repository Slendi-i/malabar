#!/bin/bash

# Комплексная проверка всех исправлений на VPS
# Запускает все тесты и показывает общий статус

echo "🔍 Комплексная проверка исправлений синхронизации на VPS"
echo "=========================================================="

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

TOTAL_TESTS=0
PASSED_TESTS=0

# Функция для подсчета результатов
check_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "✅ $2"
    else
        error "❌ $2"
    fi
}

echo ""
echo "📋 1. Проверка файлов проекта"
echo "============================="

# Проверяем наличие ключевых файлов
[ -f "pages/index.js" ]; check_result $? "Файл pages/index.js существует"
[ -f "components/PlayerProfileModal.js" ]; check_result $? "Файл PlayerProfileModal.js существует"
[ -f "server/server.js" ]; check_result $? "Файл server/server.js существует"
[ -f "server/malabar.db" ]; check_result $? "База данных существует"
[ -f "package.json" ]; check_result $? "package.json существует"

# Проверяем применение исправлений
grep -q "НЕ создаем дефолтных игроков" pages/index.js; check_result $? "Исправления в index.js применены"
grep -q "debouncedSave" components/PlayerProfileModal.js; check_result $? "Исправления в PlayerProfileModal.js применены"

echo ""
echo "🔧 2. Проверка системных компонентов"
echo "===================================="

command -v node > /dev/null; check_result $? "Node.js установлен"
command -v npm > /dev/null; check_result $? "npm установлен"
command -v pm2 > /dev/null; check_result $? "PM2 установлен"
command -v sqlite3 > /dev/null; check_result $? "SQLite3 установлен"
command -v jq > /dev/null; check_result $? "jq установлен"

echo ""
echo "🚀 3. Проверка запущенных процессов"
echo "===================================="

pm2 info malabar-server > /dev/null 2>&1; check_result $? "PM2 процесс malabar-server запущен"
pm2 info malabar-frontend > /dev/null 2>&1; check_result $? "PM2 процесс malabar-frontend запущен"

# Проверяем порты
ss -tulpn | grep -q ":3001"; check_result $? "Порт 3001 (API) слушается"
ss -tulpn | grep -q ":3000"; check_result $? "Порт 3000 (фронтенд) слушается"

echo ""
echo "🌐 4. Проверка API endpoints"
echo "============================"

# Health check
curl -f -s "http://localhost:3001/api/health" > /dev/null; check_result $? "Health check API работает"

# Получение игроков
curl -f -s "http://localhost:3001/api/players" | jq .players > /dev/null 2>&1; check_result $? "API получения игроков работает"

# Проверяем что в ответе есть игроки
PLAYERS_COUNT=$(curl -s "http://localhost:3001/api/players" | jq '.players | length' 2>/dev/null)
[ "$PLAYERS_COUNT" -gt 0 ] 2>/dev/null; check_result $? "В базе данных есть игроки ($PLAYERS_COUNT)"

# Тест обновления игрока
if [ "$PLAYERS_COUNT" -gt 0 ] 2>/dev/null; then
    PLAYERS_RESPONSE=$(curl -s "http://localhost:3001/api/players")
    FIRST_PLAYER=$(echo "$PLAYERS_RESPONSE" | jq '.players[0]')
    PLAYER_ID=$(echo "$FIRST_PLAYER" | jq -r '.id')
    
    if [ "$PLAYER_ID" != "null" ] && [ "$PLAYER_ID" != "" ]; then
        # Создаем тестовые данные для обновления
        TEST_DATA=$(echo "$FIRST_PLAYER" | jq '. + {name: "API Test Player"}')
        
        # Тестируем обновление
        UPDATE_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
            -H "Content-Type: application/json" \
            -d "$TEST_DATA" \
            "http://localhost:3001/api/players/$PLAYER_ID")
        
        [ "$UPDATE_RESULT" = "200" ]; check_result $? "API обновления игроков работает"
        
        # Возвращаем исходные данные
        curl -s -X PUT \
            -H "Content-Type: application/json" \
            -d "$FIRST_PLAYER" \
            "http://localhost:3001/api/players/$PLAYER_ID" > /dev/null
    else
        warn "Не удалось получить ID игрока для теста обновления"
    fi
fi

echo ""
echo "🔌 5. Проверка WebSocket"
echo "========================"

# Простая проверка что WebSocket endpoint отвечает
curl -I -s "http://localhost:3001/ws" | grep -q "426\|101"; check_result $? "WebSocket endpoint доступен"

echo ""
echo "💾 6. Проверка базы данных"
echo "=========================="

# Проверяем права доступа к БД
[ -r "server/malabar.db" ]; check_result $? "База данных доступна для чтения"
[ -w "server/malabar.db" ]; check_result $? "База данных доступна для записи"

# Проверяем структуру БД
if command -v sqlite3 > /dev/null; then
    TABLES_COUNT=$(echo ".tables" | sqlite3 server/malabar.db | wc -w)
    [ "$TABLES_COUNT" -gt 0 ]; check_result $? "В базе данных есть таблицы ($TABLES_COUNT)"
    
    echo "SELECT name FROM sqlite_master WHERE type='table';" | sqlite3 server/malabar.db | grep -q "players"; 
    check_result $? "Таблица players существует"
fi

echo ""
echo "🧪 7. Запуск полных тестов"
echo "=========================="

if [ -f "test-sync-fixes.js" ]; then
    info "Запускаем автоматические тесты..."
    node test-sync-fixes.js > /tmp/test_results.log 2>&1
    TEST_EXIT_CODE=$?
    
    # Анализируем результаты тестов
    if grep -q "Все тесты прошли успешно" /tmp/test_results.log; then
        check_result 0 "Все автоматические тесты прошли"
    else
        FAILED_TESTS=$(grep -o "❌ Не прошло: [0-9]*" /tmp/test_results.log | grep -o "[0-9]*")
        if [ "$FAILED_TESTS" -gt 0 ] 2>/dev/null; then
            check_result 1 "Автоматические тесты: $FAILED_TESTS тестов не прошли"
        else
            check_result 1 "Автоматические тесты завершились с ошибкой"
        fi
    fi
    
    # Показываем результаты тестов
    info "Результаты автоматических тестов:"
    cat /tmp/test_results.log | grep -E "(✅|❌|📊)"
    rm -f /tmp/test_results.log
else
    warn "Файл test-sync-fixes.js не найден, пропускаем автоматические тесты"
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ"
echo "===================="

FAILED_TESTS=$((TOTAL_TESTS - PASSED_TESTS))
SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo -e "Всего проверок: $TOTAL_TESTS"
echo -e "${GREEN}✅ Прошло: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Не прошло: $FAILED_TESTS${NC}"
echo -e "Успешность: $SUCCESS_RATE%"

echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ПРОВЕРКИ ПРОШЛИ УСПЕШНО!${NC}"
    echo "Исправления синхронизации работают корректно."
    echo ""
    echo "🌐 Сайт должен работать на:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://vet-klinika-moscow.ru:3000 (если настроен DNS)"
elif [ $FAILED_TESTS -le 2 ]; then
    echo -e "${YELLOW}⚠️ НЕБОЛЬШИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ${NC}"
    echo "Основная функциональность работает, но есть мелкие проблемы."
    echo ""
    echo "🔧 Попробуйте:"
    echo "  ./quick-restart-vps.sh"
elif [ $FAILED_TESTS -le 5 ]; then
    echo -e "${YELLOW}🔧 ТРЕБУЕТСЯ НАСТРОЙКА${NC}"
    echo "Обнаружены проблемы, которые можно исправить."
    echo ""
    echo "🔧 Попробуйте по порядку:"
    echo "  1. ./fix-player-update-vps.sh"
    echo "  2. ./quick-restart-vps.sh"
    echo "  3. ./diagnose-sync-issues-vps.sh"
else
    echo -e "${RED}❌ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ${NC}"
    echo "Требуется полная переустановка или диагностика."
    echo ""
    echo "🔧 Действия для исправления:"
    echo "  1. ./diagnose-sync-issues-vps.sh"
    echo "  2. ./setup-vps-environment.sh"
    echo "  3. ./deploy-sync-fixes-vps.sh"
fi

echo ""
echo "📋 Доступные скрипты для исправления:"
echo "  • ./setup-vps-environment.sh    - настройка окружения"
echo "  • ./deploy-sync-fixes-vps.sh    - полное развертывание"
echo "  • ./quick-restart-vps.sh        - быстрый перезапуск"
echo "  • ./fix-player-update-vps.sh    - исправление обновления игроков"
echo "  • ./diagnose-sync-issues-vps.sh - диагностика проблем"

exit $FAILED_TESTS
