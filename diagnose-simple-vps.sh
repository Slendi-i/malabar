#!/bin/bash

# Простая диагностика без зависающих команд

echo "🔍 Простая диагностика системы..."
echo "================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[PROBLEM]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

cd /var/www/malabar || { error "Директория /var/www/malabar не найдена!"; exit 1; }

echo "📍 Директория: $(pwd)"
echo "👤 Пользователь: $(whoami)"

echo ""
echo "💾 1. МЕСТО НА ДИСКЕ"
echo "==================="

df -h . | head -2
echo ""

DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    error "Диск заполнен на $DISK_USAGE%! Критично!"
elif [ "$DISK_USAGE" -gt 80 ]; then
    warn "Диск заполнен на $DISK_USAGE%"
else
    log "Свободного места достаточно ($DISK_USAGE% занято)"
fi

echo ""
echo "📁 2. ФАЙЛЫ ПРОЕКТА"
echo "=================="

# Основные файлы
FILES=("package.json" "server/package.json" "server/server.js")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        log "$file ✓"
    else
        error "$file ОТСУТСТВУЕТ!"
    fi
done

# Директории
DIRS=("pages" "components" "server" "styles")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log "$dir/ ✓"
    else
        error "$dir/ ОТСУТСТВУЕТ!"
    fi
done

echo ""
echo "📦 3. ЗАВИСИМОСТИ"
echo "================="

# Фронтенд зависимости
if [ -d "node_modules" ]; then
    FRONTEND_MODULES=$(ls node_modules 2>/dev/null | wc -l)
    if [ "$FRONTEND_MODULES" -gt 50 ]; then
        log "Фронтенд: $FRONTEND_MODULES модулей ✓"
    elif [ "$FRONTEND_MODULES" -gt 10 ]; then
        warn "Фронтенд: $FRONTEND_MODULES модулей (мало)"
    else
        error "Фронтенд: $FRONTEND_MODULES модулей (критично мало)"
    fi
else
    error "node_modules ОТСУТСТВУЕТ!"
fi

# Бэкенд зависимости
if [ -d "server/node_modules" ]; then
    BACKEND_MODULES=$(ls server/node_modules 2>/dev/null | wc -l)
    if [ "$BACKEND_MODULES" -gt 10 ]; then
        log "Бэкенд: $BACKEND_MODULES модулей ✓"
    elif [ "$BACKEND_MODULES" -gt 3 ]; then
        warn "Бэкенд: $BACKEND_MODULES модулей (мало)"
    else
        error "Бэкенд: $BACKEND_MODULES модулей (критично мало)"
    fi
else
    error "server/node_modules ОТСУТСТВУЕТ!"
fi

# Критические модули
echo ""
info "Критические модули:"
CRITICAL=("react" "next" "express" "sqlite3")
for module in "${CRITICAL[@]}"; do
    if [ -d "node_modules/$module" ] || [ -d "server/node_modules/$module" ]; then
        log "$module ✓"
    else
        error "$module ОТСУТСТВУЕТ!"
    fi
done

echo ""
echo "🗃️ 4. БАЗА ДАННЫХ"
echo "================="

if [ -f "server/malabar.db" ]; then
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
    if [ "$DB_SIZE" -gt 10000 ]; then
        log "База данных: $DB_SIZE байт (содержит данные) ✓"
    elif [ "$DB_SIZE" -gt 1000 ]; then
        warn "База данных: $DB_SIZE байт (маленькая)"
    else
        error "База данных: $DB_SIZE байт (пустая или поврежденная)"
    fi
    
    # Права доступа
    if [ -r "server/malabar.db" ] && [ -w "server/malabar.db" ]; then
        log "Права доступа к БД ✓"
    else
        error "Нет прав доступа к БД!"
    fi
elif [ -f "malabar.db" ]; then
    warn "База данных в корне (нужно переместить в server/)"
else
    error "База данных НЕ НАЙДЕНА!"
fi

echo ""
echo "🔧 5. ПРОЦЕССЫ"
echo "============="

