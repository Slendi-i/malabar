#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ И ПЕРЕЗАПУСК СЕРВЕРА"
echo "===================================="

# Останавливаем все процессы PM2
echo "🛑 Останавливаем PM2 процессы..."
pm2 stop all

# Удаляем все процессы из PM2
echo "🗑️ Очищаем PM2 процессы..."
pm2 delete all

# Создаем директорию логов
echo "📁 Создаем директорию логов..."
node create-logs-dir.js

# Устанавливаем зависимости фронтенда и собираем
echo "📦 Устанавливаем зависимости фронтенда..."
npm install --no-audit --no-fund
echo "🏗️ Сборка фронтенда (Next.js build)..."
npm run build || { echo "❌ Сборка фронтенда не удалась"; exit 1; }

# Переходим в server директорию и устанавливаем зависимости
echo "📦 Устанавливаем зависимости сервера..."
cd server
echo "🧹 Очищаем node_modules сервера (во избежание invalid ELF)..."
rm -rf node_modules
echo "📥 Устанавливаем зависимости заново..."
npm install
cd ..

# Чиним sqlite3 (пересборка под текущую платформу)
if [ -f "fix-sqlite3.sh" ]; then
  echo "🛠️ Пересобираем sqlite3 под VPS..."
  chmod +x fix-sqlite3.sh
  ./fix-sqlite3.sh || echo "⚠️ Пересборка sqlite3 завершилась с предупреждениями"
else
  echo "ℹ️ Скрипт fix-sqlite3.sh не найден, пропускаем пересборку"
fi

# Проверяем что файлы на месте
echo "📋 Проверяем файлы..."
echo "✓ server/server.js:" $([ -f "server/server.js" ] && echo "OK" || echo "ОТСУТСТВУЕТ")
echo "✓ ecosystem.config.js:" $([ -f "ecosystem.config.js" ] && echo "OK" || echo "ОТСУТСТВУЕТ")
echo "✓ server/package.json:" $([ -f "server/package.json" ] && echo "OK" || echo "ОТСУТСТВУЕТ")

# Запускаем ОБА приложения через PM2 (фронтенд + бэкенд)
echo "🚀 Запускаем фронтенд и бэкенд через PM2..."
pm2 start ecosystem.config.js

# Ждем немного
sleep 4

# Проверяем статус
echo "📊 Статус PM2:"
pm2 status | cat

echo ""
echo "📋 Логи сервера (последние 50 строк, без стрима):"
pm2 logs malabar-server --lines 50 --nostream | cat

echo ""
echo "🔍 Проверяем доступность API:"
curl -sS --max-time 5 http://localhost:3001/api/health || echo "API недоступен"

echo ""
echo "🌐 Проверяем доступность фронтенда:"
curl -sS --max-time 8 -I http://localhost:3000 | head -1 || echo "Фронтенд недоступен"

echo ""
echo "📊 Оба приложения должны быть online:"
pm2 status | grep -E "(malabar-server|malabar-frontend)" | cat

echo ""
echo "✅ Скрипт завершен. Проверьте статус выше."
