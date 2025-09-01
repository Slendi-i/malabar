#!/bin/bash

echo "🔍 ДИАГНОСТИКА СТАБИЛЬНОСТИ MALABAR"
echo "=================================="

# Проверка системы
echo "📋 СИСТЕМНАЯ ИНФОРМАЦИЯ:"
echo "Node.js: $(node --version 2>/dev/null || echo '❌ Не установлен')"
echo "npm: $(npm --version 2>/dev/null || echo '❌ Не установлен')"
echo "PM2: $(pm2 --version 2>/dev/null || echo '❌ Не установлен')"
echo ""

# Проверка портов
echo "📡 ПРОВЕРКА ПОРТОВ:"
echo "Порт 3000: $(lsof -ti:3000 >/dev/null && echo '🔴 Занят' || echo '🟢 Свободен')"
echo "Порт 3001: $(lsof -ti:3001 >/dev/null && echo '🔴 Занят' || echo '🟢 Свободен')"
echo ""

# Статус PM2
echo "🚀 PM2 СТАТУС:"
pm2 status 2>/dev/null || echo "❌ PM2 процессы не найдены"
echo ""

# Проверка файлов
echo "📁 ПРОВЕРКА ФАЙЛОВ:"
echo "server.js: $([ -f server/server.js ] && echo '✅ Найден' || echo '❌ Отсутствует')"
echo "package.json (root): $([ -f package.json ] && echo '✅ Найден' || echo '❌ Отсутствует')"
echo "package.json (server): $([ -f server/package.json ] && echo '✅ Найден' || echo '❌ Отсутствует')"
echo "next.config.js: $([ -f next.config.js ] && echo '✅ Найден' || echo '❌ Отсутствует')"
echo "ecosystem.config.js: $([ -f ecosystem.config.js ] && echo '✅ Найден' || echo '❌ Отсутствует')"
echo "База данных: $([ -f server/malabar.db ] && echo '✅ Найдена' || echo '⚠️ Будет создана')"
echo ""

# Проверка node_modules
echo "📦 ПРОВЕРКА ЗАВИСИМОСТЕЙ:"
echo "node_modules (root): $([ -d node_modules ] && echo '✅ Установлены' || echo '❌ Требуется npm install')"
echo "node_modules (server): $([ -d server/node_modules ] && echo '✅ Установлены' || echo '❌ Требуется npm install')"
echo ""

# Проверка логов
echo "📝 ЛОГИ:"
if [ -d logs ]; then
    echo "Папка logs: ✅ Существует"
    for log in backend-error.log backend-out.log frontend-error.log frontend-out.log; do
        if [ -f "logs/$log" ]; then
            size=$(du -h "logs/$log" | cut -f1)
            echo "  $log: ✅ ($size)"
        else
            echo "  $log: ⚪ Будет создан"
        fi
    done
else
    echo "Папка logs: ❌ Отсутствует (будет создана)"
fi
echo ""

# Тест доступности
echo "🌐 ТЕСТ ДОСТУПНОСТИ:"

# Backend health
BACKEND_HEALTH=$(curl -s --connect-timeout 3 http://localhost:3001/api/health 2>/dev/null || echo "failed")
if [[ $BACKEND_HEALTH == *"OK"* ]]; then
    echo "Backend Health: ✅ Работает"
else
    echo "Backend Health: ❌ Недоступен"
fi

# Backend players
PLAYERS_API=$(curl -s --connect-timeout 3 http://localhost:3001/api/players 2>/dev/null || echo "failed")
if [[ $PLAYERS_API == *"["* ]]; then
    echo "Players API: ✅ Работает"
else
    echo "Players API: ❌ Недоступен"
fi

# Frontend
FRONTEND_STATUS=$(curl -s --connect-timeout 3 -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "Frontend: ✅ Работает (код: $FRONTEND_STATUS)"
else
    echo "Frontend: ❌ Недоступен (код: $FRONTEND_STATUS)"
fi

echo ""

# Последние ошибки
echo "🚨 ПОСЛЕДНИЕ ОШИБКИ (если есть):"
if [ -f logs/backend-error.log ]; then
    echo "Backend errors (последние 5 строк):"
    tail -5 logs/backend-error.log 2>/dev/null || echo "  Нет ошибок"
else
    echo "Backend errors: Файл не найден"
fi

if [ -f logs/frontend-error.log ]; then
    echo "Frontend errors (последние 5 строк):"
    tail -5 logs/frontend-error.log 2>/dev/null || echo "  Нет ошибок"
else
    echo "Frontend errors: Файл не найден"
fi

echo ""

# Рекомендации
echo "💡 РЕКОМЕНДАЦИИ:"

# Проверка на конфликты
BACKEND_RUNNING=$(pm2 list 2>/dev/null | grep "malabar-backend" | grep -c "online" || echo "0")
FRONTEND_RUNNING=$(pm2 list 2>/dev/null | grep "malabar-frontend" | grep -c "online" || echo "0")

if [ "$BACKEND_RUNNING" = "0" ] && [ "$FRONTEND_RUNNING" = "0" ]; then
    echo "❌ Приложения не запущены. Запустите: ./stable-deploy.sh"
elif [ "$BACKEND_RUNNING" = "0" ]; then
    echo "❌ Backend не запущен. Запустите: pm2 start ecosystem.config.js --only malabar-backend"
elif [ "$FRONTEND_RUNNING" = "0" ]; then
    echo "❌ Frontend не запущен. Запустите: pm2 start ecosystem.config.js --only malabar-frontend"
else
    echo "✅ Оба приложения запущены"
fi

# Проверка зависимостей
if [ ! -d node_modules ] || [ ! -d server/node_modules ]; then
    echo "📦 Установите зависимости: npm install && cd server && npm install && cd .."
fi

# Проверка доступности
if [[ $BACKEND_HEALTH != *"OK"* ]] || [[ $PLAYERS_API != *"["* ]]; then
    echo "🔧 Backend не отвечает. Проверьте логи: pm2 logs malabar-backend"
fi

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "🔧 Frontend не отвечает. Проверьте логи: pm2 logs malabar-frontend"
fi

echo ""
echo "🔄 БЫСТРЫЕ КОМАНДЫ:"
echo "Полная перезагрузка: ./stable-deploy.sh"
echo "Просмотр логов: pm2 logs"
echo "Статус PM2: pm2 status"
echo "Перезапуск: pm2 restart all"
