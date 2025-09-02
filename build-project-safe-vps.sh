#!/bin/bash

# Безопасная сборка проекта без зависаний

echo "🏗️ Безопасная сборка проекта..."
echo "==============================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

cd /var/www/malabar || { error "Директория не найдена!"; exit 1; }

echo ""
echo "🔍 1. Проверка готовности"
echo "========================="

# Проверяем зависимости
if [ ! -d "node_modules" ]; then
    error "node_modules не найдена!"
    echo "Сначала установите зависимости:"
    echo "  ./install-critical-deps-vps.sh"
    exit 1
fi

MODULES_COUNT=$(ls node_modules 2>/dev/null | wc -l)
if [ "$MODULES_COUNT" -lt 20 ]; then
    warn "Мало модулей ($MODULES_COUNT), сборка может не удаться"
    echo "Рекомендуется доустановить зависимости:"
    echo "  ./install-deps-safe-vps.sh"
else
    log "Зависимости готовы ($MODULES_COUNT модулей)"
fi

echo ""
echo "🧹 2. Очистка старой сборки"
echo "=========================="

if [ -d ".next" ]; then
    rm -rf .next
    log "Старая сборка удалена"
fi

if [ -d "out" ]; then
    rm -rf out
    log "Старый export удален"
fi

echo ""
echo "🏗️ 3. Запуск сборки"
echo "=================="

info "Начинаем сборку (максимум 3 минуты)..."

# Сборка с таймаутом и показом прогресса
timeout 180 npm run build &
BUILD_PID=$!

# Показываем прогресс
elapsed=0
while kill -0 $BUILD_PID 2>/dev/null; do
    sleep 10
    elapsed=$((elapsed + 10))
    echo "  ... сборка $elapsed сек"
    
    if [ $elapsed -ge 180 ]; then
        echo "  Превышен таймаут, останавливаем сборку..."
        kill $BUILD_PID 2>/dev/null
        break
    fi
done

wait $BUILD_PID 2>/dev/null
BUILD_RESULT=$?

echo ""
echo "📊 4. Результат сборки"
echo "====================="

if [ $BUILD_RESULT -eq 0 ] && [ -d ".next" ]; then
    log "✅ Сборка завершена успешно!"
    
    # Размер сборки
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "неизвестно")
    log "Размер сборки: $BUILD_SIZE"
    
    # Проверяем ключевые файлы
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "неизвестно")
        log "Build ID: $BUILD_ID"
    fi
    
elif [ $BUILD_RESULT -eq 124 ]; then
    warn "⏰ Сборка превысила таймаут (3 минуты)"
    
    if [ -d ".next" ]; then
        warn "Частичная сборка может быть доступна"
    else
        error "Сборка не создана"
    fi
    
else
    error "❌ Ошибка сборки (код: $BUILD_RESULT)"
    
    echo ""
    echo "🔍 Возможные причины:"
    echo "1. Недостаток зависимостей: ./install-deps-safe-vps.sh"
    echo "2. Недостаток памяти: free -h"
    echo "3. Ошибки в коде: проверьте логи выше"
fi

echo ""
echo "💾 Место на диске после сборки:"
df -h . | head -2

echo ""
if [ -d ".next" ]; then
    log "🎉 СБОРКА ГОТОВА!"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "1. Запуск фронтенда: ./start-frontend-simple-vps.sh"
    echo "2. Полная проверка: ./test-simple-vps.sh"
    echo ""
    echo "💡 Фронтенд будет работать в production режиме (быстрее)"
else
    warn "⚠️ СБОРКА НЕ ГОТОВА"
    echo ""
    echo "🔧 Варианты:"
    echo "1. Запуск в dev режиме: ./start-frontend-simple-vps.sh"
    echo "2. Доустановка зависимостей: ./install-deps-safe-vps.sh"
    echo "3. Повторная сборка: ./build-project-safe-vps.sh"
    echo ""
    echo "💡 Dev режим работает без сборки, но медленнее"
fi
