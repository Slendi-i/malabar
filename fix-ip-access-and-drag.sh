#!/bin/bash

# Исправление доступа по IP и перетаскивания

echo "🔧 ИСПРАВЛЕНИЕ IP ДОСТУПА И ПЕРЕТАСКИВАНИЯ"
echo "=========================================="

# 1. ДИАГНОСТИКА NGINX ПРОБЛЕМЫ
echo "🔍 1. ДИАГНОСТИКА NGINX..."
echo "-------------------------"

# Проверка логов nginx для ошибки 500
echo "📋 Последние ошибки nginx (500 Internal Server Error):"
sudo tail -20 /var/log/nginx/error.log | grep -E "(error|500|upstream)" || echo "Нет ошибок в основном логе"

# Проверка специфичных логов для IP
if [ -f "/var/log/nginx/malabar-ip-error.log" ]; then
    echo "📋 Ошибки malabar-ip:"
    sudo tail -20 /var/log/nginx/malabar-ip-error.log
else
    echo "⚠️  Лог malabar-ip не найден"
fi

# 2. ИСПРАВЛЕНИЕ NGINX КОНФИГУРАЦИИ
echo ""
echo "🔧 2. ИСПРАВЛЕНИЕ NGINX КОНФИГУРАЦИИ..."
echo "--------------------------------------"

# Удаление старой конфигурации
sudo rm -f /etc/nginx/sites-enabled/malabar-ip
sudo rm -f /etc/nginx/sites-available/malabar-ip

# Создание новой ПРАВИЛЬНОЙ конфигурации
echo "📝 Создание новой конфигурации..."
sudo tee /etc/nginx/sites-available/malabar-ip > /dev/null << 'EOF'
server {
    listen 80;
    server_name 46.173.17.229;
    
    # Логирование
    access_log /var/log/nginx/malabar-ip-access.log;
    error_log /var/log/nginx/malabar-ip-error.log;
    
    # Основные настройки
    client_max_body_size 50M;
    
    # Frontend (основная локация)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Заголовки для Next.js
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Кэш
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Для статических файлов Next.js
        proxy_buffering off;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS заголовки
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Обработка OPTIONS запросов
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket специфичные настройки
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # Next.js статические файлы
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        
        # Кэширование статических файлов
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Активация конфигурации
sudo ln -sf /etc/nginx/sites-available/malabar-ip /etc/nginx/sites-enabled/

# Тест конфигурации
echo "🧪 Тестирование конфигурации nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация корректна"
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации:"
    sudo nginx -t 2>&1
    exit 1
fi

# 3. ПРОВЕРКА РАБОТОСПОСОБНОСТИ СЕРВЕРОВ
echo ""
echo "🔍 3. ПРОВЕРКА СЕРВЕРОВ..."
echo "-------------------------"

echo "📊 Статус PM2:"
pm2 status

echo ""
echo "🔍 Проверка портов:"
netstat -tlnp | grep -E ":(3000|3001)" || echo "⚠️  Порты не найдены"

echo ""
echo "🧪 Тест локальных серверов:"
echo "Frontend (3000):"
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null; then
    echo "   ✅ Frontend работает локально"
else
    echo "   ❌ Frontend не отвечает локально"
    echo "   Перезапуск frontend..."
    pm2 restart malabar-frontend
fi

echo "Backend (3001):"
if curl -s --connect-timeout 5 http://localhost:3001/api/health; then
    echo "   ✅ Backend работает локально"
else
    echo "   ❌ Backend не отвечает локально"
fi

# 4. ПРОВЕРКА IP ДОСТУПА
echo ""
echo "🌐 4. ПРОВЕРКА IP ДОСТУПА..."
echo "----------------------------"

# Ждем перезагрузки nginx
sleep 3

echo "Тест доступа по IP через nginx:"
if timeout 10 curl -s -I http://46.173.17.229:3000 | head -1 | grep -q "200\|301\|302"; then
    echo "✅ IP доступ работает!"
else
    echo "❌ IP доступ не работает"
    echo "📋 Последние ошибки nginx:"
    sudo tail -5 /var/log/nginx/malabar-ip-error.log 2>/dev/null || echo "Нет логов"
fi

echo ""
echo "Тест API по IP:"
if timeout 10 curl -s http://46.173.17.229:3001/api/health; then
    echo "✅ API по IP работает!"
else
    echo "❌ API по IP не работает"
fi

# 5. ИСПРАВЛЕНИЕ ПЕРЕТАСКИВАНИЯ
echo ""
echo "🖱️  5. ДИАГНОСТИКА ПЕРЕТАСКИВАНИЯ..."
echo "-----------------------------------"

# Проверка логов frontend на JavaScript ошибки
echo "📋 Проверка логов frontend:"
pm2 logs malabar-frontend --lines 10 --nostream | grep -i error || echo "Нет ошибок в логах"

echo ""
echo "🔧 Перезапуск frontend для обновления кода..."
pm2 restart malabar-frontend

# 6. ФИНАЛЬНАЯ ПРОВЕРКА
echo ""
echo "🏁 6. ФИНАЛЬНАЯ ПРОВЕРКА..."
echo "--------------------------"

sleep 5

echo "📊 Итоговый статус PM2:"
pm2 status

echo ""
echo "🌐 Итоговая проверка доступности:"
echo "1. Домен: http://vet-klinika-moscow.ru"
echo "2. IP: http://46.173.17.229:3000"
echo "3. API: http://46.173.17.229:3001/api/health"

echo ""
echo "🧪 Быстрые тесты:"
for url in "http://vet-klinika-moscow.ru" "http://46.173.17.229:3000" "http://46.173.17.229:3001/api/health"; do
    if timeout 10 curl -s "$url" > /dev/null; then
        echo "✅ $url - работает"
    else
        echo "❌ $url - не работает"
    fi
done

echo ""
echo "📋 ЛОГИ ДЛЯ ДАЛЬНЕЙШЕЙ ДИАГНОСТИКИ:"
echo "Nginx ошибки: sudo tail -f /var/log/nginx/malabar-ip-error.log"
echo "Frontend логи: pm2 logs malabar-frontend"
echo "Backend логи: pm2 logs malabar-backend-temp"

echo ""
echo "✅ ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ!"
echo ""
echo "🖱️  Для тестирования перетаскивания:"
echo "1. Откройте http://46.173.17.229:3000 (или домен)"
echo "2. Попробуйте перетащить круглые аватары игроков"
echo "3. Проверьте консоль браузера на JavaScript ошибки (F12 → Console)"
