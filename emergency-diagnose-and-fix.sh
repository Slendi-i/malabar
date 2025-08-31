#!/bin/bash

echo "🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА И ВОССТАНОВЛЕНИЕ"
echo "=========================================="

echo "1️⃣ ДИАГНОСТИКА ОШИБОК..."
echo "------------------------"

echo "📋 PM2 статус:"
pm2 status

echo ""
echo "📋 Логи backend (последние 20 строк):"
pm2 logs malabar-backend --lines 20 --nostream || echo "❌ Нет логов backend"

echo ""
echo "📋 Логи frontend (последние 20 строк):"
pm2 logs malabar-frontend --lines 20 --nostream || echo "❌ Нет логов frontend"

echo ""
echo "📋 Проверка файлов:"
echo "server.js существует:"
ls -la /var/www/malabar/server/server.js || echo "❌ server.js НЕ НАЙДЕН"

echo "package.json backend:"
ls -la /var/www/malabar/server/package.json || echo "❌ package.json backend НЕ НАЙДЕН"

echo "package.json frontend:"
ls -la /var/www/malabar/package.json || echo "❌ package.json frontend НЕ НАЙДЕН"

echo ""
echo "📋 Node.js версия:"
node --version || echo "❌ Node.js не установлен"

echo "npm версия:"
npm --version || echo "❌ npm не установлен"

echo ""
echo "2️⃣ ЭКСТРЕННАЯ ОСТАНОВКА..."
echo "-------------------------"
pm2 stop all
pm2 delete all
pm2 flush

echo ""
echo "3️⃣ ПРОВЕРКА ЗАВИСИМОСТЕЙ..."
echo "---------------------------"

echo "Backend зависимости:"
cd /var/www/malabar/server
if [ -f "package.json" ]; then
    echo "✅ package.json найден"
    if [ -d "node_modules" ]; then
        echo "⚠️ node_modules существует, переустанавливаем..."
        rm -rf node_modules
    fi
    npm install --production
else
    echo "❌ package.json не найден в server/"
fi

echo ""
echo "Frontend зависимости:"
cd /var/www/malabar
if [ -f "package.json" ]; then
    echo "✅ package.json найден"
    if [ -d "node_modules" ]; then
        echo "⚠️ node_modules существует, переустанавливаем..."
        rm -rf node_modules
    fi
    npm install --production
else
    echo "❌ package.json не найден в корне"
fi

echo ""
echo "4️⃣ ПРОВЕРКА БАЗЫ ДАННЫХ..."
echo "--------------------------"
cd /var/www/malabar/server
if [ -f "malabar.db" ]; then
    echo "✅ База данных существует"
    echo "Размер БД: $(du -h malabar.db)"
else
    echo "⚠️ База данных не найдена, будет создана автоматически"
fi

echo ""
echo "5️⃣ ПРОСТОЙ ТЕСТ BACKEND..."
echo "-------------------------"
cd /var/www/malabar/server
echo "Попытка запуска server.js напрямую (5 сек):"
timeout 5s node server.js || echo "❌ Backend не запускается"

echo ""
echo "6️⃣ ЭКСТРЕННЫЙ RESTART..."
echo "------------------------"

echo "Запуск backend..."
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend"

sleep 3

echo "Проверка backend после запуска:"
pm2 status

if pm2 list | grep -q "online.*malabar-backend"; then
    echo "✅ Backend запущен успешно"
    
    echo "Запуск frontend..."
    cd /var/www/malabar
    pm2 start npm --name "malabar-frontend" -- start
    
    sleep 3
    
    echo "Финальный статус:"
    pm2 status
    
else
    echo "❌ Backend не запустился, смотрим логи:"
    pm2 logs malabar-backend --lines 10
fi

echo ""
echo "7️⃣ ТЕСТ ДОСТУПНОСТИ..."
echo "----------------------"

echo "Тест локального backend:"
curl -s --connect-timeout 3 http://localhost:3001/api/health || echo "❌ Backend недоступен локально"

echo ""
echo "Тест локального frontend:"
curl -s --connect-timeout 3 http://localhost:3000 > /dev/null && echo "✅ Frontend доступен локально" || echo "❌ Frontend недоступен локально"

echo ""
echo "8️⃣ РЕЗЕРВНЫЙ ПЛАН..."
echo "--------------------"
echo "Если ничего не работает, выполните:"
echo "1. cd /var/www/malabar"
echo "2. git status"
echo "3. git log --oneline -5"
echo "4. node --version"
echo "5. npm --version"
echo ""
echo "Или откатите к последней рабочей версии:"
echo "git reset --hard HEAD~1"
echo "git clean -fd"
echo "./clean-pm2-and-restart.sh"

echo ""
echo "✅ ДИАГНОСТИКА ЗАВЕРШЕНА!"
