#!/bin/bash

# Быстрая автоматическая очистка VPS (только безопасные элементы)
# Удаляет только то, что точно можно восстановить без потери данных

echo "=== БЫСТРАЯ ОЧИСТКА VPS ==="
echo "Дата: $(date)"
echo

# Показываем место до очистки
echo "=== МЕСТО НА ДИСКЕ ДО ОЧИСТКИ ==="
df -h . | head -2
echo

echo "Выполняем автоматическую очистку безопасных элементов..."
echo

# Счетчик освобожденного места
TOTAL_FREED=0

# Функция для тихого удаления
quiet_remove() {
    local target="$1"
    local description="$2"
    
    if [ -e "$target" ]; then
        SIZE_BEFORE=$(du -s "$target" 2>/dev/null | cut -f1 || echo "0")
        rm -rf "$target" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ $description ($((SIZE_BEFORE/1024)) MB)"
            TOTAL_FREED=$((TOTAL_FREED + SIZE_BEFORE))
        fi
    fi
}

# 1. Очистка кэша и временных файлов
echo "=== ОЧИСТКА КЭША ==="
quiet_remove ".next" "Next.js build cache"
quiet_remove "out" "Static export files"

# NPM кэш
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null && echo "✓ npm cache"
fi

# 2. Очистка логов
echo
echo "=== ОЧИСТКА ЛОГОВ ==="
find . -name "*.log" -type f -delete 2>/dev/null && echo "✓ .log файлы"
find . -name "*.tmp" -type f -delete 2>/dev/null && echo "✓ .tmp файлы"

# PM2 логи
if command -v pm2 &> /dev/null; then
    pm2 flush 2>/dev/null && echo "✓ PM2 логи"
fi

# 3. Очистка системных временных файлов
echo
echo "=== ОЧИСТКА СИСТЕМНЫХ ФАЙЛОВ ==="
find . -name ".DS_Store" -type f -delete 2>/dev/null && echo "✓ .DS_Store файлы"
find . -name "Thumbs.db" -type f -delete 2>/dev/null && echo "✓ Thumbs.db файлы"
find . -name "*.swp" -type f -delete 2>/dev/null && echo "✓ Swap файлы"
find . -name "*~" -type f -delete 2>/dev/null && echo "✓ Backup файлы"

echo
echo "=== МЕСТО НА ДИСКЕ ПОСЛЕ ОЧИСТКИ ==="
df -h . | head -2

echo
TOTAL_FREED_MB=$((TOTAL_FREED/1024))
echo "Освобождено: ${TOTAL_FREED_MB} MB"

echo
echo "=== РЕКОМЕНДАЦИИ ==="
echo "Для полной очистки (включая node_modules и git): ./cleanup-vps-server.sh"
echo "Для анализа дискового пространства: ./check-disk-usage-vps.sh"
echo "Для резервного копирования: ./backup-important-files.sh"
echo
echo "Быстрая очистка завершена! ✨"
