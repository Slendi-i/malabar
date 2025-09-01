#!/bin/bash

# Диагностика состояния сервера после чистки
# Проверяет что осталось и что нужно восстановить

echo "🔍 Диагностика состояния сервера после чистки..."
echo "=================================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[OK]${NC} $1"
}

error() {
    echo -e "${RED}[MISSING]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Директория /var/www/malabar не найдена!"
    exit 1
}

echo ""
echo "📍 Текущая директория: $(pwd)"
echo "📊 Место на диске:"
df -h . | head -2

echo ""
echo "🔍 1. Проверка основных файлов проекта"
echo "======================================"

# Проверяем ключевые файлы
[ -f "package.json" ] && log "package.json ✓" || error "package.json отсутствует!"
[ -f "next.config.js" ] && log "next.config.js ✓" || warn "next.config.js отсутствует"
[ -f "ecosystem.config.js" ] && log "ecosystem.config.js ✓" || warn "ecosystem.config.js отсутствует"
[ -f ".env" ] && log ".env ✓" || warn ".env отсутствует"

echo ""
echo "🔍 2. Проверка директорий исходного кода"
echo "======================================="

[ -d "pages" ] && log "pages/ ✓" || error "pages/ отсутствует!"
[ -d "components" ] && log "components/ ✓" || error "components/ отсутствует!"
[ -d "services" ] && log "services/ ✓" || error "services/ отсутствует!"
[ -d "styles" ] && log "styles/ ✓" || error "styles/ отсутствует!"
[ -d "public" ] && log "public/ ✓" || error "public/ отсутствует!"
[ -d "server" ] && log "server/ ✓" || error "server/ отсутствует!"

echo ""
echo "🔍 3. Проверка зависимостей и build файлов"
echo "=========================================="

[ -d "node_modules" ] && log "node_modules/ ✓" || error "node_modules/ отсутствует - НУЖНА УСТАНОВКА!"
[ -d "server/node_modules" ] && log "server/node_modules/ ✓" || error "server/node_modules/ отсутствует - НУЖНА УСТАНОВКА!"
[ -d ".next" ] && log ".next/ (build cache) ✓" || warn ".next/ отсутствует - НУЖНА СБОРКА!"
[ -d "out" ] && warn "out/ найдена (можно удалить)" || info "out/ отсутствует (нормально)"

echo ""
echo "🔍 4. Проверка сервера"
echo "====================="

[ -f "server/package.json" ] && log "server/package.json ✓" || error "server/package.json отсутствует!"
[ -f "server/server.js" ] && log "server/server.js ✓" || error "server/server.js отсутствует!"
[ -f "server/malabar.db" ] && log "server/malabar.db ✓" || error "server/malabar.db отсутствует!"

echo ""
echo "🔍 5. Проверка базы данных"
echo "========================="

if [ -f "server/malabar.db" ]; then
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
    if [ "$DB_SIZE" -gt 1000 ]; then
        log "База данных: $DB_SIZE байт (содержит данные)"
        
        # Проверяем можем ли читать БД
        if command -v sqlite3 > /dev/null; then
            PLAYER_COUNT=$(echo "SELECT COUNT(*) FROM players;" | sqlite3 server/malabar.db 2>/dev/null || echo "error")
            if [ "$PLAYER_COUNT" != "error" ]; then
                log "Игроков в БД: $PLAYER_COUNT"
            else
                warn "Не удалось прочитать БД (может быть заблокирована)"
            fi
        else
            info "sqlite3 не установлен, полная проверка БД невозможна"
        fi
    else
        warn "База данных пустая или повреждена ($DB_SIZE байт)"
    fi
elif [ -f "malabar.db" ]; then
    warn "База данных найдена в корне, нужно переместить в server/"
    mv malabar.db server/ 2>/dev/null && log "База данных перемещена в server/"
else
    error "База данных не найдена! Критическая проблема!"
fi

echo ""
echo "🔍 6. Проверка процессов"
echo "======================="

# Проверяем PM2 без висящих команд
if command -v pm2 > /dev/null; then
    info "Статус PM2 процессов:"
    timeout 5 pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || {
        # Fallback если jq не работает
        timeout 5 pm2 status --no-color 2>/dev/null | grep -E "(online|stopped|errored)" || info "PM2 процессы не найдены"
    }
    
    # Проверяем PM2 логи
    if [ -d "/home/$(whoami)/.pm2/logs" ] || [ -d "/root/.pm2/logs" ]; then
        log "PM2 логи доступны"
    else
        warn "PM2 логи не найдены"
    fi
