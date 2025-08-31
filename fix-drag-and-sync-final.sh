#!/bin/bash

# Финальное исправление перетаскивания и синхронизации

echo "🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ПЕРЕТАСКИВАНИЯ И СИНХРОНИЗАЦИИ"
echo "====================================================="

# Остановить все процессы
echo "1️⃣ Остановка процессов..."
pm2 stop all

# Очистить логи
pm2 flush

echo "2️⃣ Запуск backend..."
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend-temp"

sleep 3

echo "3️⃣ Запуск frontend..."
cd /var/www/malabar
pm2 start npm --name "malabar-frontend" -- start

sleep 5

echo "4️⃣ Проверка статуса..."
pm2 status

echo ""
echo "5️⃣ Тестирование endpoints..."

# Test API
echo "API Health:"
curl -s http://localhost:3001/api/health | head -20

echo ""
echo "Players Updates endpoint:"
curl -s "http://localhost:3001/api/players/updates?since=0" | head -20

echo ""
echo "Players endpoint:" 
curl -s http://localhost:3001/api/players | head -20

echo ""
echo "✅ ГОТОВО! Проверьте:"
echo "1. Откройте http://46.173.17.229:3000 или http://vet-klinika-moscow.ru"
echo "2. Войдите как игрок или админ"
echo "3. Попробуйте перетащить круглые аватары"
echo "4. Откройте F12 → Console и смотрите логи"
echo ""
echo "Логи для диагностики:"
echo "pm2 logs malabar-backend-temp --lines 20"
echo "pm2 logs malabar-frontend --lines 20"
