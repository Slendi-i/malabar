#!/bin/bash

# Установка прав исполнения на все скрипты восстановления

echo "🔧 Установка прав исполнения на скрипты восстановления..."

# Все скрипты восстановления
RECOVERY_SCRIPTS=(
    "diagnose-after-cleanup-vps.sh"
    "restore-after-cleanup-vps.sh"
    "quick-install-deps-vps.sh"
    "emergency-restore-vps.sh"
    "test-after-restore-vps.sh"
    "make-recovery-scripts-executable.sh"
    "test-sync-fixes.js"
)

echo "Установка прав на скрипты восстановления..."

for script in "${RECOVERY_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "✅ $script"
    else
        echo "⚠️ $script не найден"
    fi
done

echo ""
echo "🎉 Все скрипты восстановления готовы к использованию!"
echo ""
echo "📋 БЫСТРЫЙ СТАРТ:"
echo "=================="
echo "1. Диагностика:      ./diagnose-after-cleanup-vps.sh"
echo "2. Восстановление:   ./restore-after-cleanup-vps.sh"
echo "3. Проверка:         ./test-after-restore-vps.sh"
echo ""
echo "🆘 Если стандартное восстановление не поможет:"
echo "  ./emergency-restore-vps.sh"
echo ""
echo "📖 Подробное руководство: VPS-RECOVERY-GUIDE.md"
echo ""
echo "⏱️ Примерное время восстановления: 10-30 минут"
