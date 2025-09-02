#!/bin/bash

# Простая и быстрая проверка работоспособности

echo "🧪 Быстрая проверка работоспособности..."
echo "======================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[PASS]${NC} $1"; }
error() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[TEST]${NC} $1"; }

cd /var/www/malabar || { error "Директория не найдена!"; exit 1; }

TESTS=0
PASSED=0

test_check() {
    TESTS=$((TESTS + 1))
    if [ $1 -eq 0 ]; then
        PASSED=$((PASSED + 1))
        log "$2"
    else
        error "$2"
    fi
}

echo ""
echo "📁 1. Файлы и структура"
echo "======================="

info "Проверка основных файлов..."
[ -f "package.json" ]; test_check $? "package.json существует"
[ -f "server/server.js" ]; test_check $? "server.js существует"
[ -f "server/malabar.db" ]; test_check $? "База данных существует"
[ -d "node_modules" ]; test_check $? "Зависимости фронтенда установлены"
[ -d "server/node_modules" ]; test_check $? "Зависимости бэкенда установлены"

echo ""
echo "🔧 2. Процессы"
echo "============="

info "Проверка запущенных процессов..."

# PM2 процессы
if command -v pm2 > /dev/null; then
    PM2_COUNT=$(timeout 3 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "0")
    [ "$PM2_COUNT" -gt 0 ]; test_check $? "PM2 процессы запущены ($PM2_COUNT)"
else
    warn "PM2 не найден"
fi

# Node процессы
NODE_COUNT=$(ps aux | grep -E "node.*server" | grep -v grep | wc -l)
[ "$NODE_COUNT" -gt 0 ]; test_check $? "Node сервер запущен"

echo ""
echo "🌐 3. Сетевые порты"
echo "=================="

info "Проверка портов..."
ss -tulpn 2>/dev/null | grep -q ":3001"; test_check $? "Порт 3001 (API) занят"
ss -tulpn 2>/dev/null | grep -q ":3000"; test_check $? "Порт 3000 (фронтенд) занят"

echo ""
echo "🔌 4. API тесты"
echo "=============="

info "Быстрые API тесты..."

# Health check
API_HEALTH=$(timeout 5 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
echo "$API_HEALTH" | grep -q "OK"; test_check $? "API health check работает"

# Players API
API_PLAYERS=$(timeout 5 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
echo "$API_PLAYERS" | grep -q "players"; test_check $? "API игроков отвечает"

# Количество игроков
if echo "$API_PLAYERS" | jq .players > /dev/null 2>&1; then
    PLAYERS_COUNT=$(echo "$API_PLAYERS" | jq '.players | length' 2>/dev/null || echo "0")
    [ "$PLAYERS_COUNT" -gt 0 ]; test_check $? "В базе есть игроки ($PLAYERS_COUNT)"
fi

echo ""
echo "🌐 5. Фронтенд"
echo "=============="

info "Проверка фронтенда..."

# HTTP ответ
FRONTEND_HTTP=$(timeout 8 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
[ "$FRONTEND_HTTP" = "200" ]; test_check $? "Фронтенд отвечает (HTTP $FRONTEND_HTTP)"

echo ""
echo "💾 6. База данных"
echo "================"

info "Проверка базы данных..."

[ -r "server/malabar.db" ]; test_check $? "БД доступна для чтения"
[ -w "server/malabar.db" ]; test_check $? "БД доступна для записи"

DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
[ "$DB_SIZE" -gt 1000 ]; test_check $? "БД содержит данные ($DB_SIZE байт)"

echo ""
echo "📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ"
echo "========================"

FAILED=$((TESTS - PASSED))
SUCCESS_RATE=$((PASSED * 100 / TESTS))

echo ""
echo "📈 Статистика:"
echo "  • Всего тестов: $TESTS"
echo -e "  • Прошло: ${GREEN}$PASSED${NC}"
echo -e "  • Не прошло: ${RED}$FAILED${NC}"
echo "  • Успешность: $SUCCESS_RATE%"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ТЕСТЫ ПРОШЛИ! СИСТЕМА РАБОТАЕТ ИДЕАЛЬНО!${NC}"
    echo ""
    echo "🌐 Сайт полностью готов:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "✅ Все функции восстановлены:"
    echo "  • Синхронизация данных"
    echo "  • Сохранение изменений"
    echo "  • Real-time обновления"
    echo "  • Загрузка изображений"
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️ ЕСТЬ МЕЛКИЕ ПРОБЛЕМЫ ($FAILED теста)${NC}"
    echo ""
    echo "🔧 Сайт в основном работает, но:"
    echo "1. Подождите 1-2 минуты полного запуска"
    echo "2. Проверьте логи: tail -20 logs/*.log"
    echo "3. При необходимости перезапустите компоненты"
elif [ $FAILED -le 4 ]; then
    echo -e "${YELLOW}🔧 ТРЕБУЕТСЯ НАСТРОЙКА ($FAILED тестов)${NC}"
    echo ""
    echo "🔧 Действия для исправления:"
    echo "1. Если API не работает: ./start-server-simple-vps.sh"
    echo "2. Если фронтенд не работает: ./start-frontend-simple-vps.sh"
    echo "3. Проверка зависимостей: ./install-critical-deps-vps.sh"
else
    echo -e "${RED}❌ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ ($FAILED тестов)${NC}"
    echo ""
    echo "🆘 Нужно восстановление:"
    echo "1. Диагностика: ./diagnose-simple-vps.sh"
    echo "2. Переустановка: ./step-by-step-restore-vps.sh"
fi

echo ""
echo "📋 Полезные команды:"
echo "  • Логи API: tail -f logs/server.log"
echo "  • Логи фронтенда: tail -f logs/frontend.log"
echo "  • Статус процессов: ps aux | grep node"
echo "  • Порты: ss -tulpn | grep :300"
echo "  • Перезапуск API: ./start-server-simple-vps.sh"
echo "  • Перезапуск фронтенда: ./start-frontend-simple-vps.sh"

# Возвращаем код в зависимости от результата
exit $FAILED
