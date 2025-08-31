#!/bin/bash

echo "🎯 ФИНАЛЬНЫЕ ИСПРАВЛЕНИЯ - ПОЛНАЯ ВЕРСИЯ"
echo "========================================"

# 1. Очистка PM2
echo "1️⃣ Очистка PM2 процессов..."
pm2 stop all
pm2 delete all
pm2 flush

# 2. Обновление кода из Git
echo "2️⃣ Обновление кода..."
cd /var/www/malabar
git pull origin main

# 3. Установка зависимостей
echo "3️⃣ Установка зависимостей..."
npm install
cd server
npm install
cd ..

# 4. Запуск backend  
echo "4️⃣ Запуск backend (порт 3001)..."
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend"

sleep 3

# 5. Запуск frontend
echo "5️⃣ Запуск frontend (порт 3000)..."
cd /var/www/malabar
pm2 start npm --name "malabar-frontend" -- start

sleep 5

# 6. Проверка результата
echo "6️⃣ Проверка статуса..."
pm2 status

echo ""
echo "🧪 Тестирование..."

# Test health
echo "Backend Health:"
curl -s http://localhost:3001/api/health | head -20

echo ""
echo "Players API:"
curl -s http://localhost:3001/api/players | head -50

echo ""
echo "Updates API:" 
curl -s "http://localhost:3001/api/players/updates?since=0" | head -50

echo ""
echo "✅ ГОТОВО! Что исправлено:"
echo ""
echo "🖱️  ПЕРЕТАСКИВАНИЕ:"
echo "   ✅ Свободное перетаскивание без сетки"
echo "   ✅ Сохранение точных пиксельных координат (x, y)"
echo "   ✅ Работает для всех типов пользователей"
echo ""
echo "📡 СИНХРОНИЗАЦИЯ:"
echo "   ✅ Очищены дублированные PM2 процессы"
echo "   ✅ HTTP polling для резерва WebSocket"
echo "   ✅ Полная синхронизация игроков"
echo ""
echo "🎨 ИНТЕРФЕЙС:"
echo "   ✅ Плашка синхронизации перемещена вниз-вправо"
echo ""
echo "📊 ДИАГНОСТИКА:"
echo "pm2 logs malabar-backend --lines 20"
echo "pm2 logs malabar-frontend --lines 20" 
echo ""
echo "🌐 ДОСТУП:"
echo "http://46.173.17.229:3000 (IP)"
echo "http://vet-klinika-moscow.ru (домен)"
