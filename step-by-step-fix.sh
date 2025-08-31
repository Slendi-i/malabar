#!/bin/bash

echo "🔧 ПОШАГОВОЕ ИСПРАВЛЕНИЕ"
echo "========================"

echo "ШАГ 1: Проверка что базовая система работает..."
echo "----------------------------------------------"

if ! pm2 list | grep -q "online"; then
    echo "❌ PM2 процессы не работают. Сначала запустите:"
    echo "./rollback-to-working.sh"
    exit 1
fi

echo "✅ Базовая система работает, начинаем исправления..."

echo ""
echo "ШАГ 2: Исправление плашки синхронизации..."
echo "-----------------------------------------"

# Делаем резервную копию
cp /var/www/malabar/pages/index.js /var/www/malabar/pages/index.js.backup

# Меняем top-4 left-4 на bottom-4 right-4 ТОЛЬКО для индикатора синхронизации
sed -i 's/absolute top-4 left-4 z-50/absolute bottom-4 right-4 z-50/g' /var/www/malabar/pages/index.js

echo "✅ Плашка синхронизации перемещена"

echo ""
echo "ШАГ 3: Перезапуск frontend для применения изменений..."
echo "----------------------------------------------------"
pm2 restart malabar-frontend

sleep 3
pm2 status

echo ""
echo "ШАГ 4: Тест плашки..."
echo "--------------------"
echo "Откройте http://46.173.17.229:3000"
echo "Плашка синхронизации должна быть внизу справа"
echo ""
echo "Если плашка НЕ внизу справа, выполните:"
echo "cp /var/www/malabar/pages/index.js.backup /var/www/malabar/pages/index.js"
echo "pm2 restart malabar-frontend"

echo ""
echo "ШАГ 5: Свободное перетаскивание (ТОЛЬКО если плашка работает)..."
echo "----------------------------------------------------------------"
read -p "Плашка синхронизации внизу справа? (y/n): " response

if [ "$response" = "y" ]; then
    echo "Применяем изменения перетаскивания..."
    
    # Резервная копия
    cp /var/www/malabar/components/PlayerIcons.js /var/www/malabar/components/PlayerIcons.js.backup
    
    # Здесь можно применить более простые изменения для перетаскивания
    echo "Перетаскивание будет исправлено в следующем коммите"
    
else
    echo "❌ Плашка не работает, останавливаемся"
    echo "Нужно сначала исправить базовую проблему"
fi

echo ""
echo "✅ ПОШАГОВОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО"
echo ""
echo "СТАТУС:"
pm2 status
echo ""
echo "ТЕСТЫ:"
echo "1. http://46.173.17.229:3000 - плашка внизу справа?"
echo "2. Можете войти как admin/admin?"
echo "3. Загружаются ли игроки?"
