#!/bin/bash

# Быстрый перезапуск серверов для тестирования изменений
echo "🔄 Перезапуск серверов для тестирования исправлений..."

# Запоминаем текущую директорию
CURRENT_DIR=$(pwd)
echo "📂 Текущая директория: $CURRENT_DIR"

# Останавливаем процессы если они запущены
echo "🛑 Остановка старых процессов..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "next" 2>/dev/null

# Ждем пока процессы завершатся
sleep 3

# Переустанавливаем sqlite3 для текущей платформы
echo "🔧 Переустановка sqlite3 для текущей платформы..."
cd "$CURRENT_DIR/server"
if [ -d node_modules ]; then
    echo "   Удаляем старый sqlite3..."
    rm -rf node_modules/sqlite3
fi

echo "   Устанавливаем sqlite3 заново..."
npm install sqlite3 --build-from-source

# Проверяем успешность установки
if [ $? -ne 0 ]; then
    echo "❌ Ошибка установки sqlite3. Пробуем альтернативный способ..."
    npm rebuild sqlite3
fi

echo "🚀 Запуск backend сервера на порту 3001..."
cd "$CURRENT_DIR/server"
node server.js &
BACKEND_PID=$!

# Даем время backend серверу запуститься
sleep 5

echo "🚀 Запуск frontend сервера на порту 3000..."
cd "$CURRENT_DIR"

# Проверяем наличие package.json
if [ ! -f package.json ]; then
    echo "❌ package.json не найден в $CURRENT_DIR"
    echo "📂 Содержимое текущей директории:"
    ls -la
    exit 1
fi

npm run dev &
FRONTEND_PID=$!

echo "✅ Серверы запущены:"
echo "   Backend PID: $BACKEND_PID (порт 3001)"
echo "   Frontend PID: $FRONTEND_PID (порт 3000)"
echo ""
echo "📊 Состояние серверов:"
echo "   Frontend: http://46.173.17.229:3000"
echo "   Backend API: http://46.173.17.229:3001/api/health"
echo ""
echo "🔧 Для остановки используйте Ctrl+C или:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

# Ждем завершения работы
wait