else
    error "PM2 не установлен!"
fi

# Проверяем порты без висящих команд
info "Проверка занятых портов:"
PORTS_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
PORTS_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)

if [ "$PORTS_3000" -gt 0 ]; then
    log "Порт 3000 занят ($PORTS_3000 соединений)"
else
    warn "Порт 3000 свободен (фронтенд не запущен)"
fi

if [ "$PORTS_3001" -gt 0 ]; then
    log "Порт 3001 занят ($PORTS_3001 соединений)"
else
    warn "Порт 3001 свободен (API сервер не запущен)"
fi

echo ""
echo "🔍 7. Проверка API доступности"
echo "============================="

# Проверяем API с timeout
info "Проверяем API health check..."
API_RESPONSE=$(timeout 5 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")

if [ "$API_RESPONSE" = "timeout" ]; then
    error "API не отвечает (timeout)"
elif echo "$API_RESPONSE" | grep -q "OK"; then
    log "API отвечает корректно"
elif [ -n "$API_RESPONSE" ]; then
    warn "API отвечает, но не корректно: $API_RESPONSE"
else
    error "API не отвечает"
fi

echo ""
echo "🔍 8. Анализ логов"
echo "=================="

# Проверяем логи приложения
if [ -d "logs" ]; then
    log "Директория logs/ найдена"
    
    # Показываем последние ошибки без висящих команд
    if [ -f "logs/server-error.log" ]; then
        ERROR_COUNT=$(wc -l < logs/server-error.log 2>/dev/null || echo "0")
        if [ "$ERROR_COUNT" -gt 0 ]; then
            warn "Найдено ошибок в server-error.log: $ERROR_COUNT"
            info "Последние 3 ошибки:"
            tail -3 logs/server-error.log 2>/dev/null || echo "Не удалось прочитать логи"
        else
            log "Нет ошибок в server-error.log"
        fi
    else
        info "Файл server-error.log не найден"
    fi
else
    warn "Директория logs/ отсутствует"
fi

echo ""
echo "📊 ИТОГОВАЯ ДИАГНОСТИКА"
echo "======================="

CRITICAL_MISSING=0
WARNINGS=0

# Подсчитываем критические проблемы
[ ! -f "package.json" ] && CRITICAL_MISSING=$((CRITICAL_MISSING + 1))
[ ! -d "pages" ] && CRITICAL_MISSING=$((CRITICAL_MISSING + 1))
[ ! -d "server" ] && CRITICAL_MISSING=$((CRITICAL_MISSING + 1))
[ ! -f "server/server.js" ] && CRITICAL_MISSING=$((CRITICAL_MISSING + 1))
[ ! -f "server/malabar.db" ] && CRITICAL_MISSING=$((CRITICAL_MISSING + 1))

# Подсчитываем предупреждения
[ ! -d "node_modules" ] && WARNINGS=$((WARNINGS + 1))
[ ! -d "server/node_modules" ] && WARNINGS=$((WARNINGS + 1))
[ ! -d ".next" ] && WARNINGS=$((WARNINGS + 1))
[ "$PORTS_3000" -eq 0 ] && WARNINGS=$((WARNINGS + 1))
[ "$PORTS_3001" -eq 0 ] && WARNINGS=$((WARNINGS + 1))

echo "Критических проблем: $CRITICAL_MISSING"
echo "Предупреждений: $WARNINGS"

if [ "$CRITICAL_MISSING" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ ВСЕ В ПОРЯДКЕ! Сервер готов к работе.${NC}"
    echo ""
    echo "🚀 Попробуйте запустить сервер:"
    echo "  ./restore-after-cleanup-vps.sh"
elif [ "$CRITICAL_MISSING" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ ЕСТЬ ПРОБЛЕМЫ, но они решаемы.${NC}"
    echo ""
    echo "🔧 Для исправления запустите:"
    echo "  ./restore-after-cleanup-vps.sh"
else
    echo -e "${RED}❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ! Нужно восстановление.${NC}"
    echo ""
    echo "🆘 Для восстановления запустите:"
    echo "  ./emergency-restore-vps.sh"
fi

echo ""
echo "📋 Доступные скрипты восстановления:"
echo "  ./restore-after-cleanup-vps.sh    - стандартное восстановление"
echo "  ./emergency-restore-vps.sh        - экстренное восстановление"
echo "  ./quick-install-deps-vps.sh       - только установка зависимостей"
