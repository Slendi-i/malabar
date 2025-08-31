# 🚨 Быстрое исправление Git конфликтов на VPS

## Проблема
```
error: Your local changes to the following files would be overwritten by merge:
        server/node_modules/.package-lock.json
        server/package-lock.json
Please commit your changes or stash them before you merge.
```

## ⚡ Быстрое решение (выполните на VPS сервере):

### Вариант 1: Автоматический скрипт
```bash
# Загрузите и запустите скрипт исправления
wget https://raw.githubusercontent.com/yourusername/malabar/main/fix-vps-git.sh
chmod +x fix-vps-git.sh
./fix-vps-git.sh
```

### Вариант 2: Ручные команды
```bash
# 1. Остановка процессов
pm2 stop all

# 2. Резервная копия базы данных
cp server/malabar.db server/malabar.db.backup.$(date +%Y%m%d_%H%M%S)

# 3. Очистка node_modules (они не должны быть в Git)
rm -rf server/node_modules/
rm -rf node_modules/
rm -f server/package-lock.json
rm -f package-lock.json

# 4. Сброс Git к удаленной версии
git clean -fd
git reset --hard HEAD
git fetch origin main
git reset --hard origin/main

# 5. Установка зависимостей
npm install
npm run build
cd server && npm install && cd ..

# 6. Запуск приложений
pm2 start ecosystem.config.js
pm2 save
```

### Вариант 3: Если нужно сохранить локальные изменения
```bash
# 1. Сохранить изменения в stash
git add .
git stash push -m "Local changes before merge fix"

# 2. Очистка node_modules
rm -rf server/node_modules/
rm -rf node_modules/

# 3. Обновление
git pull origin main

# 4. Восстановление изменений
git stash pop

# 5. Переустановка зависимостей и запуск
npm install && npm run build
cd server && npm install && cd ..
pm2 restart all
```

## 🔍 Проверка результата
```bash
# Статус Git
git status

# Статус приложений
pm2 status

# Проверка логов
pm2 logs

# Проверка доступности
curl http://localhost:3001/api/health
```

## 📋 Предотвращение в будущем

### Обновите .gitignore:
```gitignore
# Зависимости
node_modules/
server/node_modules/

# Lock файлы (обычно включают, но могут конфликтовать)
# package-lock.json
# server/package-lock.json

# PM2 и логи
logs/
.pm2/
```

### Правильный процесс обновления:
```bash
# 1. Остановка приложений
pm2 stop all

# 2. Получение обновлений
git pull origin main

# 3. Обновление зависимостей
npm install
cd server && npm install && cd ..

# 4. Пересборка и запуск
npm run build
pm2 start ecosystem.config.js
```

## ⚠️ В случае критических проблем:
```bash
# Полная переустановка
rm -rf /opt/malabar-event
git clone https://github.com/yourusername/malabar.git /opt/malabar-event
cd /opt/malabar-event
./scripts/deploy.sh
```
