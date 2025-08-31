#!/bin/bash

echo "🔄 ОТКАТ К РАБОЧЕЙ ВЕРСИИ"
echo "========================="

echo "1️⃣ Остановка процессов..."
pm2 stop all
pm2 delete all

echo "2️⃣ Откат Git к предыдущему коммиту..."
cd /var/www/malabar
git log --oneline -5
echo ""
echo "Откатываемся к последнему рабочему коммиту..."
git reset --hard HEAD~1
git clean -fd

echo "3️⃣ Переустановка зависимостей..."
echo "Backend:"
cd /var/www/malabar/server
rm -rf node_modules
npm install

echo ""
echo "Frontend:"
cd /var/www/malabar  
rm -rf node_modules
npm install

echo "4️⃣ Простой запуск..."
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend"

sleep 3

cd /var/www/malabar
pm2 start npm --name "malabar-frontend" -- start

sleep 3

echo "5️⃣ Проверка статуса..."
pm2 status

echo ""
echo "6️⃣ Тест доступности..."
curl -s http://localhost:3001/api/health || echo "❌ Backend недоступен"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend доступен" || echo "❌ Frontend недоступен"

echo ""
echo "✅ ОТКАТ ЗАВЕРШЕН!"
echo "Если работает, то применяйте изменения постепенно, по одному файлу."