# Node процессы
NODE_PROCESSES=$(ps aux | grep -E "node.*server" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    log "Node сервер запущен ($NODE_PROCESSES процессов)"
else
    warn "Node сервер НЕ запущен"
fi

# npm процессы  
NPM_PROCESSES=$(ps aux | grep -E "npm.*start" | grep -v grep | wc -l)
if [ "$NPM_PROCESSES" -gt 0 ]; then
    log "npm процессы запущены ($NPM_PROCESSES)"
else
    warn "npm процессы НЕ запущены"
fi

# PM2
if command -v pm2 > /dev/null; then
    PM2_COUNT=$(timeout 3 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "0")
    if [ "$PM2_COUNT" -gt 0 ]; then
        log "PM2 процессы: $PM2_COUNT запущено"
    else
        warn "PM2 процессы НЕ запущены"
    fi
else
    warn "PM2 не установлен"
fi

echo ""
echo "🌐 6. СЕТЕВЫЕ ПОРТЫ"
echo "=================="

# Порт 3001 (API)
if ss -tulpn 2>/dev/null | grep -q ":3001"; then
    CONNECTIONS_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)
    log "Порт 3001 (API): занят ($CONNECTIONS_3001 соединений)"
else
    error "Порт 3001 (API): СВОБОДЕН (сервер не запущен)"
fi

# Порт 3000 (фронтенд)
if ss -tulpn 2>/dev/null | grep -q ":3000"; then
    CONNECTIONS_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)  
    log "Порт 3000 (фронтенд): занят ($CONNECTIONS_3000 соединений)"
else
    warn "Порт 3000 (фронтенд): СВОБОДЕН"
fi

echo ""
echo "🧪 7. БЫСТРЫЕ ТЕСТЫ"
echo "=================="

# API health
info "Тест API health..."
API_HEALTH=$(timeout 3 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")
if echo "$API_HEALTH" | grep -q "OK"; then
    log "API health check ✓"
elif [ "$API_HEALTH" = "timeout" ]; then
    error "API timeout (не отвечает)"
else
    error "API некорректный ответ: $API_HEALTH"
fi

# API players
info "Тест API players..."
API_PLAYERS=$(timeout 3 curl -s "http://localhost:3001/api/players" 2>/dev/null || echo "timeout")
if echo "$API_PLAYERS" | grep -q "players"; then
    log "API players ✓"
    
    # Количество игроков
    if echo "$API_PLAYERS" | jq .players > /dev/null 2>&1; then
        PLAYERS_COUNT=$(echo "$API_PLAYERS" | jq '.players | length' 2>/dev/null || echo "0")
        log "Игроков в БД: $PLAYERS_COUNT"
    fi
else
    error "API players не работает"
fi

# Фронтенд
info "Тест фронтенда..."
FRONTEND_TEST=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "timeout")
if [ "$FRONTEND_TEST" = "200" ]; then
    log "Фронтенд HTTP 200 ✓"
elif [ "$FRONTEND_TEST" = "timeout" ]; then
    warn "Фронтенд timeout (еще загружается?)"
else
    warn "Фронтенд HTTP $FRONTEND_TEST"
fi

echo ""
echo "📊 ИТОГОВАЯ ДИАГНОСТИКА"
echo "======================="

# Подсчет проблем
CRITICAL_ISSUES=0
WARNINGS=0

# Критические проблемы
[ ! -f "package.json" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ ! -f "server/server.js" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ ! -d "node_modules" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
[ ! -d "server/node_modules" ] && CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))

# Предупреждения
[ "$DISK_USAGE" -gt 80 ] && WARNINGS=$((WARNINGS + 1))
[ ! -f "server/malabar.db" ] && WARNINGS=$((WARNINGS + 1))
[ "$NODE_PROCESSES" -eq 0 ] && WARNINGS=$((WARNINGS + 1))

echo "🔴 Критических проблем: $CRITICAL_ISSUES"
echo "🟡 Предупреждений: $WARNINGS"

echo ""
if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    log "🎉 ВСЕ В ПОРЯДКЕ! Система готова к работе"
    echo ""
    echo "🚀 Запустите сервисы:"
    echo "  ./start-server-simple-vps.sh"
    echo "  ./start-frontend-simple-vps.sh"
elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    warn "⚠️ ЕСТЬ ПРЕДУПРЕЖДЕНИЯ, но система может работать"
    echo ""
    echo "🔧 Рекомендации:"
    echo "  1. Запуск: ./start-server-simple-vps.sh"
    echo "  2. Проверка: ./test-simple-vps.sh"
else
    error "❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ! Система НЕ готова"
    echo ""
    echo "🆘 Необходимо восстановление:"
    echo "  1. ./step-by-step-restore-vps.sh"
    echo "  2. ./install-critical-deps-vps.sh"
fi

echo ""
echo "📋 Полезные команды:"
echo "  • Размер модулей: du -sh node_modules server/node_modules"
echo "  • Процессы: ps aux | grep node"
echo "  • Порты: ss -tulpn | grep :300"
echo "  • Логи: ls -la logs/"
