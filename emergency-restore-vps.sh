#!/bin/bash

# Экстренное восстановление сервера после чистки
# Полная переустановка всего с нуля

echo "🆘 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ СЕРВЕРА"
echo "===================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
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
    echo ""
    echo "🔧 Попробуйте создать директорию:"
    echo "  sudo mkdir -p /var/www/malabar"
    echo "  cd /var/www/malabar"
    exit 1
}

echo "📍 Директория: $(pwd)"
echo "👤 Пользователь: $(whoami)"
echo "📊 Место ДО восстановления:"
df -h . | head -2

echo ""
echo "⚠️ ВНИМАНИЕ: Этот скрипт выполнит полную очистку и переустановку!"
echo "Будут удалены ВСЕ временные файлы и зависимости."
echo "База данных и исходный код НЕ будут затронуты."

# Пауза для чтения (но не требует ввода)
sleep 3

echo ""
echo "🧹 1. ПОЛНАЯ ОЧИСТКА"
echo "==================="

info "Останавливаем все процессы..."
timeout 10 pm2 delete all 2>/dev/null && log "PM2 процессы удалены" || info "PM2 процессы не найдены"
pkill -f "node.*server" 2>/dev/null && log "Node серверы остановлены" || info "Node серверы не найдены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены" || info "npm процессы не найдены"

sleep 3

