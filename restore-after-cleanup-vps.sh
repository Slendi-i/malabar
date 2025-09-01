#!/bin/bash

# Восстановление сервера после чистки
# Устанавливает зависимости и запускает сервисы БЕЗ висящих команд

echo "🔧 Восстановление сервера после чистки..."
echo "=========================================="

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
    exit 1
}

echo ""
echo "📍 Текущая директория: $(pwd)"
echo "📊 Место на диске ДО восстановления:"
df -h . | head -2

echo ""
echo "🛑 1. Остановка существующих процессов"
echo "======================================"

info "Останавливаем PM2 процессы..."
timeout 10 pm2 stop all 2>/dev/null && log "PM2 процессы остановлены" || warn "PM2 процессы не найдены"

info "Останавливаем Node процессы..."
pkill -f "node.*server" 2>/dev/null && log "Node процессы остановлены" || info "Node процессы не найдены"
pkill -f "npm.*start" 2>/dev/null && log "npm процессы остановлены" || info "npm процессы не найдены"

# Ждем завершения процессов
sleep 3

echo ""
echo "📦 2. Установка зависимостей фронтенда"
echo "======================================"

if [ -f "package.json" ]; then
    info "Устанавливаем зависимости фронтенда..."
    
    # Очищаем кэш если нужно
    npm cache clean --force 2>/dev/null || true
    
    # Устанавливаем зависимости с таймаутом
    timeout 300 npm install --production --no-optional --prefer-offline 2>/dev/null
    INSTALL_EXIT_CODE=$?
    
    if [ $INSTALL_EXIT_CODE -eq 0 ]; then
        log "Зависимости фронтенда установлены"
    elif [ $INSTALL_EXIT_CODE -eq 124 ]; then
        warn "Установка превысила таймаут (5 минут), но может быть частично выполнена"
    else
        error "Ошибка установки зависимостей фронтенда"
    fi
    
    # Проверяем результат
    if [ -d "node_modules" ]; then
        log "node_modules/ создана"
    else
        error "node_modules/ не создана!"
    fi
else
    error "package.json не найден!"
    exit 1
fi

echo ""
echo "📦 3. Установка зависимостей бэкенда"
echo "==================================="

if [ -f "server/package.json" ]; then
    info "Устанавливаем зависимости бэкенда..."
    
    cd server
    
    # Очищаем кэш
    npm cache clean --force 2>/dev/null || true
    
    # Устанавливаем зависимости с таймаутом
    timeout 300 npm install --production --no-optional --prefer-offline 2>/dev/null
    INSTALL_EXIT_CODE=$?
    
    if [ $INSTALL_EXIT_CODE -eq 0 ]; then
        log "Зависимости бэкенда установлены"
    elif [ $INSTALL_EXIT_CODE -eq 124 ]; then
        warn "Установка превысила таймаут (5 минут), но может быть частично выполнена"
    else
        error "Ошибка установки зависимостей бэкенда"
    fi
    
    # Проверяем результат
    if [ -d "node_modules" ]; then
        log "server/node_modules/ создана"
    else
        error "server/node_modules/ не создана!"
    fi
    
    cd ..
else
    error "server/package.json не найден!"
    exit 1
fi

echo ""
echo "🏗️ 4. Сборка проекта"
echo "==================="

info "Собираем фронтенд..."
timeout 180 npm run build 2>/dev/null
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log "Сборка фронтенда завершена"
    if [ -d ".next" ]; then
        log ".next/ директория создана"
    else
        warn ".next/ директория не создана"
    fi
elif [ $BUILD_EXIT_CODE -eq 124 ]; then
    warn "Сборка превысила таймаут (3 минуты)"
else
    warn "Ошибка сборки фронтенда (код: $BUILD_EXIT_CODE)"
fi

echo ""
echo "🗃️ 5. Проверка базы данных"
echo "=========================="

if [ -f "server/malabar.db" ]; then
    log "База данных найдена"
    
    # Проверяем права доступа
    chmod 664 server/malabar.db 2>/dev/null || true
    chown www-data:www-data server/malabar.db 2>/dev/null || true
    
    # Проверяем размер
    DB_SIZE=$(stat -c%s "server/malabar.db" 2>/dev/null || echo "0")
    if [ "$DB_SIZE" -gt 1000 ]; then
        log "База данных содержит данные ($DB_SIZE байт)"
    else
        warn "База данных пустая или маленькая ($DB_SIZE байт)"
    fi
else
    error "База данных не найдена! Создаем новую..."
    
    # Создаем пустую БД (сервер создаст структуру при запуске)
    touch server/malabar.db
    chmod 664 server/malabar.db 2>/dev/null || true
    chown www-data:www-data server/malabar.db 2>/dev/null || true
    
    log "Пустая база данных создана"
