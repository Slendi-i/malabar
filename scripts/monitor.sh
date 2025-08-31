#!/bin/bash

# Malabar Event Site Monitoring Script
# Скрипт для мониторинга состояния приложения

echo "📊 Состояние Malabar Event Site"
echo "================================"

# Статус PM2 процессов
echo "🔍 PM2 Процессы:"
pm2 status

echo ""
echo "💾 Использование памяти:"
pm2 monit --no-daemon || true

echo ""
echo "📈 Статистика приложения:"
echo "Frontend URL: http://46.173.17.229:3000"
echo "Backend URL:  http://46.173.17.229:3001"

# Проверка доступности сервисов
echo ""
echo "🔗 Проверка доступности:"

# Проверка фронтенда
if curl -s --head http://localhost:3000 | head -n 1 | grep -q "200 OK"; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

# Проверка бэкенда
if curl -s --head http://localhost:3001/api/health | head -n 1 | grep -q "200 OK"; then
    echo "✅ Backend доступен"
else
    echo "❌ Backend недоступен"
fi

echo ""
echo "📄 Последние логи:"
echo "Frontend:"
pm2 logs malabar-frontend --lines 5 --nostream 2>/dev/null || echo "Нет логов фронтенда"

echo ""
echo "Backend:"
pm2 logs malabar-backend --lines 5 --nostream 2>/dev/null || echo "Нет логов бэкенда"
