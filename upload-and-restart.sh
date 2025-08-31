#!/bin/bash

# Скрипт для загрузки исправлений на VPS и перезапуска

echo "📁 ЗАГРУЗКА ИСПРАВЛЕНИЙ НА VPS"
echo "=============================="

# Здесь нужно будет запушить изменения в Git и потом на VPS выполнить:

echo "1️⃣ На локальной машине выполните:"
echo "git add ."
echo "git commit -m \"Fix drag-and-drop and sync for all user types\""
echo "git push origin main"
echo ""
echo "2️⃣ На VPS сервере выполните:"
echo "cd /var/www/malabar"
echo "git pull origin main"
echo "chmod +x fix-drag-and-sync-final.sh"
echo "./fix-drag-and-sync-final.sh"
echo ""
echo "✅ ИСПРАВЛЕНИЯ ГОТОВЫ К ЗАГРУЗКЕ!"
