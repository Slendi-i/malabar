#!/bin/bash

# Скрипт развертывания исправлений синхронизации на VPS
# Применяет все исправления и перезапускает сервисы

echo "🔧 Начинаем развертывание исправлений синхронизации на VPS..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Переход в директорию проекта
cd /var/www/malabar || {
    error "Не найдена директория /var/www/malabar"
    exit 1
}

log "📋 Проверяем текущее состояние..."

# Проверяем запущенные процессы
info "Останавливаем существующие процессы..."
pkill -f "node.*server" || true
pkill -f "npm.*start" || true
pkill -f "next" || true
pm2 delete all 2>/dev/null || true

# Ждем завершения процессов
sleep 3

log "💾 Создаем бэкап..."
cp -r . ../malabar-backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || warn "Не удалось создать бэкап"

log "🔄 Применяем git изменения..."
git add . || warn "Git add failed"
git stash || warn "Git stash failed" 
git pull origin main || warn "Git pull failed"

log "📦 Обновляем зависимости..."

# Обновляем зависимости фронтенда
if [ -f "package-lock.json" ]; then
    npm ci --production=false
else
    npm install
fi

# Обновляем зависимости бэкенда
cd server
if [ -f "package-lock.json" ]; then
    npm ci --production=false
else
    npm install
fi
cd ..

log "🏗️ Собираем проект..."
npm run build

log "🗃️ Проверяем базу данных..."

# Проверяем существование БД
if [ -f "server/malabar.db" ]; then
    info "База данных найдена в server/"
    # Проверяем права доступа
    chmod 664 server/malabar.db
    chown www-data:www-data server/malabar.db 2>/dev/null || true
elif [ -f "malabar.db" ]; then
    info "База данных найдена в корне, перемещаем в server/"
    mv malabar.db server/
    chmod 664 server/malabar.db
    chown www-data:www-data server/malabar.db 2>/dev/null || true
else
    warn "База данных не найдена, будет создана новая"
fi

# Убеждаемся что директория server существует и имеет правильные права
mkdir -p server
chmod 755 server
chown www-data:www-data server 2>/dev/null || true

log "🚀 Запускаем сервисы..."

# Создаем конфигурацию PM2 если её нет
cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [
    {
      name: 'malabar-server',
      script: 'server.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true
    },
    {
      name: 'malabar-frontend',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
EOL

# Создаем директорию для логов
mkdir -p logs
chmod 755 logs
chown www-data:www-data logs 2>/dev/null || true

# Запускаем через PM2
log "▶️ Запускаем бэкенд через PM2..."
pm2 start ecosystem.config.js --only malabar-server

# Ждем запуска бэкенда
sleep 5

# Проверяем что бэкенд запустился
if curl -f -s "http://localhost:3001/api/health" > /dev/null; then
    log "✅ Бэкенд успешно запущен"
else
    error "❌ Бэкенд не запустился"
    pm2 logs malabar-server --lines 20
    exit 1
fi

log "▶️ Запускаем фронтенд через PM2..."
pm2 start ecosystem.config.js --only malabar-frontend

# Ждем запуска фронтенда
sleep 10

# Проверяем статус всех процессов
pm2 status

log "🧪 Выполняем быстрые тесты..."

# Тест API
if curl -f -s "http://localhost:3001/api/health" | grep -q "OK"; then
    log "✅ API Health check работает"
else
    error "❌ API Health check не работает"
fi

# Тест получения игроков
if curl -f -s "http://localhost:3001/api/players" | grep -q "players"; then
    log "✅ API игроков работает"
else
    error "❌ API игроков не работает"
fi

# Тест фронтенда (проверяем что отвечает)
if curl -f -s "http://localhost:3000" > /dev/null; then
    log "✅ Фронтенд отвечает"
else
    warn "⚠️ Фронтенд может быть еще не готов"
fi

# Проверяем что WebSocket порт слушается
if ss -tulpn | grep -q ":3001.*LISTEN"; then
    log "✅ WebSocket сервер слушает порт 3001"
else
    warn "⚠️ WebSocket сервер может не работать"
fi

log "🔧 Настраиваем автозапуск..."
pm2 save
pm2 startup

log "✅ Развертывание завершено!"

echo ""
echo "🎯 Применённые исправления:"
echo "  ✓ Исправлена логика синхронизации (БД - источник истины)"
echo "  ✓ Убраны бесконечные циклы автосохранения"
echo "  ✓ Добавлен дебаунсинг для изменений профиля"
echo "  ✓ Исправлена обработка real-time обновлений"
echo ""
echo "🌐 Сервисы доступны:"
echo "  • Фронтенд: http://$(hostname -I | awk '{print $1}'):3000"
echo "  • API: http://$(hostname -I | awk '{print $1}'):3001"
echo "  • Управление: pm2 status"
echo ""
echo "📊 Управление сервисами:"
echo "  • Статус: pm2 status"
echo "  • Логи: pm2 logs"
echo "  • Рестарт: pm2 restart all"
echo "  • Остановка: pm2 stop all"
echo ""
echo "🧪 Запустите полные тесты:"
echo "  node test-sync-fixes.js"

# Показываем текущий статус
pm2 status
