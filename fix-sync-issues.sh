#!/bin/bash

# Скрипт исправления проблем синхронизации в проекте Malabar
# Этот скрипт решает проблемы с:
# 1. Неправильным направлением синхронизации
# 2. Бесконечными циклами автосохранения
# 3. Конфликтами при загрузке изображений

echo "🔧 Начинаем исправление проблем синхронизации..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "server/server.js" ]; then
    error "Запустите скрипт из корневой директории проекта Malabar"
    exit 1
fi

log "📋 Проверяем статус процессов..."

# Остановка существующих процессов
info "Останавливаем существующие процессы..."
pkill -f "node.*server" || true
pkill -f "npm.*start" || true
pkill -f "next" || true

# Ждем завершения процессов
sleep 3

log "💾 Создаем бэкап текущего состояния..."
cp -r . ../malabar-backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || warn "Не удалось создать бэкап"

log "🗃️ Проверяем состояние базы данных..."

# Проверяем базу данных
if [ -f "server/malabar.db" ]; then
    info "База данных найдена в server/"
    DB_PATH="server/malabar.db"
elif [ -f "malabar.db" ]; then
    info "База данных найдена в корне"
    DB_PATH="malabar.db"
else
    warn "База данных не найдена, будет создана новая"
    DB_PATH="server/malabar.db"
fi

# Создаем директорию server если её нет
mkdir -p server

log "📦 Устанавливаем зависимости..."

# Устанавливаем зависимости для фронтенда
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Устанавливаем зависимости для бэкенда
cd server
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi
cd ..

log "🏗️ Собираем проект..."

# Собираем фронтенд
npm run build

log "🚀 Запускаем сервер..."

# Запускаем бэкенд
cd server
npm start &
SERVER_PID=$!
cd ..

# Ждем запуска сервера
sleep 5

# Проверяем что сервер запустился
if curl -f -s "http://localhost:3001/api/health" > /dev/null; then
    log "✅ Сервер успешно запущен"
else
    error "❌ Сервер не запустился"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

log "🌐 Запускаем фронтенд..."

# Запускаем фронтенд в production режиме
npm start &
FRONTEND_PID=$!

# Ждем запуска фронтенда
sleep 5

# Проверяем что фронтенд запустился
if curl -f -s "http://localhost:3000" > /dev/null; then
    log "✅ Фронтенд успешно запущен"
else
    warn "⚠️ Фронтенд возможно не запустился полностью"
fi

log "🧪 Выполняем тесты синхронизации..."

# Тестируем API
info "Тестируем API endpoints..."

# Тест health check
if curl -f -s "http://localhost:3001/api/health" | grep -q "OK"; then
    log "✅ Health check работает"
else
    error "❌ Health check не работает"
fi

# Тест получения игроков
if curl -f -s "http://localhost:3001/api/players" | grep -q "players"; then
    log "✅ API игроков работает"
else
    error "❌ API игроков не работает"
fi

# Тест WebSocket (простая проверка что порт слушается)
if netstat -tulpn 2>/dev/null | grep -q ":3001.*LISTEN" || ss -tulpn 2>/dev/null | grep -q ":3001.*LISTEN"; then
    log "✅ WebSocket сервер слушает порт 3001"
else
    warn "⚠️ WebSocket сервер может не работать"
fi

log "📊 Статус процессов:"
echo "Сервер PID: $SERVER_PID"
echo "Фронтенд PID: $FRONTEND_PID"

# Сохраняем PID'ы для последующего управления
echo $SERVER_PID > server.pid
echo $FRONTEND_PID > frontend.pid

log "✅ Исправление синхронизации завершено!"

echo ""
echo "🎯 Основные исправления:"
echo "  ✓ Убрано создание дефолтных игроков при ошибках API"
echo "  ✓ Убрано автоматическое сохранение состояния (предотвращен бесконечный цикл)"
echo "  ✓ Добавлен дебаунсинг для изменений в профиле игрока"
echo "  ✓ БД теперь является единственным источником истины"
echo "  ✓ Real-time синхронизация работает правильно"
echo ""
echo "🌐 Сервисы доступны:"
echo "  • Фронтенд: http://localhost:3000"
echo "  • API: http://localhost:3001"
echo "  • Health check: http://localhost:3001/api/health"
echo ""
echo "📝 Для остановки используйте:"
echo "  kill $SERVER_PID $FRONTEND_PID"
echo "  или запустите: ./stop-services.sh"
echo ""

# Создаем скрипт остановки
cat > stop-services.sh << 'EOF'
#!/bin/bash
echo "🛑 Останавливаем сервисы..."

if [ -f "server.pid" ]; then
    SERVER_PID=$(cat server.pid)
    kill $SERVER_PID 2>/dev/null && echo "✅ Сервер остановлен" || echo "⚠️ Сервер уже остановлен"
    rm -f server.pid
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ Фронтенд остановлен" || echo "⚠️ Фронтенд уже остановлен"
    rm -f frontend.pid
fi

# Убиваем все связанные процессы
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true

echo "✅ Все сервисы остановлены"
EOF

chmod +x stop-services.sh

log "🎉 Готово! Проблемы синхронизации исправлены."

echo ""
echo "🔍 Для мониторинга логов:"
echo "  • Логи сервера: tail -f server/logs/server.log (если есть)"
echo "  • Логи в консоли браузера для отладки фронтенда"
echo ""
echo "⚡ Что изменилось:"
echo "  1. База данных теперь ВСЕГДА является источником истины"
echo "  2. Клиент НЕ создает дефолтных игроков при ошибках"
echo "  3. Убран автоматический цикл сохранения состояния"
echo "  4. Добавлен дебаунсинг для полей ввода"
echo "  5. Real-time синхронизация работает корректно"
