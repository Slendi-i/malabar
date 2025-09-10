# 🔍 ДИАГНОСТИКА HTTP 404 при перетаскивании фишек

## ❌ Проблема:
```
Error: HTTP error! status: 404
Source: services/apiService.js (16:15) @ ApiService.fetchWithErrorHandling
```

## 🔧 Шаги диагностики:

### 1. **Перезапустите сервер** (ВАЖНО!)
Новый PATCH endpoint мог не загрузиться. Перезапустите серверы:
```bash
./restart-servers.sh
```

### 2. **Проверьте что сервер запущен и доступен:**
```bash
curl http://localhost:3001/api/health
# Должен вернуть: {"status":"OK","timestamp":"..."}
```

### 3. **Проверьте игроков в базе данных:**
```bash
curl http://localhost:3001/api/debug/players
# Должен показать список игроков с их ID
```

### 4. **Запустите тестовый скрипт:**
```bash
node test-coordinates-endpoint.js
```

Он автоматически протестирует:
- ✅ Health check
- ✅ Наличие игроков в БД  
- ✅ Обновление координат через PATCH endpoint
- ✅ Проверку результата

### 5. **Проверьте логи в браузере:**

Откройте DevTools → Console и попробуйте перетащить фишку.

**Должны увидеть:**
```
🎯 API: Updating coordinates for player X: (123, 456)
📡 API: Sending PATCH request to: http://localhost:3001/api/players/X/coordinates
✅ API: Coordinates updated successfully: {...}
```

**Если видите ошибку:**
```
❌ API: Failed to update coordinates for player X: HTTP error! status: 404
📍 API: URL was: http://localhost:3001/api/players/X/coordinates
📦 API: Payload was: {x: 123, y: 456}
```

### 6. **Проверьте логи сервера:**

В терминале где запущен backend должны быть сообщения:
```
🎯 SERVER: Received PATCH request to /api/players/X/coordinates
📦 SERVER: Request body: {x: 123, y: 456}
✅ SERVER: Player X exists, updating coordinates...
✅ SERVER: Coordinates updated for player X, affected rows: 1
```

## 🎯 Возможные причины и решения:

### Причина 1: Сервер не перезапущен
**Решение:** `./restart-servers.sh`

### Причина 2: Неправильный порт/URL  
**Проверка:** `curl http://localhost:3001/api/health`
**Решение:** Убедитесь что backend запущен на порту 3001

### Причина 3: Игрок не существует в БД
**Проверка:** `curl http://localhost:3001/api/debug/players`
**Решение:** Проверьте ID игрока, возможно передается неправильный ID

### Причина 4: Проблема с routing
**Проверка:** Найти в логах сервера строку `🎯 SERVER: Received PATCH request...`
**Решение:** Если не появляется - проблема в маршрутизации

### Причина 5: Cors или другие проблемы сети
**Проверка:** Запустить `node test-coordinates-endpoint.js`
**Решение:** Если тест проходит, но браузер не работает - проблема в CORS

## ✅ После исправления:

Перетаскивание фишек должно работать без ошибок, а в логах должны появляться сообщения об успешном обновлении координат.

**Готово к тестированию!** 🚀
