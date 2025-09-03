#!/bin/bash

# Быстрый перезапуск серверов для тестирования изменений
echo "🔄 Перезапуск серверов для тестирования исправлений..."

# Останавливаем процессы если они запущены
echo "🛑 Остановка старых процессов..."
pkill -f "node.*server.js"
pkill -f "next"

# Ждем пока процессы завершатся
sleep 2

echo "🚀 Запуск backend сервера на порту 3001..."
cd server && node server.js &
BACKEND_PID=$!

echo "🚀 Запуск frontend сервера на порту 3000..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "✅ Серверы запущены:"
echo "   Backend PID: $BACKEND_PID (порт 3001)"
echo "   Frontend PID: $FRONTEND_PID (порт 3000)"
echo ""
echo "📊 Состояние серверов:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001/api/health"
echo ""
echo "🔧 Для остановки используйте Ctrl+C или:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

# Ждем завершения работы
wait
