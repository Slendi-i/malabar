#!/bin/bash

# 🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ СЕРВЕРА 🚨

echo "🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ MALABAR SERVER..."
echo "=============================================="

# 1. Полная остановка всех процессов
echo "🛑 Полная остановка всех процессов..."
pm2 stop all || true
pm2 delete all || true
pm2 kill || true

# 2. Освобождение портов принудительно
echo "🧹 Освобождение портов..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true

# Ждем освобождения портов
sleep 3

# 3. Проверка портов
echo "🔍 Проверка свободных портов..."
if netstat -tlnp | grep -q ":3000"; then
    echo "❌ Порт 3000 все еще занят"
    netstat -tlnp | grep ":3000"
else
    echo "✅ Порт 3000 свободен"
fi

if netstat -tlnp | grep -q ":3001"; then
    echo "❌ Порт 3001 все еще занят"
    netstat -tlnp | grep ":3001"
else
    echo "✅ Порт 3001 свободен"
fi

# 4. Переустановка зависимостей если нужно
echo "📦 Проверка зависимостей..."
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей фронтенда..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Установка зависимостей backend..."
    cd server
    npm install
    cd ..
fi

# 5. Быстрая проверка критических файлов
echo "📝 Проверка критических файлов..."
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ecosystem.config.js отсутствует!"
else
    echo "✅ ecosystem.config.js найден"
fi

if [ ! -f "server/server.js" ]; then
    echo "❌ server/server.js отсутствует!"
else
    echo "✅ server/server.js найден"
fi

# 6. Создание минимального ecosystem.config.js если отсутствует
if [ ! -f "ecosystem.config.js" ]; then
    echo "🔧 Создание базового ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'malabar-backend',
      script: './server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'malabar-frontend', 
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF
fi

# 7. Сборка фронтенда
echo "🔨 Сборка фронтенда..."
npm run build || echo "⚠️ Ошибка сборки, пропускаем..."

# 8. Запуск backend отдельно для проверки
echo "🚀 Пробный запуск backend..."
cd server
timeout 10 node server.js &
BACKEND_PID=$!
cd ..

sleep 5

# Проверка backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend запускается нормально"
    kill $BACKEND_PID 2>/dev/null || true
else
    echo "❌ Backend не отвечает"
    kill $BACKEND_PID 2>/dev/null || true
    echo "📋 Логи backend:"
    cd server
    timeout 5 node server.js 2>&1 | head -20
    cd ..
fi

# 9. Запуск через PM2
echo "🚀 Запуск через PM2..."
pm2 start ecosystem.config.js || {
    echo "❌ Ошибка запуска PM2, пробуем ручной запуск..."
    
    # Ручной запуск backend
    cd server
    pm2 start server.js --name malabar-backend
    cd ..
    
    # Ручной запуск frontend
    pm2 start npm --name malabar-frontend -- start
}

# 10. Ожидание и проверка
echo "⏳ Ожидание запуска (15 секунд)..."
sleep 15

# 11. Проверка статуса
echo "📊 Статус процессов:"
pm2 status

# 12. Проверка доступности
echo "🔍 Проверка доступности сервисов..."

echo "Backend (http://localhost:3001/api/health):"
if curl -s http://localhost:3001/api/health; then
    echo "✅ Backend работает!"
else
    echo "❌ Backend недоступен"
fi

echo ""
echo "Frontend (http://localhost:3000):"
if curl -s -I http://localhost:3000 | head -1 | grep -q "200\|301\|302"; then
    echo "✅ Frontend работает!"
else
    echo "❌ Frontend недоступен"
fi

# 13. Показать логи если есть проблемы
echo ""
echo "📋 Последние логи (если есть ошибки):"
pm2 logs --lines 5 --nostream

echo ""
echo "🌐 ПРОВЕРЬТЕ ДОСТУПНОСТЬ:"
echo "Frontend: http://46.173.17.229:3000"
echo "Backend:  http://46.173.17.229:3001"
echo ""
echo "📞 Если проблемы остаются:"
echo "pm2 logs - детальные логи"
echo "pm2 restart all - перезапуск"
echo "pm2 monit - мониторинг"
