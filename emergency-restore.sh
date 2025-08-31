#!/bin/bash

echo "🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ САЙТА"
echo "=================================="

echo "1️⃣ Проверка статуса PM2..."
pm2 status

echo ""
echo "2️⃣ Проверка портов..."
echo "Порт 3000 (frontend):"
netstat -tlnp | grep :3000 || echo "❌ Порт 3000 НЕ ЗАНЯТ"

echo "Порт 3001 (backend):"
netstat -tlnp | grep :3001 || echo "❌ Порт 3001 НЕ ЗАНЯТ"

echo ""
echo "3️⃣ Быстрый тест локально..."
echo "Backend test:"
curl -s --connect-timeout 3 http://localhost:3001/api/health || echo "❌ Backend не отвечает"

echo "Frontend test:"
curl -s --connect-timeout 3 http://localhost:3000 > /dev/null && echo "✅ Frontend работает" || echo "❌ Frontend не работает"

echo ""
echo "4️⃣ Проверка логов frontend..."
echo "=== FRONTEND ERROR LOGS ==="
pm2 logs malabar-frontend --lines 10 --nostream --err 2>/dev/null || echo "Нет error логов"

echo ""
echo "=== FRONTEND OUT LOGS ==="
pm2 logs malabar-frontend --lines 10 --nostream --out 2>/dev/null || echo "Нет out логов"

echo ""
echo "5️⃣ ЭКСТРЕННАЯ ПЕРЕЗАГРУЗКА..."
echo "=============================="

# Останавливаем всё
pm2 stop all
pm2 delete all

# Откатываем next.config.js к простой версии
cd /var/www/malabar
echo "Создаем минимальный next.config.js..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: false
}

module.exports = nextConfig
EOF

# Очищаем кэш
rm -rf .next/
rm -rf out/

echo ""
echo "6️⃣ Запуск в dev режиме для диагностики..."
echo "========================================="

# Сначала backend
cd /var/www/malabar/server
pm2 start server.js --name "malabar-backend"

sleep 3

# Потом frontend в dev режиме
cd /var/www/malabar
pm2 start "npm run dev" --name "malabar-frontend-dev"

sleep 5

echo ""
echo "7️⃣ Проверка после экстренного восстановления..."
pm2 status

echo ""
echo "Тест портов после восстановления:"
netstat -tlnp | grep -E ":(3000|3001)" || echo "❌ Порты всё еще не заняты"

echo ""
echo "Тест доступности:"
curl -s --connect-timeout 5 http://localhost:3001/api/health && echo "✅ Backend восстановлен" || echo "❌ Backend всё еще не работает"
curl -s --connect-timeout 5 http://localhost:3000 > /dev/null && echo "✅ Frontend восстановлен" || echo "❌ Frontend всё еще не работает"

echo ""
echo "8️⃣ Тест через Nginx..."
echo "====================="
echo "Тест по IP:"
curl -s --connect-timeout 5 -I http://46.173.17.229:3000 | head -1 || echo "❌ IP недоступен"

echo "Тест по домену:"
curl -s --connect-timeout 5 -I http://vet-klinika-moscow.ru | head -1 || echo "❌ Домен недоступен"

echo ""
echo "9️⃣ ДИАГНОСТИКА NGINX..."
echo "======================="
echo "Nginx статус:"
systemctl status nginx --no-pager || echo "❌ Nginx не работает"

echo ""
echo "Nginx конфигурация test:"
nginx -t || echo "❌ Ошибка в конфигурации Nginx"

echo ""
echo "🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА:"
echo "========================"
echo "PM2:"
pm2 status

echo ""
echo "Процессы Node.js:"
ps aux | grep node | grep -v grep || echo "❌ Нет процессов Node.js"

echo ""
echo "✅ ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО"
echo ""
echo "🌐 ПРОВЕРЬТЕ САЙТ:"
echo "http://46.173.17.229:3000"
echo "http://vet-klinika-moscow.ru"
echo ""
echo "📋 Если всё еще не работает:"
echo "1. Перезапустите Nginx: systemctl restart nginx"
echo "2. Проверьте firewall: ufw status"
echo "3. Откатитесь к рабочей версии: ./rollback-to-working.sh"
