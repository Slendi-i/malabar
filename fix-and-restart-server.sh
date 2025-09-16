#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ И ПЕРЕЗАПУСК СЕРВЕРА"
echo "===================================="

# Останавливаем все процессы PM2
echo "🛑 Останавливаем PM2 процессы..."
pm2 stop all

# Удаляем все процессы из PM2
echo "🗑️ Очищаем PM2 процессы..."
pm2 delete all

# Создаем директорию логов
echo "📁 Создаем директорию логов..."
node create-logs-dir.js

# Переходим в server директорию и устанавливаем зависимости
echo "📦 Устанавливаем зависимости сервера..."
cd server
npm install
cd ..

# Проверяем что файлы на месте
echo "📋 Проверяем файлы..."
echo "✓ server/server.js:" $([ -f "server/server.js" ] && echo "OK" || echo "ОТСУТСТВУЕТ")
echo "✓ ecosystem.config.js:" $([ -f "ecosystem.config.js" ] && echo "OK" || echo "ОТСУТСТВУЕТ")
echo "✓ server/package.json:" $([ -f "server/package.json" ] && echo "OK" || echo "ОТСУТСТВУЕТ")

# Запускаем ОБА приложения через PM2 (фронтенд + бэкенд)
echo "🚀 Запускаем фронтенд и бэкенд через PM2..."
pm2 start ecosystem.config.js

# Ждем немного
sleep 3

# Проверяем статус
echo "📊 Статус PM2:"
pm2 status

echo ""
echo "📋 Логи сервера (последние 20 строк):"
pm2 logs malabar-server --lines 20

echo ""
echo "🔍 Проверяем доступность API:"
curl -s http://localhost:3001/api/health || echo "API недоступен"

echo ""
echo "🌐 Проверяем доступность фронтенда:"
curl -s -I http://localhost:3000 | head -1 || echo "Фронтенд недоступен"

echo ""
echo "📊 Оба приложения должны быть online:"
pm2 status | grep -E "(malabar-server|malabar-frontend)"

echo ""
echo "✅ Скрипт завершен. Проверьте статус выше."
