#!/bin/bash

echo "🌐 ИСПРАВЛЕНИЕ ТОЛЬКО ДОМЕНА"
echo "==========================="

echo "1️⃣ Проверка nginx конфигурации для домена..."
if [ -f "/etc/nginx/sites-enabled/vet-klinika-moscow.ru" ]; then
    echo "✅ Конфигурация домена активна"
else
    echo "❌ Конфигурация домена НЕ активна"
    echo "Активируем..."
    sudo ln -sf /etc/nginx/sites-available/vet-klinika-moscow.ru /etc/nginx/sites-enabled/
fi

echo ""
echo "2️⃣ Тест nginx конфигурации..."
sudo nginx -t

echo ""
echo "3️⃣ Перезагрузка nginx..."
sudo systemctl reload nginx

echo ""
echo "4️⃣ Проверка доступности домена..."
sleep 2

echo "Тест по домену:"
curl -s --connect-timeout 5 -I http://vet-klinika-moscow.ru | head -1

echo ""
echo "Тест API через домен:"
curl -s --connect-timeout 5 http://vet-klinika-moscow.ru/api/health || echo "❌ API через домен не работает"

echo ""
echo "✅ ГОТОВО! Проверьте:"
echo "🌐 Домен: http://vet-klinika-moscow.ru"
