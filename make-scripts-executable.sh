#!/bin/bash

# Скрипт для установки прав исполнения на все созданные скрипты

echo "🔧 Установка прав исполнения на скрипты..."

# Список всех созданных скриптов
SCRIPTS=(
    "deploy-sync-fixes-vps.sh"
    "quick-restart-vps.sh"
    "diagnose-sync-issues-vps.sh"
    "fix-player-update-vps.sh"
    "setup-vps-environment.sh"
    "check-all-vps.sh"
    "test-sync-fixes.js"
    "fix-sync-issues.sh"
    "make-scripts-executable.sh"
)

echo "Делаем скрипты исполняемыми..."

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "✅ $script"
    else
        echo "⚠️ $script не найден"
    fi
done

echo ""
echo "🎉 Готово! Все скрипты имеют права исполнения."
echo ""
echo "📋 Основные команды для VPS:"
echo "  ./fix-player-update-vps.sh     - исправить проблему с обновлением игроков"
echo "  ./check-all-vps.sh             - полная проверка системы"
echo "  node test-sync-fixes.js        - запуск автоматических тестов"
echo ""
echo "📖 Подробная инструкция: VPS-DEPLOYMENT-GUIDE.md"
