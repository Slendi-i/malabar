#!/bin/bash
# Экстренная очистка VPS одной командой
echo "=== ЭКСТРЕННАЯ ОЧИСТКА VPS ==="
df -h . | head -2
echo "Освобождаем место..."
rm -rf node_modules server/node_modules .next out 2>/dev/null
npm cache clean --force 2>/dev/null
find . -name "*.log" -delete 2>/dev/null
find . -name "*.tmp" -delete 2>/dev/null
pm2 flush 2>/dev/null
echo "✓ Базовая очистка завершена"
df -h . | head -2
echo "Переустанавливаем зависимости..."
npm install --production && cd server && npm install --production && cd ..
echo "✓ Готово! Перезапустите приложение: pm2 restart all"
