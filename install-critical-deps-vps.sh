#!/bin/bash

# Установка только критических зависимостей (быстро и надежно)

echo "📦 Установка критических зависимостей..."
echo "======================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

cd /var/www/malabar || { error "Директория не найдена!"; exit 1; }

echo "📍 Устанавливаем только необходимые пакеты для работы сервера..."

echo ""
echo "🔧 Фронтенд (критические пакеты)..."

# Устанавливаем только то что нужно для запуска
timeout 120 npm install --production --no-optional react next @mui/material express 2>/dev/null

if [ $? -eq 0 ]; then
    log "Критические пакеты фронтенда установлены"
elif [ -d "node_modules" ] && [ "$(ls node_modules | wc -l)" -gt 5 ]; then
    warn "Частичная установка фронтенда"
else
    error "Ошибка установки фронтенда"
    echo "Попробуйте ручную установку:"
    echo "npm install --production react next express"
    exit 1
fi

echo ""
echo "🔧 Бэкенд (критические пакеты)..."

cd server

# Устанавливаем только server зависимости
timeout 60 npm install --production --no-optional express sqlite3 ws cors 2>/dev/null

if [ $? -eq 0 ]; then
    log "Критические пакеты бэкенда установлены"
elif [ -d "node_modules" ] && [ "$(ls node_modules | wc -l)" -gt 3 ]; then
    warn "Частичная установка бэкенда"
else
    error "Ошибка установки бэкенда"
    echo "Попробуйте ручную установку:"
    echo "cd server && npm install express sqlite3 ws cors"
    exit 1
fi

cd ..

echo ""
echo "📊 Результат установки:"
FRONTEND_COUNT=$(ls node_modules 2>/dev/null | wc -l)
BACKEND_COUNT=$(ls server/node_modules 2>/dev/null | wc -l)
echo "  • Фронтенд модулей: $FRONTEND_COUNT"
echo "  • Бэкенд модулей: $BACKEND_COUNT"

if [ "$FRONTEND_COUNT" -gt 10 ] && [ "$BACKEND_COUNT" -gt 3 ]; then
    echo ""
    log "✅ Критические зависимости установлены!"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "1. Запуск сервера: ./start-server-simple-vps.sh"
    echo "2. Проверка: ./test-simple-vps.sh"
    echo ""
    echo "💡 Для полной функциональности позже запустите:"
    echo "   ./install-deps-safe-vps.sh"
else
    warn "⚠️ Установка неполная, но можно попробовать запустить"
    echo ""
    echo "🔧 Попробуйте:"
    echo "1. ./start-server-simple-vps.sh"
    echo "2. Если не работает: ./install-deps-safe-vps.sh"
fi