info "Удаляем временные файлы и зависимости..."
rm -rf node_modules server/node_modules .next out 2>/dev/null && log "Зависимости и сборки удалены"
rm -f package-lock.json server/package-lock.json 2>/dev/null && log "lock файлы удалены"
rm -rf logs/*.log 2>/dev/null && log "Логи очищены"

info "Очищаем системные кэши..."
npm cache clean --force 2>/dev/null && log "npm cache очищен"
timeout 10 pm2 flush 2>/dev/null && log "PM2 логи очищены" || info "PM2 логи не найдены"

# Создаем директории
mkdir -p logs server
chmod 755 logs server

echo ""
echo "🔍 2. ПРОВЕРКА КРИТИЧЕСКИ ВАЖНЫХ ФАЙЛОВ"
echo "======================================="

CRITICAL_FILES_MISSING=0

# Проверяем основные файлы проекта
if [ ! -f "package.json" ]; then
    error "package.json отсутствует!"
    CRITICAL_FILES_MISSING=$((CRITICAL_FILES_MISSING + 1))
else
    log "package.json ✓"
fi

if [ ! -f "server/package.json" ]; then
    error "server/package.json отсутствует!"
    CRITICAL_FILES_MISSING=$((CRITICAL_FILES_MISSING + 1))
else
    log "server/package.json ✓"
fi

if [ ! -f "server/server.js" ]; then
    error "server/server.js отсутствует!"
    CRITICAL_FILES_MISSING=$((CRITICAL_FILES_MISSING + 1))
else
    log "server/server.js ✓"
fi

# Проверяем директории исходного кода
CRITICAL_DIRS=("pages" "components" "services" "server")
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        error "Директория $dir отсутствует!"
        CRITICAL_FILES_MISSING=$((CRITICAL_FILES_MISSING + 1))
    else
        log "Директория $dir ✓"
    fi
done

if [ $CRITICAL_FILES_MISSING -gt 0 ]; then
    error "КРИТИЧЕСКИЕ ФАЙЛЫ ОТСУТСТВУЮТ! Количество проблем: $CRITICAL_FILES_MISSING"
    echo ""
    echo "🆘 ВОЗМОЖНЫЕ РЕШЕНИЯ:"
    echo "  1. Восстановите из backup:"
    echo "     tar -xzf backup_*.tar.gz"
    echo ""
    echo "  2. Клонируйте проект заново:"
    echo "     git clone <repository_url> ."
    echo ""
    echo "  3. Скопируйте файлы с локального компьютера"
    exit 1
fi

echo ""
echo "🗃️ 3. ПРОВЕРКА И ВОССТАНОВЛЕНИЕ БАЗЫ ДАННЫХ"
echo "==========================================="

if [ -f "server/malabar.db" ]; then
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
    if [ "$DB_SIZE" -gt 1000 ]; then
        log "База данных найдена и содержит данные ($DB_SIZE байт)"
    else
        warn "База данных найдена, но пустая ($DB_SIZE байт)"
    fi
    
    # Исправляем права доступа
    chmod 664 server/malabar.db 2>/dev/null
    chown www-data:www-data server/malabar.db 2>/dev/null || true
    
elif [ -f "malabar.db" ]; then
    warn "База данных найдена в корне, перемещаем в server/"
    mv malabar.db server/ && log "База данных перемещена"
    chmod 664 server/malabar.db 2>/dev/null
    chown www-data:www-data server/malabar.db 2>/dev/null || true
else
    warn "База данных не найдена, создаем новую пустую..."
    touch server/malabar.db
    chmod 664 server/malabar.db 2>/dev/null
    chown www-data:www-data server/malabar.db 2>/dev/null || true
    log "Пустая база данных создана"
fi

echo ""
echo "📦 4. УСТАНОВКА ЗАВИСИМОСТЕЙ (ШАГ 1 - ФРОНТЕНД)"
echo "=============================================="

info "Устанавливаем зависимости фронтенда..."
info "Это может занять 5-15 минут..."

# Попытка 1: обычная установка
timeout 900 npm install --no-optional --no-audit --prefer-offline 2>/dev/null
INSTALL_RESULT=$?

if [ $INSTALL_RESULT -eq 0 ]; then
    log "✅ Зависимости фронтенда установлены (попытка 1)"
elif [ $INSTALL_RESULT -eq 124 ]; then
    warn "⏰ Таймаут установки (15 минут), пробуем быструю установку..."
    
    # Попытка 2: только production зависимости
    timeout 600 npm install --production --no-optional --no-audit 2>/dev/null
    INSTALL_RESULT=$?
    
    if [ $INSTALL_RESULT -eq 0 ]; then
        log "✅ Production зависимости фронтенда установлены (попытка 2)"
    else
        warn "⚠️ Ошибка установки зависимостей фронтенда"
    fi
else
    warn "⚠️ Ошибка установки зависимостей фронтенда"
fi

# Проверяем результат
if [ -d "node_modules" ]; then
    MODULES_COUNT=$(ls node_modules 2>/dev/null | wc -l)
    log "Установлено модулей фронтенда: $MODULES_COUNT"
else
    error "❌ node_modules не создана!"
fi

echo ""
echo "📦 5. УСТАНОВКА ЗАВИСИМОСТЕЙ (ШАГ 2 - БЭКЕНД)"
echo "============================================="

info "Устанавливаем зависимости бэкенда..."

cd server

# Попытка 1: обычная установка
timeout 600 npm install --no-optional --no-audit --prefer-offline 2>/dev/null
INSTALL_RESULT=$?

if [ $INSTALL_RESULT -eq 0 ]; then
    log "✅ Зависимости бэкенда установлены (попытка 1)"
elif [ $INSTALL_RESULT -eq 124 ]; then
    warn "⏰ Таймаут установки, пробуем production..."
    
    # Попытка 2: только production
    timeout 300 npm install --production --no-optional 2>/dev/null
    INSTALL_RESULT=$?
    
    if [ $INSTALL_RESULT -eq 0 ]; then
        log "✅ Production зависимости бэкенда установлены (попытка 2)"
    else
        warn "⚠️ Ошибка установки зависимостей бэкенда"
    fi
else
    warn "⚠️ Ошибка установки зависимостей бэкенда"
fi

# Проверяем результат
if [ -d "node_modules" ]; then
    MODULES_COUNT=$(ls node_modules 2>/dev/null | wc -l)
    log "Установлено модулей бэкенда: $MODULES_COUNT"
else
    error "❌ server/node_modules не создана!"
fi

cd ..

echo ""
echo "🏗️ 6. СБОРКА ПРОЕКТА"
echo "=================="

info "Собираем фронтенд..."
timeout 300 npm run build 2>/dev/null
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    log "✅ Сборка фронтенда завершена"
elif [ $BUILD_RESULT -eq 124 ]; then
    warn "⏰ Сборка превысила таймаут (5 минут)"
else
    warn "⚠️ Ошибка сборки фронтенда (код: $BUILD_RESULT)"
fi

if [ -d ".next" ]; then
    log ".next директория создана"
else
    warn ".next директория не создана"
fi

echo ""
echo "⚙️ 7. СОЗДАНИЕ КОНФИГУРАЦИЙ"
echo "=========================="

# Создаем PM2 конфигурацию
cat > ecosystem.config.js << 'EOF'
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
      error_file: '../logs/server-error.log',
      out_file: '../logs/server-out.log',
      log_file: '../logs/server-combined.log',
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
EOF

log "ecosystem.config.js создан"

# Настраиваем права доступа
chmod 755 . server logs
chown -R www-data:www-data . 2>/dev/null || true

echo ""
echo "🚀 8. ТЕСТОВЫЙ ЗАПУСК"
echo "==================="

info "Запускаем PM2 процессы..."
timeout 30 pm2 start ecosystem.config.js 2>/dev/null
START_RESULT=$?

if [ $START_RESULT -eq 0 ]; then
    log "✅ PM2 процессы запущены"
elif [ $START_RESULT -eq 124 ]; then
    warn "⏰ Запуск превысил таймаут"
else
    warn "⚠️ Ошибка запуска PM2"
fi

# Ждем запуска
sleep 8

# Проверяем результат
info "Проверяем статус процессов..."
PM2_PROCESSES=$(timeout 5 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "0")
log "PM2 процессов запущено: $PM2_PROCESSES"

# Проверяем порты
PORTS_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
PORTS_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)

info "Проверяем API..."
API_RESPONSE=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")

echo ""
echo "📊 РЕЗУЛЬТАТ ЭКСТРЕННОГО ВОССТАНОВЛЕНИЯ"
echo "======================================"

echo "📊 Место на диске ПОСЛЕ восстановления:"
df -h . | head -2

echo ""
echo "📈 Статистика установки:"
FRONTEND_MODULES=$(ls node_modules 2>/dev/null | wc -l)
BACKEND_MODULES=$(ls server/node_modules 2>/dev/null | wc -l)
echo "  • Модулей фронтенда: $FRONTEND_MODULES"
echo "  • Модулей бэкенда: $BACKEND_MODULES"
echo "  • PM2 процессов: $PM2_PROCESSES"
echo "  • Порт 3000: $([ "$PORTS_3000" -gt 0 ] && echo "занят ✅" || echo "свободен ⚠️")"
echo "  • Порт 3001: $([ "$PORTS_3001" -gt 0 ] && echo "занят ✅" || echo "свободен ⚠️")"
echo "  • API: $(echo "$API_RESPONSE" | grep -q "OK" && echo "работает ✅" || echo "не работает ⚠️")"

echo ""
# Определяем общий результат
if [ "$FRONTEND_MODULES" -gt 50 ] && [ "$BACKEND_MODULES" -gt 10 ] && [ "$PORTS_3000" -gt 0 ] && [ "$PORTS_3001" -gt 0 ]; then
    echo -e "${GREEN}🎉 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ УСПЕШНО ЗАВЕРШЕНО!${NC}"
    echo ""
    echo "🌐 Сайт готов к работе:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
elif [ "$FRONTEND_MODULES" -gt 20 ] && [ "$BACKEND_MODULES" -gt 5 ]; then
    echo -e "${YELLOW}⚠️ ВОССТАНОВЛЕНИЕ ЧАСТИЧНО ЗАВЕРШЕНО${NC}"
    echo ""
    echo "🔧 Завершите настройку:"
    echo "  1. Перезапустите: pm2 restart all"
    echo "  2. Проверьте: ./test-after-restore-vps.sh"
    echo "  3. Логи: pm2 logs"
else
    echo -e "${RED}❌ ВОССТАНОВЛЕНИЕ НЕ УДАЛОСЬ${NC}"
    echo ""
    echo "🆘 Возможные проблемы:"
    echo "  • Недостаток места на диске"
    echo "  • Отсутствуют критически важные файлы"
    echo "  • Проблемы с интернет-соединением"
    echo ""
    echo "🔧 Попробуйте:"
    echo "  1. Освободить место: df -h"
    echo "  2. Проверить файлы: ./diagnose-after-cleanup-vps.sh"
    echo "  3. Восстановить из backup"
fi

echo ""
echo "📋 Управление сервером:"
echo "  • Статус: pm2 status"
echo "  • Логи: pm2 logs"
echo "  • Перезапуск: pm2 restart all"
echo "  • Диагностика: ./diagnose-after-cleanup-vps.sh"
echo "  • Тестирование: ./test-after-restore-vps.sh"
