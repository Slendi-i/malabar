#!/bin/bash

echo "⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ SQLITE3"
echo "============================"

# Остановка всех процессов
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Полная очистка зависимостей
echo "🗑️ Очистка старых зависимостей..."
rm -rf server/node_modules server/package-lock.json
npm cache clean --force

# Установка системных инструментов если нужно
echo "🔧 Проверка системных инструментов..."
sudo apt-get update -qq
sudo apt-get install -y build-essential python3 make

# Переустановка backend зависимостей с компиляцией
echo "📦 Переустановка backend зависимостей..."
cd server
npm install --build-from-source

# Принудительная переустановка sqlite3
echo "🗄️ Принудительная переустановка sqlite3..."
npm uninstall sqlite3
npm install sqlite3 --build-from-source

# Тест sqlite3
echo "🧪 Тест sqlite3..."
if node -e "require('sqlite3')" 2>/dev/null; then
    echo "✅ SQLite3 работает!"
else
    echo "❌ SQLite3 все еще не работает"
    exit 1
fi

cd ..

# Быстрый тест backend
echo "🚀 Тест backend..."
cd server
node server.js &
BACKEND_PID=$!
sleep 5

if curl -s --connect-timeout 3 http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend работает!"
    kill $BACKEND_PID
else
    echo "❌ Backend не работает"
    kill $BACKEND_PID
    exit 1
fi

cd ..

# Запуск через PM2
echo "🚀 Запуск через PM2..."
pm2 start server/server.js --name "malabar-backend"
pm2 start npm --name "malabar-frontend" -- start

sleep 8
pm2 status

echo ""
echo "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo "Проверьте: http://46.173.17.229:3000"
