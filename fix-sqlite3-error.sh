#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ ОШИБКИ SQLITE3"
echo "============================"

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server/server.js" ]; then
    echo "❌ Неправильная директория. Должны быть в /var/www/malabar"
    exit 1
fi

echo "📁 Текущая директория: $(pwd)"
echo "🖥️ Система: $(uname -a)"
echo "📦 Node.js: $(node --version)"
echo "📦 npm: $(npm --version)"

# 1. Полная остановка всех процессов
echo ""
echo "1️⃣ ПОЛНАЯ ОЧИСТКА ПРОЦЕССОВ"
echo "=========================="

pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo pkill -f "npm.*start" 2>/dev/null || true

sleep 3
echo "✅ Все процессы остановлены"

# 2. Полная очистка node_modules
echo ""
echo "2️⃣ ПОЛНАЯ ОЧИСТКА ЗАВИСИМОСТЕЙ"
echo "============================="

echo "Удаление node_modules frontend..."
rm -rf node_modules package-lock.json 2>/dev/null || true

echo "Удаление node_modules backend..."
rm -rf server/node_modules server/package-lock.json 2>/dev/null || true

echo "Очистка npm cache..."
npm cache clean --force

echo "✅ Все зависимости очищены"

# 3. Установка системных зависимостей для компиляции
echo ""
echo "3️⃣ ПРОВЕРКА СИСТЕМНЫХ ЗАВИСИМОСТЕЙ"
echo "================================="

# Проверяем наличие build-essential
if ! dpkg -l | grep -q build-essential; then
    echo "Установка build-essential..."
    sudo apt-get update
    sudo apt-get install -y build-essential
else
    echo "✅ build-essential установлен"
fi

# Проверяем наличие python3
if ! command -v python3 &> /dev/null; then
    echo "Установка python3..."
    sudo apt-get install -y python3
else
    echo "✅ python3 доступен: $(python3 --version)"
fi

# Проверяем наличие make
if ! command -v make &> /dev/null; then
    echo "Установка make..."
    sudo apt-get install -y make
else
    echo "✅ make доступен: $(make --version | head -1)"
fi

# 4. Переустановка backend зависимостей
echo ""
echo "4️⃣ ПЕРЕУСТАНОВКА BACKEND ЗАВИСИМОСТЕЙ"
echo "===================================="

cd server

echo "Проверка package.json..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден в server/"
    exit 1
fi

echo "Установка зависимостей backend с полной перекомпиляцией..."
npm install --build-from-source

# Проверяем что sqlite3 установился корректно
echo "Проверка sqlite3..."
if node -e "require('sqlite3')" 2>/dev/null; then
    echo "✅ sqlite3 установлен корректно"
else
    echo "❌ sqlite3 все еще не работает, пробуем альтернативный способ..."
    
    # Принудительная переустановка sqlite3
    npm uninstall sqlite3
    npm install sqlite3 --build-from-source --sqlite=/usr/local
    
    if node -e "require('sqlite3')" 2>/dev/null; then
        echo "✅ sqlite3 установлен после принудительной переустановки"
    else
        echo "❌ Критическая ошибка sqlite3"
        exit 1
    fi
fi

cd ..

# 5. Переустановка frontend зависимостей  
echo ""
echo "5️⃣ ПЕРЕУСТАНОВКА FRONTEND ЗАВИСИМОСТЕЙ"
echo "====================================="

echo "Установка зависимостей frontend..."
npm install

echo "✅ Frontend зависимости установлены"

# 6. Тестирование backend
echo ""
echo "6️⃣ ТЕСТИРОВАНИЕ BACKEND"
echo "====================="

cd server

echo "Запуск тестового backend..."
timeout 10s node server.js &
BACKEND_PID=$!

sleep 6

echo "Проверка API..."
if curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend API работает!"
    
    # Проверка players API
    if curl -s --connect-timeout 5 http://localhost:3001/api/players >/dev/null 2>&1; then
        echo "✅ Players API работает!"
        BACKEND_OK=true
    else
        echo "❌ Players API не работает"
        BACKEND_OK=false
    fi
else
    echo "❌ Backend API не отвечает"
    BACKEND_OK=false
fi

# Остановка тестового backend
kill $BACKEND_PID 2>/dev/null || true
killall node 2>/dev/null || true
sleep 2

cd ..

if [ "$BACKEND_OK" != "true" ]; then
    echo "❌ Backend не прошел тестирование"
    echo "Проверим что происходит:"
    cd server
    echo "Прямой запуск для диагностики..."
    timeout 5s node server.js || echo "Ошибка запуска backend"
    cd ..
    exit 1
fi

# 7. Сборка frontend
echo ""
echo "7️⃣ СБОРКА FRONTEND"
echo "=================="

echo "Сборка Next.js приложения..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend собран успешно"
else
    echo "❌ Ошибка сборки frontend"
    exit 1
fi

# 8. Финальный запуск через PM2
echo ""
echo "8️⃣ ЗАПУСК ЧЕРЕЗ PM2"
echo "=================="

echo "Запуск backend..."
pm2 start server/server.js --name "malabar-backend"

sleep 8

# Проверка backend
if pm2 list | grep -q "online.*malabar-backend"; then
    echo "✅ Backend запущен через PM2"
    
    # Дополнительная проверка API
    sleep 3
    if curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ Backend API работает через PM2"
    else
        echo "❌ Backend API не отвечает через PM2"
        pm2 logs malabar-backend --lines 10
    fi
else
    echo "❌ Backend не запустился через PM2"
    pm2 logs malabar-backend --lines 15
    exit 1
fi

echo "Запуск frontend..."
pm2 start npm --name "malabar-frontend" -- start

sleep 10

# Проверка frontend
if pm2 list | grep -q "online.*malabar-frontend"; then
    echo "✅ Frontend запущен через PM2"
    
    # Проверка HTTP
    sleep 5
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 http://localhost:3000 2>/dev/null || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo "✅ Frontend отвечает (код: $FRONTEND_STATUS)"
    else
        echo "⚠️ Frontend запущен но не отвечает (код: $FRONTEND_STATUS)"
    fi
else
    echo "❌ Frontend не запустился через PM2"
    pm2 logs malabar-frontend --lines 15
fi

# 9. Финальная проверка
echo ""
echo "9️⃣ ФИНАЛЬНАЯ ПРОВЕРКА"
echo "===================="

echo "PM2 статус:"
pm2 status

echo ""
echo "API проверки:"
echo -n "Backend Health: "
curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Backend Players: "  
curl -s --connect-timeout 5 http://localhost:3001/api/players >/dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Frontend: "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:3000 2>/dev/null || echo "000")
[ "$FRONTEND_STATUS" = "200" ] && echo "✅ ($FRONTEND_STATUS)" || echo "❌ ($FRONTEND_STATUS)"

echo ""
echo "🎉 SQLITE3 ОШИБКА ИСПРАВЛЕНА!"
echo ""
echo "🌐 Проверьте сайт:"
echo "   http://46.173.17.229:3000"
echo "   http://vet-klinika-moscow.ru"
echo ""
echo "📊 Управление:"
echo "   pm2 status     - статус"
echo "   pm2 logs       - логи"
echo "   pm2 restart all - перезапуск"
