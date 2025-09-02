#!/bin/bash

# Установка прав исполнения на простые скрипты восстановления

echo "🔧 Установка прав на простые скрипты восстановления..."

# Все простые скрипты
SIMPLE_SCRIPTS=(
    "step-by-step-restore-vps.sh"
    "install-critical-deps-vps.sh"
    "install-deps-safe-vps.sh"
    "start-server-simple-vps.sh"
    "start-frontend-simple-vps.sh"
    "test-simple-vps.sh"
    "diagnose-simple-vps.sh"
    "make-simple-scripts-executable.sh"
    "test-sync-fixes.js"
)

echo "Установка прав исполнения..."

for script in "${SIMPLE_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "✅ $script"
    else
        echo "⚠️ $script не найден"
    fi
done

echo ""
echo "🎉 Простые скрипты готовы к использованию!"
echo ""
echo "🚀 БЫСТРЫЙ СТАРТ (без зависаний):"
echo "================================="
echo "1. Восстановление:  ./step-by-step-restore-vps.sh"
echo "2. Проверка:        ./test-simple-vps.sh"
echo ""
echo "🔧 Дополнительные команды:"
echo "  • Диагностика:     ./diagnose-simple-vps.sh"
echo "  • Зависимости:     ./install-critical-deps-vps.sh"
echo "  • Запуск API:      ./start-server-simple-vps.sh"
echo "  • Запуск фронтенд: ./start-frontend-simple-vps.sh"
echo ""
echo "📖 Руководство: SIMPLE-RECOVERY-GUIDE.md"
echo ""
echo "💡 Все скрипты НЕ зависают и быстро завершаются!"
