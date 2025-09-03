# Команды для VPS сервера (Linux)

## 🚀 Быстрое исправление ошибки Next.js

### Способ 1: Автоматический скрипт
```bash
# Сделать скрипт исполняемым
chmod +x fix-nextjs-error-vps.sh

# Запустить исправление
./fix-nextjs-error-vps.sh
```

### Способ 2: Ручные команды

#### 1. Остановка всех процессов
```bash
# Остановить все Node.js процессы
pkill -f "next dev"
pkill -f "node.*server"
pkill -f "npm.*dev"

# Или более агрессивно (если нужно)
pkill -9 -f "node"
pkill -9 -f "npm"
```

#### 2. Очистка кэша
```bash
# Удалить кэш Next.js
rm -rf .next
rm -rf node_modules/.cache

# Очистить npm кэш (опционально)
npm cache clean --force
```

#### 3. Проверка зависимостей
```bash
# Установить зависимости если нужно
npm install

# Проверить зависимости в server
cd server
npm install
cd ..
```

#### 4. Запуск серверов

**Backend (в фоне):**
```bash
cd server
nohup node server.js > ../server.log 2>&1 &
cd ..
```

**Frontend (в фоне):**
```bash
nohup npm run dev > frontend.log 2>&1 &
```

#### 5. Проверка работы
```bash
# Проверить backend
curl http://localhost:3001/api/health

# Проверить frontend
curl http://localhost:3000

# Проверить процессы
ps aux | grep -E "(node|npm)"
```

## 🔧 Полезные команды для управления

### Просмотр логов
```bash
# Логи backend
tail -f server.log

# Логи frontend
tail -f frontend.log

# Последние 50 строк логов
tail -50 server.log
```

### Управление процессами
```bash
# Найти процессы Node.js
ps aux | grep node

# Остановить процесс по PID
kill <PID>

# Принудительно остановить
kill -9 <PID>

# Остановить все Node.js процессы
pkill node
```

### Проверка портов
```bash
# Проверить какие порты заняты
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Или с ss
ss -tulpn | grep :3000
ss -tulpn | grep :3001
```

### Мониторинг ресурсов
```bash
# Использование CPU и памяти
top
htop  # если установлен

# Использование диска
df -h

# Свободная память
free -h
```

## 🚨 Решение проблем

### Если порты заняты
```bash
# Найти процесс на порту 3000
lsof -i :3000

# Найти процесс на порту 3001
lsof -i :3001

# Убить процесс на порту
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:3001)
```

### Если не хватает памяти
```bash
# Очистить кэш системы
sync
echo 3 > /proc/sys/vm/drop_caches

# Проверить swap
swapon -s
```

### Если проблемы с правами
```bash
# Дать права на выполнение
chmod +x *.sh

# Изменить владельца файлов
chown -R $USER:$USER .
```

## 📝 Проверка после исправления

1. **Откройте браузер** и перейдите на `http://your-vps-ip:3000`
2. **Проверьте консоль браузера** (F12) на ошибки
3. **Проверьте логи серверов:**
   ```bash
   tail -f server.log
   tail -f frontend.log
   ```

## 🎯 Ожидаемый результат

После выполнения команд:
- ✅ Сайт загружается без ошибки "missing required error components"
- ✅ Все исправления синхронизации работают
- ✅ Броски кубика и роллы игр сохраняются
- ✅ Перетаскивание фишек работает корректно
- ✅ Синхронизация в реальном времени функционирует

## 🆘 Если что-то не работает

1. **Проверьте логи:**
   ```bash
   tail -50 server.log
   tail -50 frontend.log
   ```

2. **Проверьте процессы:**
   ```bash
   ps aux | grep -E "(node|npm)"
   ```

3. **Проверьте порты:**
   ```bash
   netstat -tulpn | grep -E "(3000|3001)"
   ```

4. **Перезапустите все:**
   ```bash
   ./fix-nextjs-error-vps.sh
   ```
