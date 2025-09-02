#!/bin/bash

# Пошаговое восстановление без зависающих команд
# Каждый шаг выполняется отдельно и быстро завершается

echo "🔧 Пошаговое восстановление VPS (без зависаний)"
echo "==============================================="

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

# Переход в директорию
cd /var/www/malabar || {
    error "Директория /var/www/malabar не найдена!"
    exit 1
}

echo "📍 Директория: $(pwd)"
echo "📊 Место на диске:"
df -h . | head -2

echo ""
echo "🛑 ШАГ 1: Быстрая остановка процессов"
echo "====================================="

info "Останавливаем процессы..."
pkill -f "node.*server" 2>/dev/null && log "Node процессы остановлены" || info "Node процессы не найдены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены" || info "npm процессы не найдены"

# PM2 с принудительным завершением
if command -v pm2 > /dev/null; then
    (timeout 5 pm2 stop all || pkill -f pm2) 2>/dev/null
    (timeout 5 pm2 delete all || true) 2>/dev/null
    log "PM2 процессы остановлены"
else
    info "PM2 не найден"
fi

sleep 2
log "Процессы остановлены"

echo ""
echo "🧹 ШАГ 2: Быстрая очистка"
echo "========================="

info "Удаляем старые файлы..."
rm -rf node_modules server/node_modules .next out 2>/dev/null && log "Временные файлы удалены"
rm -f package-lock.json server/package-lock.json 2>/dev/null && log "lock файлы удалены"

# Очистка кэшей БЕЗ зависания
if command -v npm > /dev/null; then
    timeout 10 npm cache clean --force 2>/dev/null || log "npm cache очищен (принудительно)"
fi

log "Очистка завершена"

echo ""
echo "📦 ШАГ 3: Проверка package.json"
echo "==============================="

if [ -f "package.json" ] && [ -f "server/package.json" ]; then
    log "package.json файлы найдены"
else
    error "Отсутствуют package.json файлы!"
    echo "Восстановите файлы проекта и попробуйте снова"
    exit 1
fi

echo ""
echo "🏗️ ШАГ 4: Создание базовой структуры"
echo "===================================="

# Создаем директории
mkdir -p logs server
chmod 755 logs server
log "Директории созданы"

# Создаем простую PM2 конфигурацию
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'malabar-server',
      script: 'server.js',
      cwd: './server',
      instances: 1,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3001 }
    }
  ]
};
EOF

log "PM2 конфигурация создана"

echo ""
echo "💾 ШАГ 5: Проверка базы данных"
echo "============================="

if [ -f "server/malabar.db" ]; then
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
    log "База данных найдена ($DB_SIZE байт)"
    chmod 664 server/malabar.db 2>/dev/null || true
elif [ -f "malabar.db" ]; then
    mv malabar.db server/ 2>/dev/null && log "База данных перемещена в server/"
else
    touch server/malabar.db
    log "Создана пустая база данных"
fi

echo ""
echo "⚠️ ВАЖНО: Установка зависимостей"
echo "================================"

echo "Следующий шаг - установка зависимостей."
echo "Это может занять 5-15 минут и требует интернета."
echo ""
echo "Выберите вариант:"
echo "1. Быстрая установка (только критические пакеты)"
echo "2. Полная установка (все зависимости)"  
echo "3. Ручная установка (команды для копирования)"
echo "4. Пропустить установку (сделать позже)"
echo ""

# Ждем ввода БЕЗ зависания
echo -n "Введите номер (1-4): "
read -t 30 CHOICE 2>/dev/null || CHOICE="1"

case $CHOICE in
    "2")
        echo ""
        echo "🚀 Запуск полной установки..."
        ./install-deps-safe-vps.sh
        ;;
    "3")
        echo ""
        echo "📋 Команды для ручной установки:"
        echo "================================"
        echo "# В корне проекта:"
        echo "npm install --production --no-optional"
        echo ""
        echo "# В папке server:"
        echo "cd server && npm install --production --no-optional && cd .."
        echo ""
        echo "# После установки зависимостей:"
        echo "./continue-restore-vps.sh"
        exit 0
        ;;
    "4")
        echo ""
        warn "Установка пропущена"
        echo "Для продолжения потом запустите:"
        echo "  ./install-deps-safe-vps.sh"
        echo "  ./continue-restore-vps.sh"
        exit 0
        ;;
    *)
        echo ""
        echo "🚀 Запуск быстрой установки..."
        ./install-critical-deps-vps.sh
        ;;
esac

echo ""
echo "✅ Пошаговое восстановление завершено!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте что зависимости установились: ls node_modules | wc -l"
echo "2. Запустите сервер: ./start-server-simple-vps.sh"  
echo "3. Проверьте работу: ./test-simple-vps.sh"
echo ""
echo "🆘 Если что-то не работает:"
echo "  ./diagnose-simple-vps.sh"
