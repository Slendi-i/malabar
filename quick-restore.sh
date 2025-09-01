#!/bin/bash

echo "⚡ БЫСТРОЕ ВОССТАНОВЛЕНИЕ MALABAR"
echo "==============================="

# Принудительная остановка всех процессов
echo "🛑 Остановка всех процессов..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Освобождение портов
echo "🔧 Освобождение портов..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true
sleep 2

# Быстрая проверка файлов
echo "📁 Проверка критических файлов..."
if [ ! -f server/server.js ]; then
    echo "❌ server/server.js не найден!"
    exit 1
fi

if [ ! -f package.json ]; then
    echo "❌ package.json не найден!"
    exit 1
fi

# Создание папки логов
mkdir -p logs

# Запуск backend напрямую (без PM2 для быстрого тестирования)
echo "🚀 Тестовый запуск backend..."
cd server
timeout 3s node server.js &
BACKEND_PID=$!
cd ..

sleep 2

# Проверка backend
if curl -s --connect-timeout 2 http://localhost:3001/api/health >/dev/null; then
    echo "✅ Backend работает"
    kill $BACKEND_PID 2>/dev/null || true
else
    echo "❌ Backend не отвечает"
    kill $BACKEND_PID 2>/dev/null || true
    echo "Попробуйте полное развертывание: ./stable-deploy.sh"
    exit 1
fi

# Запуск через PM2
echo "🚀 Запуск через PM2..."

# Backend
pm2 start server/server.js --name "malabar-backend"
sleep 3

if pm2 list | grep -q "online.*malabar-backend"; then
    echo "✅ Backend запущен через PM2"
else
    echo "❌ Ошибка запуска backend через PM2"
    pm2 logs malabar-backend --lines 5
    exit 1
fi

# Frontend
pm2 start npm --name "malabar-frontend" -- start
sleep 5

if pm2 list | grep -q "online.*malabar-frontend"; then
    echo "✅ Frontend запущен через PM2"
else
    echo "❌ Ошибка запуска frontend через PM2"
    pm2 logs malabar-frontend --lines 5
    exit 1
fi

# Финальная проверка
echo "🧪 Финальная проверка..."

sleep 3

# Backend
if curl -s --connect-timeout 3 http://localhost:3001/api/health >/dev/null; then
    echo "✅ Backend API доступен"
else
    echo "❌ Backend API недоступен"
fi

# Frontend
if curl -s --connect-timeout 3 http://localhost:3000 >/dev/null; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

echo ""
echo "📊 Статус PM2:"
pm2 status

echo ""
echo "🌐 Проверьте в браузере:"
echo "http://localhost:3000"
echo "http://46.173.17.229:3000"
echo "http://vet-klinika-moscow.ru"

echo ""
echo "⚡ БЫСТРОЕ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!"
