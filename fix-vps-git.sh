#!/bin/bash

# Скрипт для исправления Git конфликтов на VPS сервере
set -e

echo "🔧 Исправление Git merge конфликтов на VPS сервере..."

# Остановка PM2 процессов для безопасности
echo "🛑 Остановка PM2 процессов..."
pm2 stop all || true

# Резервная копия базы данных
echo "💾 Создание резервной копии базы данных..."
if [ -f "server/malabar.db" ]; then
    cp server/malabar.db server/malabar.db.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Резервная копия создана"
fi

# Резервная копия package.json файлов (на случай если есть важные изменения)
echo "💾 Резервная копия package файлов..."
if [ -f "server/package.json" ]; then
    cp server/package.json server/package.json.backup
fi
if [ -f "package.json" ]; then
    cp package.json package.json.backup
fi

# Удаление node_modules и package-lock.json для чистого состояния
echo "🗑️  Очистка node_modules и lock файлов..."
rm -rf server/node_modules/
rm -rf node_modules/
rm -f server/package-lock.json
rm -f package-lock.json

# Очистка Git кэша и неотслеживаемых файлов
echo "🧹 Очистка Git..."
git clean -fd
git reset --hard HEAD

# Обновление с удаленного репозитория
echo "📥 Получение обновлений с GitHub..."
git fetch origin main
git reset --hard origin/main

# Установка зависимостей для фронтенда
echo "📦 Установка зависимостей фронтенда..."
npm install

# Сборка Next.js приложения
echo "🔨 Сборка Next.js приложения..."
npm run build

# Установка зависимостей для бэкенда
echo "📦 Установка зависимостей бэкенда..."
cd server
npm install
cd ..

# Создание директории для логов
mkdir -p logs

# Запуск приложений через PM2
echo "🚀 Запуск приложений..."
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

echo "✅ Исправление завершено!"
echo ""
echo "📊 Статус приложений:"
pm2 status

echo ""
echo "🌐 Приложение доступно на:"
echo "  Frontend: http://46.173.17.229:3000"
echo "  Backend:  http://46.173.17.229:3001"

# Проверка работоспособности
echo ""
echo "🔍 Проверка работоспособности..."
sleep 5
if curl -s --head http://localhost:3001/api/health | head -n 1 | grep -q "200 OK"; then
    echo "✅ Backend работает корректно"
else
    echo "❌ Backend недоступен, проверьте логи: pm2 logs malabar-backend"
fi

if curl -s --head http://localhost:3000 | head -n 1 | grep -q "200 OK"; then
    echo "✅ Frontend работает корректно"
else
    echo "❌ Frontend недоступен, проверьте логи: pm2 logs malabar-frontend"
fi
