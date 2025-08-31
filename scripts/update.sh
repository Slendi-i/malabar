#!/bin/bash

# Malabar Event Site Update Script
# Скрипт для обновления приложения без полной остановки

set -e

echo "🔄 Обновление Malabar Event Site..."

# Создание резервной копии базы данных
echo "💾 Создание резервной копии базы данных..."
if [ -f "server/malabar.db" ]; then
    cp server/malabar.db server/malabar.db.backup.$(date +%Y%m%d_%H%M%S)
fi

# Обновление зависимостей фронтенда
echo "📦 Обновление зависимостей фронтенда..."
npm install

# Пересборка Next.js приложения
echo "🔨 Пересборка Next.js приложения..."
npm run build

# Обновление зависимостей бэкенда
echo "📦 Обновление зависимостей бэкенда..."
cd server
npm install
cd ..

# Мягкий перезапуск приложений
echo "🔄 Перезапуск приложений..."
pm2 reload ecosystem.config.js

echo "✅ Обновление завершено!"
echo ""
echo "📊 Статус приложений:"
pm2 status
