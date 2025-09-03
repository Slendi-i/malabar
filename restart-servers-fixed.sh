#!/bin/bash

# Скрипт для перезапуска серверов с исправлениями синхронизации
# Запускает frontend на порту 3000 и backend на порту 3001

echo "🔄 Перезапуск серверов с исправлениями синхронизации..."

# Остановка всех процессов Next.js и Node.js
echo "⏹️ Остановка существующих процессов..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Ждем завершения процессов
sleep 2

# Проверка портов
echo "🔍 Проверка портов..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Порт 3000 все еще занят"
    echo "Попытка освободить порт 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Порт 3001 все еще занят"
    echo "Попытка освободить порт 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Установка зависимостей если нужно
echo "📦 Проверка зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей для frontend..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "Установка зависимостей для backend..."
    cd server && npm install && cd ..
fi

# Запуск backend сервера
echo "🚀 Запуск backend сервера (порт 3001)..."
cd server
nohup node server.js > ../server.log 2>&1 &
BACKEND_PID=$!
cd ..

# Ждем запуска backend
echo "⏳ Ожидание запуска backend сервера..."
sleep 3

# Проверка запуска backend
if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Backend сервер не запустился"
    echo "Проверьте логи в server.log"
    tail -20 server.log
    exit 1
fi

echo "✅ Backend сервер запущен (PID: $BACKEND_PID)"

# Запуск frontend сервера
echo "🚀 Запуск frontend сервера (порт 3000)..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Ждем запуска frontend
echo "⏳ Ожидание запуска frontend сервера..."
sleep 5

# Проверка запуска frontend
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Frontend сервер не запустился"
    echo "Проверьте логи в frontend.log"
    tail -20 frontend.log
    exit 1
fi

echo "✅ Frontend сервер запущен (PID: $FRONTEND_PID)"

# Тестирование API
echo "🧪 Тестирование API..."
sleep 2

# Проверка health endpoint
HEALTH_CHECK=$(curl -s --connect-timeout 5 http://localhost:3001/api/health || echo "failed")
if [[ $HEALTH_CHECK == *"OK"* ]]; then
    echo "✅ Health check успешен"
else
    echo "❌ Health check провалился"
    echo "Ответ: $HEALTH_CHECK"
fi

# Проверка players endpoint
PLAYERS_CHECK=$(curl -s --connect-timeout 5 http://localhost:3001/api/players || echo "failed")
if [[ $PLAYERS_CHECK == *"["* ]]; then
    echo "✅ Players API работает"
else
    echo "❌ Players API недоступен"
    echo "Ответ: $PLAYERS_CHECK"
fi

echo ""
echo "🎉 Серверы запущены с исправлениями!"
echo ""
echo "📊 СТАТУС:"
echo "Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo "Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo ""
echo "📝 ЛОГИ:"
echo "Backend:  tail -f server.log"
echo "Frontend: tail -f frontend.log"
echo ""
echo "🔧 ИСПРАВЛЕНИЯ ВКЛЮЧАЮТ:"
echo "✅ Эндпоинты для сохранения игр (/api/players/:id/games)"
echo "✅ Эндпоинты для сохранения социальных ссылок (/api/players/:id/social)"
echo "✅ Эндпоинты для сохранения координат фишек (/api/players/:id/coordinates)"
echo "✅ WebSocket синхронизация в реальном времени"
echo ""
echo "🧪 ТЕСТИРОВАНИЕ:"
echo "Запустите: node test-game-sync-fixes.js"
echo ""
echo "⚠️ ДЛЯ ОСТАНОВКИ:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo "или нажмите Ctrl+C в каждом терминале"

# Сохраняем PIDs для удобства остановки
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo ""
echo "🎮 Готово к использованию!"
