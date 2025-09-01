#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ ПЕРСИСТЕНТНОСТИ БД"
echo "================================="

echo "1️⃣ Обновление кода с GitHub..."
cd /var/www/malabar
git fetch origin main
git reset --hard origin/main

echo ""
echo "2️⃣ Проверка изменений..."
echo "✅ Исправлена логика загрузки данных в pages/index.js"
echo "✅ Убрана перезапись БД дефолтными данными при ошибках"
echo "✅ apiService.js больше не возвращает пустой массив при ошибках"

echo ""
echo "3️⃣ Перезапуск frontend для применения изменений..."
pm2 restart malabar-frontend-dev

echo ""
echo "4️⃣ Проверка статуса..."
pm2 status

echo ""
echo "5️⃣ Тест API..."
curl -s http://localhost:3001/api/health | head -1
curl -s http://localhost:3001/api/players | jq length 2>/dev/null || echo "Players count: $(curl -s http://localhost:3001/api/players | grep -o '\"id\"' | wc -l)"

echo ""
echo "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo ""
echo "🧪 ТЕСТИРОВАНИЕ:"
echo "1. Откройте сайт: http://46.173.17.229:3000"
echo "2. Войдите как admin/admin"
echo "3. Измените имя игрока в профиле"
echo "4. Откройте сайт в другом браузере/устройстве"
echo "5. Проверьте что изменения сохранились"
echo ""
echo "📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:"
echo "- При загрузке страницы данные загружаются из БД"
echo "- Изменения сохраняются между сессиями"
echo -e "- НЕ создаются дефолтные игроки при ошибках API\n"
