# 🚀 Malabar Event Site - Руководство по развертыванию

## Быстрый старт на VPS

### 1. Первичная настройка VPS сервера

```bash
# Загрузите проект на сервер
git clone <repository-url> /opt/malabar-event
cd /opt/malabar-event

# Запустите настройку VPS (только один раз)
chmod +x scripts/*.sh
sudo ./scripts/setup-vps.sh
```

### 2. Развертывание приложения

```bash
# Развертывание приложения
./scripts/deploy.sh
```

### 3. Обновление приложения

```bash
# Для обновления без остановки сервиса
./scripts/update.sh
```

### 4. Мониторинг

```bash
# Просмотр статуса приложения
./scripts/monitor.sh

# Просмотр логов в реальном времени
pm2 logs

# Просмотр логов конкретного сервиса
pm2 logs malabar-frontend
pm2 logs malabar-backend
```

## URL доступа

- **Frontend**: http://46.173.17.229:3000
- **Backend API**: http://46.173.17.229:3001
- **Health Check**: http://46.173.17.229:3001/api/health

## Управление процессами PM2

### Основные команды

```bash
# Статус всех процессов
pm2 status

# Перезапуск всех процессов
pm2 restart all

# Остановка всех процессов
pm2 stop all

# Удаление всех процессов
pm2 delete all

# Просмотр логов
pm2 logs

# Мониторинг ресурсов
pm2 monit
```

### Управление конкретными сервисами

```bash
# Frontend
pm2 restart malabar-frontend
pm2 stop malabar-frontend
pm2 logs malabar-frontend

# Backend
pm2 restart malabar-backend
pm2 stop malabar-backend
pm2 logs malabar-backend
```

## Структура проекта

```
malabar/
├── ecosystem.config.js    # Конфигурация PM2
├── scripts/
│   ├── deploy.sh         # Скрипт развертывания
│   ├── update.sh         # Скрипт обновления
│   ├── monitor.sh        # Скрипт мониторинга
│   └── setup-vps.sh      # Первичная настройка VPS
├── server/               # Backend сервер
├── pages/                # Frontend Next.js
├── components/           # React компоненты
└── logs/                 # Логи приложения
```

## Автозапуск при перезагрузке

Автозапуск настраивается автоматически через systemd сервис `pm2-malabar`.

```bash
# Проверка статуса автозапуска
sudo systemctl status pm2-malabar

# Ручной запуск сервиса
sudo systemctl start pm2-malabar

# Остановка сервиса
sudo systemctl stop pm2-malabar
```

## Резервное копирование

База данных автоматически копируется при каждом обновлении в:
`server/malabar.db.backup.YYYYMMDD_HHMMSS`

Для ручного создания резервной копии:
```bash
cp server/malabar.db server/malabar.db.backup.$(date +%Y%m%d_%H%M%S)
```

## Устранение неполадок

### Проверка доступности сервисов

```bash
# Проверка портов
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# Проверка процессов
ps aux | grep node
```

### Просмотр системных логов

```bash
# Логи PM2 сервиса
sudo journalctl -u pm2-malabar -f

# Логи системы
sudo journalctl -xe
```

### Перезапуск с полной очисткой

```bash
pm2 stop all
pm2 delete all
pm2 kill
./scripts/deploy.sh
```

## Безопасность

- Firewall настроен на порты 22 (SSH), 3000 (Frontend), 3001 (Backend)
- Приложение запускается от пользователя `malabar` (не root)
- Логи ротируются автоматически PM2

## Мониторинг производительности

Используйте PM2 монитор для отслеживания:
- Использование CPU и памяти
- Количество перезапусков
- Время отклика
- Ошибки и исключения

```bash
pm2 monit
```
