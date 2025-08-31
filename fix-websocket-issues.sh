#!/bin/bash

# Полное исправление проблем с WebSocket на VPS

echo "🔧 Исправление проблем с WebSocket..."
echo "======================================"

# 1. Проверка и остановка процессов
echo "🛑 Остановка существующих процессов..."
pm2 stop all || true

# 2. Проверка портов
echo "🔍 Проверка занятых портов..."
netstat -tlnp | grep -E ":(3000|3001)"

# 3. Освобождение портов если нужно
echo "🧹 Освобождение портов..."
sudo fuser -k 3001/tcp 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true

# 4. Проверка firewall
echo "🔥 Проверка и настройка firewall..."
ufw status
echo "Открываем порты для WebSocket..."
sudo ufw allow 3001/tcp
sudo ufw allow 3000/tcp

# 5. Проверка конфигурации сервера
echo "📝 Проверка server.js..."
if grep -q "WebSocket" server/server.js; then
    echo "✅ WebSocket код найден в server.js"
else
    echo "❌ WebSocket код НЕ найден в server.js"
fi

# 6. Проверка зависимостей
echo "📦 Проверка зависимости ws..."
cd server
if npm list ws >/dev/null 2>&1; then
    echo "✅ Пакет ws установлен"
else
    echo "📦 Установка пакета ws..."
    npm install ws
fi
cd ..

# 7. Пересборка и запуск
echo "🔨 Пересборка приложения..."
npm run build

echo "🚀 Запуск через PM2..."
pm2 start ecosystem.config.js

# 8. Ожидание запуска
echo "⏳ Ожидание запуска серверов..."
sleep 10

# 9. Проверка статуса
echo "📊 Статус процессов:"
pm2 status

# 10. Тестирование соединений
echo "🔍 Тестирование соединений..."

echo "HTTP Backend test:"
curl -s http://localhost:3001/api/health || echo "❌ Backend недоступен"

echo "HTTP Frontend test:"
curl -s -I http://localhost:3000 | head -1 || echo "❌ Frontend недоступен"

echo "WebSocket test:"
timeout 5 curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGVzdA==" \
     http://localhost:3001/ws 2>&1 | head -5

# 11. Показать логи если есть проблемы
echo "📋 Последние логи backend:"
pm2 logs malabar-backend --lines 10 --nostream

echo ""
echo "✅ Исправление завершено!"
echo ""
echo "🌐 Проверьте доступность:"
echo "Frontend: http://46.173.17.229:3000"
echo "Backend: http://46.173.17.229:3001"
echo "WebSocket: ws://46.173.17.229:3001/ws"
echo ""
echo "🔍 Для диагностики используйте:"
echo "pm2 logs - просмотр логов"
echo "pm2 monit - мониторинг ресурсов"
echo "Откройте websocket-test.html в браузере для тестирования WebSocket"
