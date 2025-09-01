#!/bin/bash

# Настройка окружения VPS для корректной работы проекта Malabar
# Устанавливает недостающие компоненты и настраивает права

echo "🔧 Настройка окружения VPS для проекта Malabar..."

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
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

# Проверяем права суперпользователя
if [ "$EUID" -ne 0 ]; then
    warn "Рекомендуется запуск с sudo для полной настройки"
fi

log "1. Обновляем пакеты системы..."
apt update -y
apt upgrade -y

log "2. Устанавливаем необходимые пакеты..."

# Node.js и npm (если не установлены)
if ! command -v node > /dev/null; then
    info "Устанавливаем Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    info "Node.js уже установлен: $(node --version)"
fi

# PM2 (глобально)
if ! command -v pm2 > /dev/null; then
    info "Устанавливаем PM2..."
    npm install -g pm2
else
    info "PM2 уже установлен: $(pm2 --version)"
fi

# SQLite3
if ! command -v sqlite3 > /dev/null; then
    info "Устанавливаем SQLite3..."
    apt install -y sqlite3
else
    info "SQLite3 уже установлен: $(sqlite3 --version)"
fi

# jq для работы с JSON
if ! command -v jq > /dev/null; then
    info "Устанавливаем jq..."
    apt install -y jq
else
    info "jq уже установлен: $(jq --version)"
fi

# curl
if ! command -v curl > /dev/null; then
    info "Устанавливаем curl..."
    apt install -y curl
else
    info "curl уже установлен"
fi

# git
if ! command -v git > /dev/null; then
    info "Устанавливаем git..."
    apt install -y git
else
    info "git уже установлен: $(git --version)"
fi

log "3. Настраиваем права доступа..."

# Создаем пользователя www-data если не существует
if ! id "www-data" &>/dev/null; then
    info "Создаем пользователя www-data..."
    useradd -r -s /bin/false www-data
fi

# Переходим в директорию проекта
if [ -d "/var/www/malabar" ]; then
    cd /var/www/malabar
    
    # Настраиваем права на директории
    chown -R www-data:www-data .
    chmod -R 755 .
    
    # Особые права для директории с базой данных
    mkdir -p server
    chmod 755 server
    
    if [ -f "server/malabar.db" ]; then
        chmod 664 server/malabar.db
        chown www-data:www-data server/malabar.db
    fi
    
    # Права на директорию логов
    mkdir -p logs
    chmod 755 logs
    chown www-data:www-data logs
    
    log "✅ Права доступа настроены"
else
    warn "Директория /var/www/malabar не найдена"
fi

log "4. Настраиваем брандмауэр..."

# Открываем необходимые порты
if command -v ufw > /dev/null; then
    info "Настраиваем UFW..."
    ufw allow 22    # SSH
    ufw allow 80    # HTTP
    ufw allow 443   # HTTPS
    ufw allow 3000  # Next.js
    ufw allow 3001  # API сервер
    ufw --force enable
    
    log "✅ Брандмауэр настроен"
elif command -v iptables > /dev/null; then
    warn "Обнаружен iptables, настройте порты 3000 и 3001 вручную"
else
    warn "Брандмауэр не найден"
fi

log "5. Настраиваем системные лимиты..."

# Увеличиваем лимиты для Node.js
cat > /etc/security/limits.d/nodejs.conf << 'EOF'
# Лимиты для Node.js процессов
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

log "6. Настраиваем автозапуск PM2..."

# Настраиваем автозапуск PM2
if command -v pm2 > /dev/null; then
    pm2 startup systemd -u www-data --hp /var/www
    systemctl enable pm2-www-data
    
    log "✅ Автозапуск PM2 настроен"
fi

log "7. Создаем скрипты мониторинга..."

# Скрипт мониторинга
cat > /usr/local/bin/malabar-monitor.sh << 'EOF'
#!/bin/bash

# Мониторинг проекта Malabar
cd /var/www/malabar

echo "=== Статус PM2 процессов ==="
pm2 status

echo ""
echo "=== Проверка портов ==="
ss -tulpn | grep -E ':300[01]'

echo ""
echo "=== Использование ресурсов ==="
ps aux | grep -E "(node|npm)" | grep -v grep

echo ""
echo "=== Последние логи ошибок ==="
pm2 logs --lines 5

echo ""
echo "=== Проверка API ==="
curl -s http://localhost:3001/api/health | jq . 2>/dev/null || echo "API не отвечает"

echo ""
echo "=== Размер базы данных ==="
if [ -f "server/malabar.db" ]; then
    ls -lh server/malabar.db
    echo "Игроков в БД: $(echo 'SELECT COUNT(*) FROM players;' | sqlite3 server/malabar.db 2>/dev/null || echo 'Ошибка чтения БД')"
else
    echo "База данных не найдена"
fi
EOF

chmod +x /usr/local/bin/malabar-monitor.sh

# Скрипт быстрого восстановления
cat > /usr/local/bin/malabar-recovery.sh << 'EOF'
#!/bin/bash

echo "🚑 Быстрое восстановление Malabar..."

cd /var/www/malabar

# Останавливаем все процессы
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Ждем завершения
sleep 3

# Запускаем заново
pm2 start ecosystem.config.js 2>/dev/null || {
    echo "PM2 config не найден, запускаем вручную..."
    cd server && npm start &
    cd .. && npm start &
}

echo "✅ Восстановление завершено"
EOF

chmod +x /usr/local/bin/malabar-recovery.sh

log "8. Настраиваем логротацию..."

# Настраиваем ротацию логов
cat > /etc/logrotate.d/malabar << 'EOF'
/var/www/malabar/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    postrotate
        pm2 reload ecosystem.config.js 2>/dev/null || true
    endscript
}
EOF

log "9. Проверяем итоговую конфигурацию..."

info "Версии установленных компонентов:"
echo "Node.js: $(node --version 2>/dev/null || echo 'Не установлен')"
echo "npm: $(npm --version 2>/dev/null || echo 'Не установлен')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'Не установлен')"
echo "SQLite3: $(sqlite3 --version 2>/dev/null || echo 'Не установлен')"
echo "jq: $(jq --version 2>/dev/null || echo 'Не установлен')"

info "Проверка портов:"
ss -tulpn | grep -E ':300[01]' || echo "Порты 3000/3001 не заняты"

log "✅ Настройка окружения завершена!"

echo ""
echo "🎯 Созданные утилиты:"
echo "  • malabar-monitor.sh  - мониторинг системы"
echo "  • malabar-recovery.sh - быстрое восстановление"
echo ""
echo "🔧 Доступные команды:"
echo "  • Мониторинг: malabar-monitor.sh"
echo "  • Восстановление: malabar-recovery.sh"
echo "  • Статус PM2: pm2 status"
echo "  • Логи: pm2 logs"
echo ""
echo "📂 Убедитесь что проект находится в: /var/www/malabar"
echo ""
echo "🚀 Для развертывания исправлений запустите:"
echo "  cd /var/www/malabar && ./deploy-sync-fixes-vps.sh"
