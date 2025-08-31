#!/bin/bash

# Malabar Event Site Deployment Script
# Использовать на VPS сервере для автоматического развертывания

set -e  # Выход при любой ошибке

echo "🚀 Начинается развертывание Malabar Event Site..."

# Проверка наличия PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    npm install -g pm2
fi

# Остановка существующих процессов
echo "🛑 Остановка существующих процессов..."
pm2 stop ecosystem.config.js || true
pm2 delete ecosystem.config.js || true

# Создание директории для логов
echo "📁 Создание директории для логов..."
mkdir -p logs

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

# Запуск приложений через PM2
echo "🚀 Запуск приложений через PM2..."
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
echo "💾 Сохранение конфигурации PM2..."
pm2 save

# Настройка автозапуска при перезагрузке
echo "🔄 Настройка автозапуска..."
pm2 startup

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус приложений:"
pm2 status

echo ""
echo "📋 Полезные команды:"
echo "  pm2 status           - статус всех процессов"
echo "  pm2 logs             - просмотр логов всех процессов"
echo "  pm2 logs malabar-frontend  - логи фронтенда"
echo "  pm2 logs malabar-backend   - логи бэкенда"
echo "  pm2 restart all      - перезапуск всех процессов"
echo "  pm2 stop all         - остановка всех процессов"
echo "  pm2 delete all       - удаление всех процессов"
echo ""
echo "🌐 Приложение доступно на:"
echo "  Frontend: http://46.173.17.229:3000"
echo "  Backend:  http://46.173.17.229:3001"
