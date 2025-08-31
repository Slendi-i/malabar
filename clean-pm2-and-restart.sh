#!/bin/bash

# Очистка PM2 процессов и правильный перезапуск

echo "🧹 ОЧИСТКА PM2 И ПЕРЕЗАПУСК"
echo "============================"

echo "1️⃣ Остановка всех процессов..."
pm2 stop all

echo "2️⃣ Удаление всех процессов..."
pm2 delete all

echo "3️⃣ Очистка логов..."
pm2 flush

echo "4️⃣ Проверка что все процессы удалены..."
pm2 status

echo ""
echo "5️⃣ Запуск BACKEND (порт 3001)..."
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend"

sleep 3

echo "6️⃣ Запуск FRONTEND (порт 3000)..."
cd /var/www/malabar
pm2 start npm --name "malabar-frontend" -- start

sleep 5

echo ""
echo "7️⃣ Проверка итогового статуса..."
pm2 status

echo ""
echo "8️⃣ Проверка портов..."
netstat -tlnp | grep -E ":(3000|3001)" || echo "⚠️  Порты не найдены"

echo ""
echo "9️⃣ Тест API..."
echo "Backend Health:"
curl -s http://localhost:3001/api/health || echo "❌ Backend не отвечает"

echo ""
echo "Players API:"
curl -s http://localhost:3001/api/players | head -100 || echo "❌ Players API не работает"

echo ""
echo "✅ ГОТОВО! Теперь должно работать:"
echo "🌐 http://46.173.17.229:3000 (IP)"
echo "🌐 http://vet-klinika-moscow.ru (домен)"
echo ""
echo "📊 Мониторинг:"
echo "pm2 status"
echo "pm2 logs malabar-backend --lines 10"
echo "pm2 logs malabar-frontend --lines 10"
