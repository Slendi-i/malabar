# 🚨 Исправление проблем с WebSocket

## Проблема
```
WebSocket connection to 'ws://46.173.17.229:3001/ws' failed
WebSocket error: Event
WebSocket disconnected: 1006
```

Код ошибки 1006 = аномальное закрытие соединения.

## 🔧 Быстрое решение

### Шаг 1: Автоматическое исправление на VPS
```bash
# Загрузите и запустите скрипт исправления
chmod +x fix-websocket-issues.sh
./fix-websocket-issues.sh
```

### Шаг 2: Ручная диагностика (если автоматическое не помогло)
```bash
# Диагностика
chmod +x debug-websocket.sh
./debug-websocket.sh

# Проверка процессов
pm2 status
pm2 logs malabar-backend

# Проверка портов
netstat -tlnp | grep :3001
```

### Шаг 3: Возможные причины и решения

#### 1. Сервер не запущен
```bash
pm2 restart malabar-backend
pm2 logs malabar-backend
```

#### 2. Firewall блокирует соединения
```bash
sudo ufw allow 3001/tcp
sudo ufw status
```

#### 3. Зависимость ws не установлена
```bash
cd server
npm install ws
cd ..
pm2 restart malabar-backend
```

#### 4. Порт занят другим процессом
```bash
sudo fuser -k 3001/tcp
pm2 restart malabar-backend
```

#### 5. Проблемы с конфигурацией PM2
```bash
pm2 delete all
pm2 start ecosystem.config.js
```

## 🧪 Тестирование WebSocket

### Веб-тест
Откройте файл `websocket-test.html` в браузере для интерактивного тестирования.

### Командная строка
```bash
# Тест WebSocket через curl
curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGVzdA==" \
     http://46.173.17.229:3001/ws
```

### Проверка в браузере
```javascript
// Откройте консоль браузера и выполните:
const ws = new WebSocket('ws://46.173.17.229:3001/ws');
ws.onopen = () => console.log('WebSocket открыт');
ws.onerror = (e) => console.log('Ошибка WebSocket:', e);
ws.onclose = (e) => console.log('WebSocket закрыт:', e.code);
```

## ✅ Улучшения добавлены

### 1. HTTP Fallback
Теперь если WebSocket не работает, приложение автоматически переключается на HTTP polling.

### 2. Улучшенная индикация
- 🟢 Синхронизировано (WebSocket работает)
- 🔵 Подключение... (устанавливается соединение)
- 🟠 Переподключение... (попытка восстановить соединение)
- 🟣 HTTP режим (fallback режим)
- 🔴 Ошибка синхронизации (проблемы с соединением)

### 3. Автоматическое восстановление
- До 5 попыток переподключения
- Экспоненциальная задержка между попытками
- Переключение на HTTP при неудаче

## 🔍 Проверка результата

После исправления проверьте:

```bash
# Статус приложения
pm2 status

# Проверка WebSocket
curl http://localhost:3001/api/health

# Логи
pm2 logs malabar-backend --lines 20
```

В браузере должно показывать:
- 🟢 "Синхронизировано" - если WebSocket работает
- 🟣 "HTTP режим" - если используется fallback

## 📞 Если проблемы остаются

1. **Проверьте логи сервера**: `pm2 logs malabar-backend`
2. **Перезапустите все**: `pm2 restart all`
3. **Полная переустановка**: `./scripts/deploy.sh`
4. **Обратитесь с логами** из `debug-websocket.sh`

## 🛡️ Предотвращение в будущем

### Мониторинг
```bash
# Добавьте в cron для автоматической проверки
echo "*/5 * * * * /opt/malabar-event/scripts/monitor.sh" | crontab -
```

### Автоматический перезапуск при сбоях
PM2 уже настроен на автоматический перезапуск при ошибках.

## 🌐 Результат

После исправления:
- **Frontend**: http://46.173.17.229:3000 (работает всегда)
- **Backend**: http://46.173.17.229:3001 (работает всегда)
- **WebSocket**: ws://46.173.17.229:3001/ws (работает или fallback на HTTP)
- **Real-time синхронизация**: работает в любом случае!
