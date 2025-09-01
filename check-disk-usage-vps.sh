#!/bin/bash

# Скрипт для проверки использования дискового пространства на VPS
# Показывает какие папки и файлы занимают больше всего места

echo "=== АНАЛИЗ ИСПОЛЬЗОВАНИЯ ДИСКОВОГО ПРОСТРАНСТВА ===" 
echo "Дата: $(date)"
echo

# Общее использование диска
echo "=== ОБЩЕЕ ИСПОЛЬЗОВАНИЕ ДИСКА ==="
df -h
echo

# Размеры основных папок проекта
echo "=== РАЗМЕРЫ ПАПОК В ПРОЕКТЕ ==="
echo "Проверяем основные папки..."

# Проверяем размер node_modules в корне
if [ -d "node_modules" ]; then
    echo "node_modules (корень): $(du -sh node_modules 2>/dev/null | cut -f1)"
fi

# Проверяем размер node_modules в server
if [ -d "server/node_modules" ]; then
    echo "server/node_modules: $(du -sh server/node_modules 2>/dev/null | cut -f1)"
fi

# Проверяем размер .git папки
if [ -d ".git" ]; then
    echo ".git репозиторий: $(du -sh .git 2>/dev/null | cut -f1)"
fi

# Проверяем размер out папки (build files)
if [ -d "out" ]; then
    echo "out (build files): $(du -sh out 2>/dev/null | cut -f1)"
fi

# Проверяем размер .next папки
if [ -d ".next" ]; then
    echo ".next (build cache): $(du -sh .next 2>/dev/null | cut -f1)"
fi

echo

# Топ 10 самых больших файлов в проекте
echo "=== ТОП 10 САМЫХ БОЛЬШИХ ФАЙЛОВ ==="
find . -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10
echo

# Топ 10 самых больших папок
echo "=== ТОП 10 САМЫХ БОЛЬШИХ ПАПОК ==="
du -h --max-depth=3 . 2>/dev/null | sort -rh | head -10
echo

# Проверяем кэш npm
echo "=== РАЗМЕР NPM КЭША ==="
if command -v npm &> /dev/null; then
    echo "npm cache размер: $(npm cache verify 2>/dev/null | grep 'Cache size' || echo 'Не удалось определить')"
fi
echo

# Системные логи (если есть доступ)
echo "=== СИСТЕМНЫЕ ЛОГИ ==="
if [ -d "/var/log" ]; then
    echo "Размер /var/log: $(du -sh /var/log 2>/dev/null | cut -f1 || echo 'Нет доступа')"
fi

# PM2 логи
if command -v pm2 &> /dev/null; then
    echo "PM2 логи: $(du -sh ~/.pm2/logs 2>/dev/null | cut -f1 || echo 'Логи не найдены')"
fi
echo

# Рекомендации по очистке
echo "=== РЕКОМЕНДАЦИИ ПО ОЧИСТКЕ ==="
echo "1. Если node_modules занимает много места - можно переустановить зависимости"
echo "2. Если .git папка большая - можно очистить историю коммитов"
echo "3. Если out/.next большие - можно очистить build кэш"
echo "4. Проверьте npm кэш и PM2 логи"
echo

echo "Для очистки используйте скрипт: ./cleanup-vps-server.sh"
echo "Для резервного копирования: ./backup-important-files.sh"
