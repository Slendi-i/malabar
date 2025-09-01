#!/bin/bash

echo "🌐 ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С ДОМЕНОМ"
echo "================================"

# Проверка текущей конфигурации nginx
echo "1️⃣ ПРОВЕРКА NGINX КОНФИГУРАЦИИ"
echo "=============================="

if [ -f "/etc/nginx/sites-available/malabar" ]; then
    echo "✅ Конфигурация malabar найдена"
    echo "Содержимое конфигурации:"
    cat /etc/nginx/sites-available/malabar
else
    echo "❌ Конфигурация malabar не найдена"
fi

echo ""
echo "2️⃣ ПРОВЕРКА СТАТУСА NGINX"
echo "========================="

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx работает"
else
    echo "❌ Nginx не работает"
    echo "Запуск nginx..."
    sudo systemctl start nginx
fi

echo ""
echo "3️⃣ ПРОВЕРКА СИМВОЛИЧЕСКОЙ ССЫЛКИ"
echo "==============================="

if [ -L "/etc/nginx/sites-enabled/malabar" ]; then
    echo "✅ Символическая ссылка существует"
    ls -la /etc/nginx/sites-enabled/malabar
else
    echo "❌ Символическая ссылка отсутствует"
    echo "Создание символической ссылки..."
    sudo ln -s /etc/nginx/sites-available/malabar /etc/nginx/sites-enabled/
fi

echo ""
echo "4️⃣ ПРОВЕРКА СИНТАКСИСА NGINX"
echo "============================"

if sudo nginx -t; then
    echo "✅ Синтаксис nginx корректен"
else
    echo "❌ Ошибка синтаксиса nginx"
    exit 1
fi

echo ""
echo "5️⃣ ПЕРЕЗАГРУЗКА NGINX"
echo "===================="

sudo systemctl reload nginx
echo "✅ Nginx перезагружен"

echo ""
echo "6️⃣ ПРОВЕРКА ДОСТУПНОСТИ"
echo "======================"

echo "Проверка домена vet-klinika-moscow.ru..."
if curl -s --connect-timeout 5 http://vet-klinika-moscow.ru >/dev/null 2>&1; then
    echo "✅ Домен доступен"
else
    echo "❌ Домен недоступен"
    echo "Проверка IP домена..."
    nslookup vet-klinika-moscow.ru
fi

echo ""
echo "7️⃣ ПРОВЕРКА ЛОГОВ NGINX"
echo "======================"

echo "Последние ошибки nginx:"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "8️⃣ СОЗДАНИЕ РЕЗЕРВНОЙ КОНФИГУРАЦИИ"
echo "================================="

# Создаем резервную конфигурацию если основной не работает
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

    echo "✅ Конфигурация создана"
    
    # Создаем символическую ссылку
    sudo ln -sf /etc/nginx/sites-available/malabar /etc/nginx/sites-enabled/
    
    # Проверяем синтаксис и перезагружаем
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ Nginx перезагружен с новой конфигурацией"
    else
        echo "❌ Ошибка в конфигурации nginx"
    fi
fi

echo ""
echo "🌐 РЕЗУЛЬТАТ:"
echo "Домен должен быть доступен по адресу:"
echo "http://vet-klinika-moscow.ru"
echo ""
echo "Если домен все еще не работает, проверьте:"
echo "1. DNS настройки домена"
echo "2. Файрвол: sudo ufw status"
echo "3. Логи nginx: sudo tail -f /var/log/nginx/error.log"
