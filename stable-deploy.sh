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

# Запускаем backend в фоне для проверки
echo "Запуск backend для проверки..."
node server.js &
BACKEND_PID=$!

# Ждем несколько секунд чтобы сервер запустился
sleep 5

# Проверяем что backend отвечает на запросы
if curl -s --connect-timeout 3 http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend проверен - отвечает на запросы"
    kill $BACKEND_PID 2>/dev/null || true
    sleep 2
else
    echo "❌ Backend не отвечает на запросы"
    kill $BACKEND_PID 2>/dev/null || true
    cd ..
    exit 1
fi

cd ..

# 6. Запуск через PM2
echo "6️⃣ Запуск приложений..."

# Убеждаемся что порты свободны
echo "Освобождение портов перед запуском PM2..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true
sleep 3

# Запуск backend
echo "Запуск backend через PM2..."
pm2 start ecosystem.config.js --only malabar-backend

# Ждем дольше для стабильного запуска
sleep 8

# Проверка backend
echo "Проверка статуса backend..."
pm2 status

if pm2 list | grep -q "online.*malabar-backend"; then
    echo "✅ Backend запущен успешно"
else
    echo "❌ Backend не запустился, проверяем логи:"
    pm2 logs malabar-backend --lines 15
    echo "Пробуем еще раз..."
    pm2 restart malabar-backend
    sleep 5
    if pm2 list | grep -q "online.*malabar-backend"; then
        echo "✅ Backend запущен после перезапуска"
    else
        echo "❌ Backend критическая ошибка"
        exit 1
    fi
fi

# Запуск frontend
echo "Запуск frontend через PM2..."
pm2 start ecosystem.config.js --only malabar-frontend

sleep 8

# Проверка frontend
echo "Проверка статуса frontend..."
pm2 status

if pm2 list | grep -q "online.*malabar-frontend"; then
    echo "✅ Frontend запущен успешно"
else
    echo "❌ Frontend не запустился, проверяем логи:"
    pm2 logs malabar-frontend --lines 15
    echo "Пробуем еще раз..."
    pm2 restart malabar-frontend
    sleep 5
    if pm2 list | grep -q "online.*malabar-frontend"; then
        echo "✅ Frontend запущен после перезапуска"
    else
        echo "❌ Frontend критическая ошибка"
        # Не останавливаем весь процесс, если backend работает
        echo "⚠️ Frontend не работает, но backend может работать"
    fi
fi

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
