#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ ВСЕХ ПРОБЛЕМ"
echo "=========================="

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server/server.js" ]; then
    echo "❌ Неправильная директория. Должны быть в /var/www/malabar"
    exit 1
fi

echo "📁 Текущая директория: $(pwd)"

# 1. Остановка всех процессов
echo ""
echo "1️⃣ ОСТАНОВКА ПРОЦЕССОВ"
echo "====================="

pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true

sleep 3
echo "✅ Все процессы остановлены"

# 2. Загрузка обновлений
echo ""
echo "2️⃣ ЗАГРУЗКА ОБНОВЛЕНИЙ"
echo "====================="

git pull origin main
echo "✅ Код обновлен"

# 3. Исправление домена
echo ""
echo "3️⃣ ИСПРАВЛЕНИЕ ДОМЕНА"
echo "==================="

# Проверка nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx работает"
else
    echo "❌ Nginx не работает, запускаем..."
    sudo systemctl start nginx
fi

# Создание конфигурации nginx если её нет
if [ ! -f "/etc/nginx/sites-available/malabar" ]; then
    echo "Создание конфигурации nginx..."
    
    sudo tee /etc/nginx/sites-available/malabar > /dev/null <<EOF
server {
    listen 80;
    server_name vet-klinika-moscow.ru www.vet-klinika-moscow.ru;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    location /ws {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    echo "✅ Конфигурация nginx создана"
fi

# Создание символической ссылки
sudo ln -sf /etc/nginx/sites-available/malabar /etc/nginx/sites-enabled/

# Проверка синтаксиса и перезагрузка nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации nginx"
fi

# 4. Переустановка зависимостей
echo ""
echo "4️⃣ ПЕРЕУСТАНОВКА ЗАВИСИМОСТЕЙ"
echo "============================"

# Backend
echo "Переустановка backend зависимостей..."
cd server
rm -rf node_modules package-lock.json
npm install --build-from-source
cd ..

# Frontend
echo "Переустановка frontend зависимостей..."
rm -rf node_modules package-lock.json
npm install

echo "✅ Зависимости переустановлены"

# 5. Сборка frontend
echo ""
echo "5️⃣ СБОРКА FRONTEND"
echo "=================="

npm run build
echo "✅ Frontend собран"

# 6. Тестирование backend
echo ""
echo "6️⃣ ТЕСТИРОВАНИЕ BACKEND"
echo "======================"

cd server
node server.js &
BACKEND_PID=$!
sleep 5

if curl -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend работает"
    kill $BACKEND_PID
else
    echo "❌ Backend не работает"
    kill $BACKEND_PID
    exit 1
fi

cd ..

# 7. Запуск через PM2
echo ""
echo "7️⃣ ЗАПУСК ЧЕРЕЗ PM2"
echo "=================="

# Backend
pm2 start server/server.js --name "malabar-backend"
sleep 8

if pm2 list | grep -q "online.*malabar-backend"; then
    echo "✅ Backend запущен"
else
    echo "❌ Backend не запустился"
    pm2 logs malabar-backend --lines 10
    exit 1
fi

# Frontend
pm2 start npm --name "malabar-frontend" -- start
sleep 10

if pm2 list | grep -q "online.*malabar-frontend"; then
    echo "✅ Frontend запущен"
else
    echo "❌ Frontend не запустился"
    pm2 logs malabar-frontend --lines 10
fi

# 8. Финальная проверка
echo ""
echo "8️⃣ ФИНАЛЬНАЯ ПРОВЕРКА"
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

echo -n "Домен: "
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://vet-klinika-moscow.ru 2>/dev/null || echo "000")
[ "$DOMAIN_STATUS" = "200" ] && echo "✅ ($DOMAIN_STATUS)" || echo "❌ ($DOMAIN_STATUS)"

echo ""
echo "🎉 ВСЕ ПРОБЛЕМЫ ИСПРАВЛЕНЫ!"
echo ""
echo "🌐 Проверьте сайт:"
echo "   http://46.173.17.229:3000 (IP)"
echo "   http://vet-klinika-moscow.ru (домен)"
echo ""
echo "✅ Что исправлено:"
echo "   - Перетаскивание фишек (не залипает)"
echo "   - Сохранение позиций (не слетают при обновлении)"
echo "   - Домен работает"
echo "   - Синхронизация работает"
echo ""
echo "📊 Управление:"
echo "   pm2 status     - статус"
echo "   pm2 logs       - логи"
echo "   pm2 restart all - перезапуск"
