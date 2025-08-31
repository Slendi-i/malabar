#!/bin/bash

# VPS Setup Script for Malabar Event Site
# Скрипт первичной настройки VPS сервера

set -e

echo "🛠️  Настройка VPS для Malabar Event Site..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js и npm
echo "📦 Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версий
echo "✅ Установлены версии:"
node --version
npm --version

# Установка PM2 глобально
echo "📦 Установка PM2..."
sudo npm install -g pm2

# Создание пользователя для приложения (если не существует)
if ! id "malabar" &>/dev/null; then
    echo "👤 Создание пользователя malabar..."
    sudo useradd -m -s /bin/bash malabar
    sudo usermod -aG sudo malabar
fi

# Создание директории приложения
echo "📁 Создание директории приложения..."
sudo mkdir -p /opt/malabar-event
sudo chown malabar:malabar /opt/malabar-event

# Настройка firewall
echo "🔥 Настройка firewall..."
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw --force enable

# Создание systemd сервиса для автозапуска PM2
echo "⚙️  Настройка автозапуска PM2..."
sudo tee /etc/systemd/system/pm2-malabar.service > /dev/null <<EOF
[Unit]
Description=PM2 process manager for Malabar Event
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=malabar
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Environment=PM2_HOME=/home/malabar/.pm2
PIDFile=/home/malabar/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/bin/pm2 resurrect
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill

[Install]
WantedBy=multi-user.target
EOF

# Включение сервиса
sudo systemctl enable pm2-malabar
sudo systemctl daemon-reload

echo "✅ Настройка VPS завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Скопируйте код приложения в /opt/malabar-event"
echo "2. Запустите: cd /opt/malabar-event && chmod +x scripts/*.sh"
echo "3. Запустите: ./scripts/deploy.sh"
echo ""
echo "🔧 Полезные команды:"
echo "  sudo systemctl status pm2-malabar  - статус PM2 сервиса"
echo "  sudo systemctl start pm2-malabar   - запуск PM2 сервиса"
echo "  sudo systemctl stop pm2-malabar    - остановка PM2 сервиса"
