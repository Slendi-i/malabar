#!/bin/bash

echo "🔧 Исправление ошибки Next.js 'missing required error components' на VPS..."
echo ""

echo "⏹️ Остановка всех процессов..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
echo ""

echo "🧹 Очистка кэша Next.js..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
echo ""

echo "📦 Проверка зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей..."
    npm install
else
    echo "Зависимости уже установлены"
fi
echo ""

echo "🚀 Запуск backend сервера..."
cd server
nohup node server.js > ../server.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "Backend запущен с PID: $BACKEND_PID"
echo ""

echo "⏳ Ожидание запуска backend..."
sleep 3
echo ""

echo "🚀 Запуск frontend сервера..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend запущен с PID: $FRONTEND_PID"
echo ""

echo "⏳ Ожидание запуска frontend..."
sleep 5
echo ""

echo "🧪 Проверка серверов..."
echo "Backend: http://localhost:3001/api/health"
echo "Frontend: http://localhost:3000"
echo ""

# Проверка health endpoint
HEALTH_CHECK=$(curl -s --connect-timeout 5 http://localhost:3001/api/health || echo "failed")
if [[ $HEALTH_CHECK == *"OK"* ]]; then
    echo "✅ Backend сервер работает"
else
    echo "❌ Backend сервер не отвечает"
fi

# Проверка frontend
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null; then
    echo "✅ Frontend сервер работает"
else
    echo "❌ Frontend сервер не отвечает"
fi
echo ""

echo "✅ Готово! Откройте http://localhost:3000 в браузере"
echo ""
echo "📝 Если ошибка остается:"
echo "1. Очистите кэш браузера (Ctrl+Shift+Delete)"
echo "2. Проверьте консоль браузера (F12)"
echo "3. Проверьте логи: tail -f server.log и tail -f frontend.log"
echo ""

echo "🔧 Полезные команды:"
echo "# Просмотр логов backend:"
echo "tail -f server.log"
echo ""
echo "# Просмотр логов frontend:"
echo "tail -f frontend.log"
echo ""
echo "# Остановка серверов:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "# Проверка процессов:"
echo "ps aux | grep -E '(node|npm)'"
echo ""

# Сохраняем PIDs для удобства
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid
echo "PIDs сохранены в .backend.pid и .frontend.pid"
