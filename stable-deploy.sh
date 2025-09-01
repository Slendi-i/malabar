#!/bin/bash

echo "🚀 СТАБИЛЬНОЕ РАЗВЕРТЫВАНИЕ MALABAR"
echo "=================================="

# Проверка зависимостей
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Устанавливаем..."
    npm install -g pm2
fi

# Настройка логов
echo "📁 Создание директории для логов..."
mkdir -p logs

# 1. Полная очистка PM2
echo "1️⃣ Очистка PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 flush 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Принудительная очистка портов
echo "🔧 Освобождение портов..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true

sleep 3

# 2. Установка зависимостей для backend
echo "2️⃣ Установка backend зависимостей..."
cd server
if [ ! -f package.json ]; then
    echo "❌ package.json не найден в server/"
    exit 1
fi

rm -rf node_modules package-lock.json
npm install
cd ..

# 3. Установка зависимостей для frontend
echo "3️⃣ Установка frontend зависимостей..."
if [ ! -f package.json ]; then
    echo "❌ package.json не найден в корне"
    exit 1
fi

rm -rf node_modules package-lock.json
npm install

# 4. Сборка frontend
echo "4️⃣ Сборка frontend..."
npm run build

# 5. Проверка backend
echo "5️⃣ Проверка backend..."
cd server
timeout 5s node server.js || {
    echo "❌ Backend не запускается"
    cd ..
    exit 1
}
cd ..

echo "✅ Backend проверен"

# 6. Запуск через PM2
echo "6️⃣ Запуск приложений..."

# Запуск backend
pm2 start ecosystem.config.js --only malabar-backend
sleep 5

# Проверка backend
if ! pm2 list | grep -q "online.*malabar-backend"; then
    echo "❌ Backend не запустился"
    pm2 logs malabar-backend --lines 10
    exit 1
fi

echo "✅ Backend запущен успешно"

# Запуск frontend
pm2 start ecosystem.config.js --only malabar-frontend
sleep 5

# Проверка frontend
if ! pm2 list | grep -q "online.*malabar-frontend"; then
    echo "❌ Frontend не запустился"
    pm2 logs malabar-frontend --lines 10
    exit 1
fi

echo "✅ Frontend запущен успешно"

# 7. Финальные проверки
echo "7️⃣ Проверка работоспособности..."

# Проверка backend API
echo "Проверка backend API..."
sleep 3
BACKEND_HEALTH=$(curl -s --connect-timeout 5 http://localhost:3001/api/health || echo "failed")
if [[ $BACKEND_HEALTH == *"OK"* ]]; then
    echo "✅ Backend API работает"
else
    echo "❌ Backend API недоступен"
    echo "Ответ: $BACKEND_HEALTH"
fi

# Проверка frontend
echo "Проверка frontend..."
FRONTEND_STATUS=$(curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend работает"
else
    echo "❌ Frontend недоступен (код: $FRONTEND_STATUS)"
fi

# Проверка игроков API
echo "Проверка игроков API..."
PLAYERS_API=$(curl -s --connect-timeout 5 http://localhost:3001/api/players || echo "failed")
if [[ $PLAYERS_API == *"["* ]]; then
    echo "✅ API игроков работает"
else
    echo "❌ API игроков недоступен"
fi

# 8. Итоговый статус
echo ""
echo "📊 ФИНАЛЬНЫЙ СТАТУС:"
echo "==================="
pm2 status

echo ""
echo "🌐 ДОСТУПНОСТЬ:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Health:   http://localhost:3001/api/health"
echo "Players:  http://localhost:3001/api/players"

echo ""
echo "📝 ЛОГИ:"
echo "pm2 logs malabar-backend"
echo "pm2 logs malabar-frontend"

echo ""
echo "🔧 УПРАВЛЕНИЕ:"
echo "pm2 restart all    # Перезапуск"
echo "pm2 stop all       # Остановка"
echo "pm2 reload all     # Перезагрузка без даунтайма"

echo ""
echo "✅ РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО!"
