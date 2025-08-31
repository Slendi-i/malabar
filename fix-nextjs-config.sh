#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ NEXT.JS КОНФИГУРАЦИИ"
echo "==================================="

echo "1️⃣ Проверка текущей конфигурации..."
cd /var/www/malabar

if [ -f "next.config.js" ]; then
    echo "📋 Текущий next.config.js:"
    cat next.config.js
    echo ""
else
    echo "⚠️ next.config.js не найден"
fi

echo "2️⃣ Исправление конфигурации..."

# Создаем правильный next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Убираем output: export для dev/production сервера
  // output: 'export', // Эта строка вызывала ошибку
  
  // Настройки для работы с изображениями
  images: {
    unoptimized: true
  },
  
  // Настройки для WebSocket
  experimental: {
    allowMiddlewareResponseBody: true,
  }
}

module.exports = nextConfig
EOF

echo "✅ Новый next.config.js создан"

echo "3️⃣ Остановка frontend..."
pm2 stop malabar-frontend 2>/dev/null || echo "Frontend уже остановлен"

echo "4️⃣ Очистка кэша Next.js..."
rm -rf .next/
rm -rf out/

echo "5️⃣ Запуск frontend с новой конфигурацией..."
pm2 start npm --name "malabar-frontend" -- start

sleep 5

echo "6️⃣ Проверка статуса..."
pm2 status

echo ""
echo "7️⃣ Проверка логов frontend..."
pm2 logs malabar-frontend --lines 10 --nostream

echo ""
echo "8️⃣ Тест доступности..."
echo "Frontend локально:"
curl -s --connect-timeout 5 http://localhost:3000 > /dev/null && echo "✅ Frontend доступен" || echo "❌ Frontend недоступен"

echo "Backend локально:"
curl -s --connect-timeout 5 http://localhost:3001/api/health && echo "✅ Backend работает" || echo "❌ Backend недоступен"

echo ""
echo "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo ""
echo "🌐 Проверьте сайт:"
echo "http://46.173.17.229:3000"
echo "http://vet-klinika-moscow.ru"
