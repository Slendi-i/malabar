#!/bin/bash

# Проверка и исправление Nginx для доступа по IP

echo "🌐 ПРОВЕРКА И ИСПРАВЛЕНИЕ NGINX"
echo "==============================="

# 1. Проверка статуса nginx
echo "📊 Статус Nginx:"
systemctl status nginx --no-pager -l

# 2. Проверка текущих сайтов
echo ""
echo "📝 Текущие сайты в nginx:"
ls -la /etc/nginx/sites-enabled/

# 3. Проверка конфигурации
echo ""
echo "🔍 Тест конфигурации nginx:"
nginx -t

# 4. Проверка логов nginx
echo ""
echo "📋 Последние ошибки nginx:"
tail -10 /var/log/nginx/error.log | grep -v "notice"

# 5. Создание конфигурации для IP если её нет
if [ ! -f "/etc/nginx/sites-available/malabar-ip" ]; then
    echo ""
    echo "🔧 Создание конфигурации для IP доступа..."
    
    cat > /tmp/malabar-ip.conf << 'EOF'
server {
    listen 80;
    server_name 46.173.17.229;
    
    access_log /var/log/nginx/malabar-ip-access.log;
    error_log /var/log/nginx/malabar-ip-error.log;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }
    
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
EOF
    
    sudo cp /tmp/malabar-ip.conf /etc/nginx/sites-available/malabar-ip
    sudo ln -sf /etc/nginx/sites-available/malabar-ip /etc/nginx/sites-enabled/
    
    echo "✅ Конфигурация создана"
else
    echo "✅ Конфигурация malabar-ip уже существует"
fi

# 6. Проверка и перезагрузка nginx
echo ""
echo "🔄 Тестирование и перезагрузка nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен успешно"
else
    echo "❌ Ошибка в конфигурации nginx"
    sudo nginx -t 2>&1
fi

# 7. Проверка доступности
echo ""
echo "🔍 Проверка доступности после исправления..."

echo "1. Локальный frontend:"
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает"
fi

echo "2. Локальный backend:"
if curl -s --connect-timeout 5 http://localhost:3001/api/health > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает"
fi

echo "3. IP frontend через nginx:"
if curl -s --connect-timeout 10 http://46.173.17.229:3000 > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает - проверьте логи: sudo tail -f /var/log/nginx/malabar-ip-error.log"
fi

echo "4. IP backend через nginx:"
if curl -s --connect-timeout 10 http://46.173.17.229:3001/api/health > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает"
fi

echo ""
echo "📋 Логи для диагностики:"
echo "Nginx ошибки: sudo tail -f /var/log/nginx/malabar-ip-error.log"
echo "Backend логи: pm2 logs malabar-backend-temp"
echo "Frontend логи: pm2 logs malabar-frontend"
