#!/bin/bash

# Быстрая установка только зависимостей (без запуска сервисов)
# Используется когда нужно только восстановить node_modules

echo "📦 Быстрая установка зависимостей..."
echo "==================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[OK]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Директория /var/www/malabar не найдена!"
    exit 1
}

echo "📍 Текущая директория: $(pwd)"

echo ""
echo "🧹 1. Очистка остатков установки"
echo "==============================="

info "Удаляем поврежденные node_modules..."
rm -rf node_modules server/node_modules 2>/dev/null && log "Старые node_modules удалены"

info "Очищаем npm cache..."
npm cache clean --force 2>/dev/null && log "npm cache очищен"

info "Очищаем package-lock..."
rm -f package-lock.json server/package-lock.json 2>/dev/null && log "package-lock файлы удалены"

echo ""
echo "📦 2. Установка зависимостей фронтенда"
echo "======================================"

if [ -f "package.json" ]; then
    info "Запускаем npm install для фронтенда..."
    
    # Установка с таймаутом и без опциональных пакетов
    timeout 600 npm install --no-optional --no-audit --prefer-offline --progress=false 2>/dev/null
    INSTALL_RESULT=$?
    
    if [ $INSTALL_RESULT -eq 0 ]; then
        log "✅ Зависимости фронтенда установлены"
    elif [ $INSTALL_RESULT -eq 124 ]; then
        warn "⏰ Установка превысила таймаут (10 минут)"
        # Проверяем что хотя бы частично установилось
        if [ -d "node_modules" ] && [ "$(ls node_modules | wc -l)" -gt 10 ]; then
            log "📦 Частичная установка выполнена"
        else
            error "❌ Установка не завершена"
        fi
    else
        error "❌ Ошибка установки зависимостей фронтенда"
    fi
    
    # Проверяем результат
    if [ -d "node_modules" ]; then
        MODULES_COUNT=$(ls node_modules 2>/dev/null | wc -l)
        log "node_modules содержит $MODULES_COUNT модулей"
    else
        error "node_modules не создана!"
    fi
else
    error "package.json не найден!"
    exit 1
fi

echo ""
echo "📦 3. Установка зависимостей бэкенда"
echo "==================================="

if [ -f "server/package.json" ]; then
    info "Запускаем npm install для бэкенда..."
    
    cd server
    
    # Установка с таймаутом
    timeout 300 npm install --no-optional --no-audit --prefer-offline --progress=false 2>/dev/null
    INSTALL_RESULT=$?
    
    if [ $INSTALL_RESULT -eq 0 ]; then
        log "✅ Зависимости бэкенда установлены"
    elif [ $INSTALL_RESULT -eq 124 ]; then
        warn "⏰ Установка превысила таймаут (5 минут)"
        if [ -d "node_modules" ] && [ "$(ls node_modules | wc -l)" -gt 5 ]; then
            log "📦 Частичная установка выполнена"
        else
            error "❌ Установка не завершена"
        fi
    else
        error "❌ Ошибка установки зависимостей бэкенда"
    fi
    
    # Проверяем результат
    if [ -d "node_modules" ]; then
        MODULES_COUNT=$(ls node_modules 2>/dev/null | wc -l)
        log "server/node_modules содержит $MODULES_COUNT модулей"
    else
        error "server/node_modules не создана!"
    fi
    
    cd ..
else
    error "server/package.json не найден!"
fi

echo ""
echo "🔍 4. Проверка установки"
echo "======================="

# Проверяем ключевые модули
info "Проверяем ключевые модули фронтенда..."
FRONTEND_CRITICAL_MODULES=("react" "next" "@mui/material")
for module in "${FRONTEND_CRITICAL_MODULES[@]}"; do
    if [ -d "node_modules/$module" ]; then
        log "$module ✓"
    else
        error "$module отсутствует!"
    fi
done

info "Проверяем ключевые модули бэкенда..."
BACKEND_CRITICAL_MODULES=("express" "sqlite3" "ws" "cors")
for module in "${BACKEND_CRITICAL_MODULES[@]}"; do
    if [ -d "server/node_modules/$module" ]; then
        log "$module ✓"
    else
        error "$module отсутствует!"
    fi
done

echo ""
echo "📊 РЕЗУЛЬТАТ УСТАНОВКИ"
echo "====================="

FRONTEND_MODULES=$(ls node_modules 2>/dev/null | wc -l)
BACKEND_MODULES=$(ls server/node_modules 2>/dev/null | wc -l)

echo "📦 Установлено модулей:"
echo "  • Фронтенд: $FRONTEND_MODULES"
echo "  • Бэкенд: $BACKEND_MODULES"

# Размер установки
if command -v du > /dev/null; then
    FRONTEND_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "неизвестно")
    BACKEND_SIZE=$(du -sh server/node_modules 2>/dev/null | cut -f1 || echo "неизвестно")
    echo ""
    echo "💾 Размер установки:"
    echo "  • Фронтенд: $FRONTEND_SIZE"
    echo "  • Бэкенд: $BACKEND_SIZE"
fi

echo ""
echo "📊 Место на диске:"
df -h . | head -2

echo ""
if [ "$FRONTEND_MODULES" -gt 50 ] && [ "$BACKEND_MODULES" -gt 10 ]; then
    echo -e "${GREEN}✅ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!${NC}"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "  1. Запуск сервисов: ./restore-after-cleanup-vps.sh"
    echo "  2. Или только сборка: npm run build"
    echo "  3. Проверка: ./diagnose-after-cleanup-vps.sh"
elif [ "$FRONTEND_MODULES" -gt 10 ] || [ "$BACKEND_MODULES" -gt 5 ]; then
    echo -e "${YELLOW}⚠️ ЧАСТИЧНАЯ УСТАНОВКА${NC}"
    echo ""
    echo "🔧 Рекомендации:"
    echo "  1. Попробуйте еще раз: ./quick-install-deps-vps.sh"
    echo "  2. Или полное восстановление: ./emergency-restore-vps.sh"
    echo "  3. Проверьте место на диске: df -h"
else
    echo -e "${RED}❌ УСТАНОВКА НЕ УДАЛАСЬ${NC}"
    echo ""
    echo "🆘 Возможные причины:"
    echo "  • Недостаток места на диске"
    echo "  • Проблемы с интернет-соединением"
    echo "  • Поврежденные package.json файлы"
    echo ""
    echo "🔧 Попробуйте:"
    echo "  1. Проверить место: df -h"
    echo "  2. Экстренное восстановление: ./emergency-restore-vps.sh"
fi

echo ""
echo "💡 Полезные команды:"
echo "  • Проверка модулей: ls node_modules | wc -l"
echo "  • Размер: du -sh node_modules server/node_modules"
echo "  • Переустановка: rm -rf node_modules && npm install"
