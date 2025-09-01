#!/bin/bash

# Скрипт для резервного копирования важных файлов перед очисткой VPS
# Создает бэкап всех критически важных файлов

echo "=== СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ ВАЖНЫХ ФАЙЛОВ ==="
echo "Дата: $(date)"
echo

# Создаем папку для бэкапа с временной меткой
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Создана папка для бэкапа: $BACKUP_DIR"
echo

# Функция для безопасного копирования
safe_copy() {
    local source="$1"
    local dest="$2"
    
    if [ -e "$source" ]; then
        cp -r "$source" "$dest" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ Скопировано: $source"
        else
            echo "✗ Ошибка копирования: $source"
        fi
    else
        echo "- Не найден: $source"
    fi
}

echo "Копируем важные файлы..."

# 1. Базы данных
echo
echo "=== БАЗЫ ДАННЫХ ==="
safe_copy "malabar.db" "$BACKUP_DIR/"
safe_copy "server/malabar.db" "$BACKUP_DIR/"

# 2. Конфигурационные файлы
echo
echo "=== КОНФИГУРАЦИОННЫЕ ФАЙЛЫ ==="
safe_copy "package.json" "$BACKUP_DIR/"
safe_copy "package-lock.json" "$BACKUP_DIR/"
safe_copy "server/package.json" "$BACKUP_DIR/server_package.json"
safe_copy "server/package-lock.json" "$BACKUP_DIR/server_package-lock.json"
safe_copy "next.config.js" "$BACKUP_DIR/"
safe_copy "tailwind.config.js" "$BACKUP_DIR/"
safe_copy "tsconfig.json" "$BACKUP_DIR/"
safe_copy "ecosystem.config.js" "$BACKUP_DIR/"

# 3. Переменные окружения и настройки
echo
echo "=== ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ==="
safe_copy ".env" "$BACKUP_DIR/"
safe_copy ".env.local" "$BACKUP_DIR/"
safe_copy ".env.production" "$BACKUP_DIR/"

# 4. Важные скрипты
echo
echo "=== ВАЖНЫЕ СКРИПТЫ ==="
safe_copy "deploy.sh" "$BACKUP_DIR/"
safe_copy "ecosystem.config.js" "$BACKUP_DIR/"

# 5. Исходный код проекта (основные файлы)
echo
echo "=== ИСХОДНЫЙ КОД ==="
safe_copy "pages" "$BACKUP_DIR/"
safe_copy "components" "$BACKUP_DIR/"
safe_copy "services" "$BACKUP_DIR/"
safe_copy "styles" "$BACKUP_DIR/"
safe_copy "public" "$BACKUP_DIR/"
safe_copy "config" "$BACKUP_DIR/"
safe_copy "server/server.js" "$BACKUP_DIR/"

# 6. Git конфигурация (только важные файлы)
echo
echo "=== GIT КОНФИГУРАЦИЯ ==="
safe_copy ".gitignore" "$BACKUP_DIR/"
if [ -f ".git/config" ]; then
    cp ".git/config" "$BACKUP_DIR/git_config" 2>/dev/null
    echo "✓ Скопирована git конфигурация"
fi

# 7. Создаем архив бэкапа
echo
echo "=== СОЗДАНИЕ АРХИВА ==="
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Создан архив: ${BACKUP_DIR}.tar.gz"
    # Удаляем временную папку, оставляем только архив
    rm -rf "$BACKUP_DIR"
    echo "✓ Временная папка удалена"
else
    echo "✗ Ошибка создания архива"
fi

echo
echo "=== ИТОГИ РЕЗЕРВНОГО КОПИРОВАНИЯ ==="
if [ -f "${BACKUP_DIR}.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}.tar.gz" | cut -f1)
    echo "✓ Резервная копия создана: ${BACKUP_DIR}.tar.gz (размер: $BACKUP_SIZE)"
    echo
    echo "Для восстановления файлов используйте:"
    echo "tar -xzf ${BACKUP_DIR}.tar.gz"
    echo
    echo "ВАЖНО: Сохраните этот архив в безопасном месте!"
else
    echo "✗ Резервная копия НЕ создана!"
    exit 1
fi

echo
echo "=== РЕКОМЕНДАЦИИ ==="
echo "1. Скачайте архив ${BACKUP_DIR}.tar.gz на локальный компьютер"
echo "2. Только после этого запускайте скрипт очистки"
echo "3. Проверьте что все важные файлы в архиве"
echo
echo "Готово! Можно приступать к очистке сервера."