fi

echo ""
echo "⚙️ 6. Создание конфигурации PM2"
echo "==============================="

if [ ! -f "ecosystem.config.js" ]; then
    info "Создаем конфигурацию PM2..."
    
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
else
    log "ecosystem.config.js уже существует"
fi

# Создаем директорию для логов
mkdir -p logs
chmod 755 logs
chown www-data:www-data logs 2>/dev/null || true

echo ""
echo "🚀 7. Запуск сервисов"
echo "==================="

info "Запускаем PM2 процессы..."

# Запускаем с таймаутом для избежания висящих команд
timeout 30 pm2 start ecosystem.config.js 2>/dev/null
START_EXIT_CODE=$?

if [ $START_EXIT_CODE -eq 0 ]; then
    log "PM2 процессы запущены"
elif [ $START_EXIT_CODE -eq 124 ]; then
    warn "Запуск превысил таймаут, но процессы могут быть запущены"
else
    warn "Ошибка запуска PM2 процессов"
fi

# Ждем запуска
sleep 5

echo ""
echo "🧪 8. Проверка запуска"
echo "====================="

# Проверяем PM2 статус
info "Проверяем статус процессов..."
timeout 10 pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || {
    # Fallback если jq не работает
    timeout 10 pm2 status --no-color 2>/dev/null | grep -E "(online|stopped|errored)" || warn "Не удалось получить статус PM2"
}

# Проверяем порты
info "Проверяем порты..."
PORTS_3000=$(ss -tulpn 2>/dev/null | grep :3000 | wc -l)
PORTS_3001=$(ss -tulpn 2>/dev/null | grep :3001 | wc -l)

if [ "$PORTS_3000" -gt 0 ]; then
    log "Порт 3000 (фронтенд) занят"
else
    warn "Порт 3000 свободен"
fi

if [ "$PORTS_3001" -gt 0 ]; then
    log "Порт 3001 (API) занят"
else
    warn "Порт 3001 свободен"
fi

# Проверяем API с таймаутом
info "Проверяем API..."
API_RESPONSE=$(timeout 10 curl -s "http://localhost:3001/api/health" 2>/dev/null || echo "timeout")

if echo "$API_RESPONSE" | grep -q "OK"; then
    log "API отвечает корректно"
elif [ "$API_RESPONSE" = "timeout" ]; then
    warn "API не отвечает (timeout)"
else
    warn "API отвечает некорректно: $API_RESPONSE"
fi

echo ""
echo "📊 РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ"
echo "=========================="

echo "Место на диске ПОСЛЕ восстановления:"
df -h . | head -2

echo ""
echo "🎯 Статус сервисов:"
echo "  • PM2 процессы: $(timeout 5 pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo "неизвестно") запущено"
echo "  • Порт 3000: $([ "$PORTS_3000" -gt 0 ] && echo "занят ✓" || echo "свободен ⚠️")"
echo "  • Порт 3001: $([ "$PORTS_3001" -gt 0 ] && echo "занят ✓" || echo "свободен ⚠️")"
echo "  • API: $(echo "$API_RESPONSE" | grep -q "OK" && echo "работает ✓" || echo "не работает ⚠️")"

echo ""
if [ "$PORTS_3000" -gt 0 ] && [ "$PORTS_3001" -gt 0 ]; then
    echo -e "${GREEN}🎉 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!${NC}"
    echo ""
    echo "🌐 Сайт должен быть доступен:"
    echo "  • http://$(hostname -I | awk '{print $1}'):3000"
    echo "  • http://46.173.17.229:3000"
    echo "  • http://vet-klinika-moscow.ru:3000"
    echo ""
    echo "🧪 Для полной проверки запустите:"
    echo "  ./test-after-restore-vps.sh"
else
    echo -e "${YELLOW}⚠️ ВОССТАНОВЛЕНИЕ ЧАСТИЧНО ЗАВЕРШЕНО${NC}"
    echo ""
    echo "🔧 Если сервисы не запустились:"
    echo "  1. Проверьте логи: pm2 logs"
    echo "  2. Перезапустите: pm2 restart all"
    echo "  3. Диагностика: ./diagnose-after-cleanup-vps.sh"
    echo ""
    echo "🆘 Если проблемы остались:"
    echo "  ./emergency-restore-vps.sh"
fi

echo ""
echo "📋 Управление сервисами:"
echo "  • Статус: pm2 status"
echo "  • Логи: pm2 logs"
echo "  • Перезапуск: pm2 restart all"
echo "  • Остановка: pm2 stop all"
