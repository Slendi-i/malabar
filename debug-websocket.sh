#!/bin/bash

# Скрипт диагностики WebSocket проблем на VPS

echo "🔍 Диагностика WebSocket соединения..."
echo "======================================"

# Проверка статуса PM2 процессов
echo "📊 Статус PM2 процессов:"
pm2 status

echo ""
echo "🔍 Проверка процессов на портах:"
echo "Порт 3001 (Backend):"
netstat -tlnp | grep :3001 || echo "❌ Ничего не слушает на порту 3001"

echo "Порт 3000 (Frontend):"
netstat -tlnp | grep :3000 || echo "❌ Ничего не слушает на порту 3000"

echo ""
echo "📋 Логи Backend сервера (последние 20 строк):"
pm2 logs malabar-backend --lines 20 --nostream

echo ""
echo "🌐 Проверка HTTP доступности:"
echo "Backend Health Check:"
curl -s http://localhost:3001/api/health || echo "❌ Backend недоступен по HTTP"

echo ""
echo "Frontend:"
curl -s -I http://localhost:3000 | head -1 || echo "❌ Frontend недоступен"

echo ""
echo "🔥 Проверка Firewall (UFW):"
ufw status

echo ""
echo "🕷️ Тест WebSocket соединения:"
# Простой тест WebSocket через curl
curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: SGVsbG8gV29ybGQ=" \
     http://localhost:3001/ws 2>&1 | head -10

echo ""
echo "📝 Проверка конфигурации сервера:"
echo "Ecosystem.config.js:"
if [ -f "ecosystem.config.js" ]; then
    cat ecosystem.config.js | grep -A 5 -B 5 "malabar-backend"
else
    echo "❌ ecosystem.config.js не найден"
fi

echo ""
echo "🔍 Активные Node.js процессы:"
ps aux | grep node | grep -v grep

echo ""
echo "📡 Сетевые соединения Node.js:"
lsof -i -P | grep node | grep LISTEN

echo ""
echo "💾 Использование ресурсов:"
free -h
df -h | head -5
