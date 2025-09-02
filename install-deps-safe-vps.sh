#!/bin/bash

# Безопасная установка всех зависимостей с контролем зависания

echo "📦 Безопасная установка всех зависимостей..."
echo "==========================================="

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

echo "⚠️ ВНИМАНИЕ: Полная установка может занять 10-20 минут"
echo "Будет выполнена в несколько этапов с проверками"
echo ""

# Функция безопасной установки
safe_install() {
    local DIR=$1
    local NAME=$2
    local MAX_TIME=$3
    
    echo ""
    info "Установка $NAME (максимум $MAX_TIME секунд)..."
    
    cd "$DIR"
    
    # Попытка 1: обычная установка
    echo "Попытка 1: полная установка..."
    timeout $MAX_TIME npm install --progress=false 2>/dev/null &
    INSTALL_PID=$!
    
    # Показываем прогресс каждые 10 секунд
    local elapsed=0
    while kill -0 $INSTALL_PID 2>/dev/null; do
        sleep 10
        elapsed=$((elapsed + 10))
        echo "  ... $elapsed сек ($NAME)"
        
        if [ $elapsed -ge $MAX_TIME ]; then
            echo "  Превышен таймаут, останавливаем..."
            kill $INSTALL_PID 2>/dev/null
            wait $INSTALL_PID 2>/dev/null
            break
        fi
    done
    
    wait $INSTALL_PID 2>/dev/null
    RESULT=$?
    
    if [ $RESULT -eq 0 ] && [ -d "node_modules" ]; then
        log "$NAME установлен полностью"
        return 0
    else
        warn "$NAME: попытка 1 не удалась, пробуем production..."
        
        # Попытка 2: production только
        timeout $((MAX_TIME/2)) npm install --production --no-optional 2>/dev/null
        
        if [ $? -eq 0 ] && [ -d "node_modules" ]; then
            log "$NAME установлен (production режим)"
            return 0
        else
            error "$NAME: установка не удалась"
            return 1
        fi
    fi
}

echo ""
echo "🔧 ЭТАП 1: Фронтенд зависимости"
echo "==============================="

safe_install "." "фронтенд" 300
FRONTEND_RESULT=$?

FRONTEND_COUNT=$(ls node_modules 2>/dev/null | wc -l)
echo "Установлено модулей фронтенда: $FRONTEND_COUNT"

echo ""
echo "🔧 ЭТАП 2: Бэкенд зависимости"  
echo "============================="

safe_install "server" "бэкенд" 180
BACKEND_RESULT=$?

cd ..

BACKEND_COUNT=$(ls server/node_modules 2>/dev/null | wc -l)
echo "Установлено модулей бэкенда: $BACKEND_COUNT"

echo ""
echo "📊 РЕЗУЛЬТАТ УСТАНОВКИ"
echo "====================="

echo "📈 Статистика:"
echo "  • Фронтенд: $FRONTEND_COUNT модулей"
echo "  • Бэкенд: $BACKEND_COUNT модулей"

# Проверяем критические модули
echo ""
echo "🔍 Проверка критических модулей:"

CRITICAL_FRONTEND=("react" "next" "@mui/material")
for module in "${CRITICAL_FRONTEND[@]}"; do
    if [ -d "node_modules/$module" ]; then
        log "$module ✓"
    else
        error "$module отсутствует!"
    fi
done

CRITICAL_BACKEND=("express" "sqlite3" "ws")
for module in "${CRITICAL_BACKEND[@]}"; do
    if [ -d "server/node_modules/$module" ]; then
        log "$module ✓"
    else
        error "$module отсутствует!"
    fi
done

echo ""
echo "💾 Место на диске:"
df -h . | head -2

echo ""
if [ "$FRONTEND_COUNT" -gt 50 ] && [ "$BACKEND_COUNT" -gt 10 ]; then
    log "🎉 ПОЛНАЯ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "1. Сборка проекта: ./build-project-safe-vps.sh"
    echo "2. Запуск сервера: ./start-server-simple-vps.sh"
    echo "3. Тестирование: ./test-simple-vps.sh"
elif [ "$FRONTEND_COUNT" -gt 20 ] && [ "$BACKEND_COUNT" -gt 5 ]; then
    warn "⚠️ ЧАСТИЧНАЯ УСТАНОВКА (достаточно для работы)"
    echo ""
    echo "🚀 Попробуйте запустить:"
    echo "1. ./start-server-simple-vps.sh"
    echo "2. ./test-simple-vps.sh"
    echo ""
    echo "💡 Если будут ошибки, доустановите модули:"
    echo "   npm install недостающий_модуль"
else
    error "❌ УСТАНОВКА НЕ УДАЛАСЬ"
    echo ""
    echo "🔧 Возможные решения:"
    echo "1. Проверьте интернет: ping google.com"
    echo "2. Очистите кэш: npm cache clean --force"
    echo "3. Попробуйте ручную установку критических модулей:"
    echo "   npm install react next express sqlite3"
    echo "4. Проверьте место на диске: df -h"
fi

echo ""
echo "💡 Полезные команды:"
echo "  • Статус установки: ls node_modules | wc -l"  
echo "  • Размер: du -sh node_modules server/node_modules"
echo "  • Переустановка: rm -rf node_modules && npm install"
