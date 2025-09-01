#!/bin/bash

# Скрипт для активации всех скриптов очистки VPS

echo "=== НАСТРОЙКА СКРИПТОВ ОЧИСТКИ VPS ==="
echo

# Делаем все скрипты исполняемыми
echo "Делаем скрипты исполняемыми..."
chmod +x check-disk-usage-vps.sh
chmod +x backup-important-files.sh  
chmod +x quick-cleanup-vps.sh
chmod +x cleanup-vps-server.sh
chmod +x setup-cleanup-scripts.sh

echo "✓ Все скрипты готовы к использованию"
echo

echo "=== ДОСТУПНЫЕ КОМАНДЫ ==="
echo "📊 Анализ дискового пространства:"
echo "   ./check-disk-usage-vps.sh"
echo
echo "💾 Создание резервной копии:"
echo "   ./backup-important-files.sh"
echo
echo "⚡ Быстрая очистка (безопасно):"
echo "   ./quick-cleanup-vps.sh"
echo
echo "🧹 Полная очистка (с подтверждением):"
echo "   ./cleanup-vps-server.sh"
echo

echo "📚 Подробная документация: VPS-CLEANUP-GUIDE.md"
echo

echo "=== РЕКОМЕНДОВАННЫЙ ПОРЯДОК ==="
echo "1. ./check-disk-usage-vps.sh     # Посмотреть что занимает место"
echo "2. ./backup-important-files.sh   # Создать резервную копию"
echo "3. ./cleanup-vps-server.sh       # Полная очистка"
echo
echo "Для регулярного использования: ./quick-cleanup-vps.sh"
echo

echo "✅ Настройка завершена!"
