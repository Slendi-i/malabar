#!/bin/bash

# Скрипт для безопасной очистки VPS сервера
# ВНИМАНИЕ: Перед запуском обязательно создайте резервную копию!

echo "=== ОЧИСТКА VPS СЕРВЕРА ==="
echo "Дата: $(date)"
echo

# Проверяем что резервная копия создана
echo "ВНИМАНИЕ! Этот скрипт удалит файлы, которые занимают место."
echo "Убедитесь что резервная копия создана (./backup-important-files.sh)"
echo
read -p "Вы создали резервную копию? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Сначала создайте резервную копию: ./backup-important-files.sh"
    exit 1
fi

echo
read -p "Продолжить очистку? Это действие необратимо! (y/N): " confirm2
if [[ $confirm2 != [yY] ]]; then
    echo "Очистка отменена."
    exit 1
fi

# Показываем место до очистки
echo
echo "=== МЕСТО НА ДИСКЕ ДО ОЧИСТКИ ==="
df -h . | head -2
echo

# Счетчик освобожденного места
TOTAL_FREED=0

# Функция для безопасного удаления
safe_remove() {
    local target="$1"
    local description="$2"
    
    if [ -e "$target" ]; then
        # Получаем размер до удаления
        SIZE_BEFORE=$(du -s "$target" 2>/dev/null | cut -f1 || echo "0")
        
        rm -rf "$target" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ Удалено: $description ($((SIZE_BEFORE/1024)) MB)"
            TOTAL_FREED=$((TOTAL_FREED + SIZE_BEFORE))
        else
            echo "✗ Ошибка удаления: $description"
        fi
    else
        echo "- Не найдено: $description"
    fi
}

echo "Начинаем очистку..."

# 1. Очистка node_modules (можно переустановить)
echo
echo "=== ОЧИСТКА NODE_MODULES ==="
safe_remove "node_modules" "node_modules (корень)"
safe_remove "server/node_modules" "server/node_modules"

# 2. Очистка build файлов Next.js (пересоберется автоматически)
echo
echo "=== ОЧИСТКА BUILD ФАЙЛОВ ==="
safe_remove ".next" "Next.js build cache"
safe_remove "out" "Static export files"

# 3. Очистка npm/yarn кэша
echo
echo "=== ОЧИСТКА NPM КЭША ==="
if command -v npm &> /dev/null; then
    echo "Очищаем npm cache..."
    npm cache clean --force 2>/dev/null && echo "✓ npm cache очищен" || echo "✗ Ошибка очистки npm cache"
fi

if command -v yarn &> /dev/null; then
    echo "Очищаем yarn cache..."
    yarn cache clean 2>/dev/null && echo "✓ yarn cache очищен" || echo "✗ Ошибка очистки yarn cache"
fi

# 4. Очистка git истории (осторожно!)
echo
echo "=== ОЧИСТКА GIT ИСТОРИИ ==="
read -p "Очистить git историю? Это удалит все старые коммиты! (y/N): " git_confirm
if [[ $git_confirm == [yY] ]]; then
    if [ -d ".git" ]; then
        # Создаем новый git репозиторий без истории
        echo "Создаем backup текущего git config..."
        cp .git/config git_config_backup 2>/dev/null
        
        # Получаем размер .git до удаления
        GIT_SIZE_BEFORE=$(du -s .git 2>/dev/null | cut -f1 || echo "0")
        
        # Удаляем .git и создаем новый
        rm -rf .git
        git init . 2>/dev/null
        
        # Восстанавливаем конфигурацию
        if [ -f "git_config_backup" ]; then
            cp git_config_backup .git/config 2>/dev/null
            rm git_config_backup
        fi
        
        # Добавляем все файлы в новый коммит
        git add . 2>/dev/null
        git commit -m "Clean repository after VPS cleanup" 2>/dev/null
        
        echo "✓ Git история очищена ($((GIT_SIZE_BEFORE/1024)) MB)"
        TOTAL_FREED=$((TOTAL_FREED + GIT_SIZE_BEFORE))
    else
        echo "- Git репозиторий не найден"
    fi
else
    echo "Git история сохранена"
fi

# 5. Очистка временных файлов
echo
echo "=== ОЧИСТКА ВРЕМЕННЫХ ФАЙЛОВ ==="
safe_remove "*.log" "Log файлы"
safe_remove "*.tmp" "Временные файлы"
safe_remove ".DS_Store" "macOS служебные файлы"
safe_remove "Thumbs.db" "Windows служебные файлы"

# Очистка файлов с определенными расширениями
find . -name "*.log" -type f -delete 2>/dev/null && echo "✓ Удалены .log файлы"
find . -name "*.tmp" -type f -delete 2>/dev/null && echo "✓ Удалены .tmp файлы"
find . -name ".DS_Store" -type f -delete 2>/dev/null && echo "✓ Удалены .DS_Store файлы"

# 6. Очистка PM2 логов (если есть)
echo
echo "=== ОЧИСТКА PM2 ЛОГОВ ==="
if command -v pm2 &> /dev/null; then
    pm2 flush 2>/dev/null && echo "✓ PM2 логи очищены" || echo "- PM2 логи не найдены"
fi

# 7. Переустановка зависимостей
echo
echo "=== ПЕРЕУСТАНОВКА ЗАВИСИМОСТЕЙ ==="
read -p "Переустановить зависимости сейчас? (рекомендуется) (y/N): " install_confirm
if [[ $install_confirm == [yY] ]]; then
    echo "Устанавливаем зависимости корневого проекта..."
    if command -v npm &> /dev/null; then
        npm install --production 2>/dev/null && echo "✓ Зависимости корня установлены"
    fi
    
    echo "Устанавливаем зависимости сервера..."
    if [ -f "server/package.json" ]; then
        cd server
        npm install --production 2>/dev/null && echo "✓ Зависимости сервера установлены"
        cd ..
    fi
else
    echo "ВАЖНО: Не забудьте установить зависимости позже:"
    echo "npm install && cd server && npm install"
fi

# Показываем результаты
echo
echo "=== ИТОГИ ОЧИСТКИ ==="
df -h . | head -2
echo

# Конвертируем в MB
TOTAL_FREED_MB=$((TOTAL_FREED/1024))
echo "Приблизительно освобождено: ${TOTAL_FREED_MB} MB"

echo
echo "=== ЧТО БЫЛО УДАЛЕНО ==="
echo "✓ node_modules (можно переустановить: npm install)"
echo "✓ .next и out (пересоберется автоматически)"
echo "✓ npm/yarn кэш"
echo "✓ Временные файлы и логи"
if [[ $git_confirm == [yY] ]]; then
    echo "✓ Git история (создан новый репозиторий)"
fi
echo

echo "=== ЧТО НЕ БЫЛО ЗАТРОНУТО ==="
echo "✓ Базы данных (.db файлы)"
echo "✓ Исходный код (pages, components, services)"
echo "✓ Конфигурационные файлы"
echo "✓ Статические файлы (public)"
echo "✓ Переменные окружения"
echo

echo "=== СЛЕДУЮЩИЕ ШАГИ ==="
echo "1. Проверьте что приложение работает"
echo "2. Если что-то не работает - восстановите из резервной копии"
echo "3. Повторите очистку через несколько месяцев"
echo

echo "Очистка завершена! 🎉"
