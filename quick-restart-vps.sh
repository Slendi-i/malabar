#!/bin/bash

# Быстрый перезапуск сервисов на VPS
# Используйте этот скрипт для быстрого применения изменений

echo "🔄 Быстрый перезапуск сервисов Malabar..."

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Не найдена директория /var/www/malabar"
    exit 1
}

log "⏹️ Останавливаем сервисы..."
pm2 stop all

log "🔄 Применяем git изменения..."
git stash
git pull origin main || warn "Git pull failed"

log "🏗️ Пересборка проекта..."
npm run build

log "▶️ Запускаем сервисы..."
pm2 start ecosystem.config.js

# Ждем запуска
sleep 5

log "🧪 Быстрая проверка..."

# Проверяем бэкенд
if curl -f -s "http://localhost:3001/api/health" > /dev/null; then
    log "✅ Бэкенд работает"
else
    error "❌ Бэкенд не отвечает"
    pm2 logs malabar-server --lines 10
fi

# Проверяем фронтенд
if curl -f -s "http://localhost:3000" > /dev/null; then
    log "✅ Фронтенд работает"
else
    warn "⚠️ Фронтенд еще запускается..."
fi

log "📊 Статус сервисов:"
pm2 status

echo ""
echo "🎉 Перезапуск завершен!"
echo "🧪 Для полной проверки запустите: node test-sync-fixes.js"
