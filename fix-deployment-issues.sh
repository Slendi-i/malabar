#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМ РАЗВЕРТЫВАНИЯ"
echo "=================================="

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server/server.js" ]; then
    echo "❌ Неправильная директория. Должны быть в /var/www/malabar"
    exit 1
fi

echo "📁 Текущая директория: $(pwd)"

# 1. Проверка Node.js версии
echo "1️⃣ ПРОВЕРКА ОКРУЖЕНИЯ"
echo "===================="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'не установлен')"

# 2. Полная очистка процессов и портов
echo ""
echo "2️⃣ ПОЛНАЯ ОЧИСТКА"
echo "================="

echo "Остановка PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

echo "Очистка портов..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true

# Дополнительная очистка процессов Node.js
echo "Дополнительная очистка процессов..."
sudo pkill -f "node.*server.js" 2>/dev/null || true
sudo pkill -f "npm.*start" 2>/dev/null || true

sleep 5

# 3. Проверка портов
echo ""
echo "3️⃣ ПРОВЕРКА ПОРТОВ"
echo "=================="
PORT_3000=$(lsof -ti:3000 2>/dev/null | wc -l)
PORT_3001=$(lsof -ti:3001 2>/dev/null | wc -l)

echo "Порт 3000: $([ $PORT_3000 -eq 0 ] && echo '🟢 свободен' || echo '🔴 занят')"
echo "Порт 3001: $([ $PORT_3001 -eq 0 ] && echo '🟢 свободен' || echo '🔴 занят')"

if [ $PORT_3000 -ne 0 ] || [ $PORT_3001 -ne 0 ]; then
    echo "⚠️ Принудительная очистка портов..."
    sudo fuser -k 3000/tcp 2>/dev/null || true
    sudo fuser -k 3001/tcp 2>/dev/null || true
    sleep 3
fi

# 4. Быстрый тест backend
echo ""
echo "4️⃣ ТЕСТ BACKEND"
echo "==============="

cd server

echo "Запуск backend для тестирования..."
node server.js &
BACKEND_PID=$!

echo "PID backend: $BACKEND_PID"
sleep 6

echo "Проверка health endpoint..."
if curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend отвечает на health запросы"
    
    echo "Проверка players endpoint..."
    if curl -s --connect-timeout 5 http://localhost:3001/api/players >/dev/null 2>&1; then
        echo "✅ Backend отвечает на players запросы"
        BACKEND_OK=true
    else
        echo "❌ Backend не отвечает на players запросы"
        BACKEND_OK=false
    fi
else
    echo "❌ Backend не отвечает на health запросы"
    BACKEND_OK=false
fi

echo "Остановка тестового backend..."
kill $BACKEND_PID 2>/dev/null || true
sleep 3

cd ..

if [ "$BACKEND_OK" != "true" ]; then
    echo "❌ Backend не прошел тестирование"
    exit 1
fi

# 5. Пошаговый запуск PM2
echo ""
echo "5️⃣ ПОШАГОВЫЙ ЗАПУСК PM2"
echo "======================="

echo "Шаг 1: Запуск backend..."
pm2 start server/server.js --name "malabar-backend" --log-date-format "YYYY-MM-DD HH:mm:ss"

sleep 10

echo "Статус после запуска backend:"
pm2 status

# Проверка backend
BACKEND_ONLINE=$(pm2 list | grep "malabar-backend" | grep -c "online" || echo "0")
if [ "$BACKEND_ONLINE" = "1" ]; then
    echo "✅ Backend запущен через PM2"
    
    # Проверка что backend реально отвечает
    sleep 3
    if curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ Backend отвечает на запросы через PM2"
    else
        echo "❌ Backend не отвечает на запросы через PM2"
        pm2 logs malabar-backend --lines 10
    fi
else
    echo "❌ Backend не запустился через PM2"
    pm2 logs malabar-backend --lines 15
    echo "Попытка перезапуска..."
    pm2 restart malabar-backend
    sleep 8
    
    BACKEND_ONLINE=$(pm2 list | grep "malabar-backend" | grep -c "online" || echo "0")
    if [ "$BACKEND_ONLINE" = "1" ]; then
        echo "✅ Backend запущен после перезапуска"
    else
        echo "❌ Критическая ошибка backend"
        exit 1
    fi
fi

echo ""
echo "Шаг 2: Запуск frontend..."
pm2 start npm --name "malabar-frontend" --log-date-format "YYYY-MM-DD HH:mm:ss" -- start

sleep 12

echo "Статус после запуска frontend:"
pm2 status

# Проверка frontend
FRONTEND_ONLINE=$(pm2 list | grep "malabar-frontend" | grep -c "online" || echo "0")
if [ "$FRONTEND_ONLINE" = "1" ]; then
    echo "✅ Frontend запущен через PM2"
    
    # Проверка что frontend реально отвечает
    sleep 5
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 http://localhost:3000 2>/dev/null || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo "✅ Frontend отвечает на запросы (код: $FRONTEND_STATUS)"
    else
        echo "❌ Frontend не отвечает на запросы (код: $FRONTEND_STATUS)"
        pm2 logs malabar-frontend --lines 10
    fi
else
    echo "❌ Frontend не запустился через PM2"
    pm2 logs malabar-frontend --lines 15
fi

# 6. Финальная проверка
echo ""
echo "6️⃣ ФИНАЛЬНАЯ ПРОВЕРКА"
echo "===================="

echo "PM2 статус:"
pm2 status

echo ""
echo "API тесты:"
echo -n "Backend Health: "
curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Backend Players: "
curl -s --connect-timeout 5 http://localhost:3001/api/players >/dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Frontend: "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:3000 2>/dev/null || echo "000")
[ "$FRONTEND_STATUS" = "200" ] && echo "✅ ($FRONTEND_STATUS)" || echo "❌ ($FRONTEND_STATUS)"

echo ""
echo "🌐 ДОСТУПНОСТЬ:"
echo "Локально:     http://localhost:3000"
echo "По IP:        http://46.173.17.229:3000"
echo "По домену:    http://vet-klinika-moscow.ru"

echo ""
echo "📊 ЛОГИ:"
echo "Backend:  pm2 logs malabar-backend"
echo "Frontend: pm2 logs malabar-frontend"

echo ""
echo "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
