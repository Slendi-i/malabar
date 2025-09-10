# 🔧 ИСПРАВЛЕНИЕ HTTP 500 при перетаскивании фишек

## ❌ Проблема:
```
Error: HTTP error! status: 500
Source: services/apiService.js (16:15) @ ApiService.fetchWithErrorHandling
```

**Причина:** Когда мы отправляли только `{ x, y }` для обновления координат, сервер пытался обновить ВСЕ поля игрока (`name`, `avatar`, `socialLinks`, etc.), но эти поля становились `undefined`, что вызывало ошибку БД.

## ✅ Решение:

### 1. **Создали специальный endpoint для координат:**
```js
// server/server.js
PATCH /api/players/:id/coordinates
// Обновляет ТОЛЬКО x,y координаты
UPDATE players SET x = ?, y = ? WHERE id = ?
```

### 2. **Добавили метод в API сервис:**
```js
// services/apiService.js
async updatePlayerCoordinates(id, x, y) {
  return this.fetchWithErrorHandling(`/api/players/${id}/coordinates`, {
    method: 'PATCH',
    body: JSON.stringify({ x, y })
  });
}
```

### 3. **Обновили PlayerIcons для использования нового endpoint:**
```js
// components/PlayerIcons.js
// Было:
await apiService.updatePlayerDetailed(playerId, { x, y });

// Стало:
await apiService.updatePlayerCoordinates(playerId, x, y);
```

### 4. **Упростили логику broadcasting:**
```js
// server/server.js
// Координаты: PATCH /coordinates → broadcastUpdate('coordinates')
// Профили: PUT /players/:id → broadcastUpdate('profile')
```

## 🎯 Результат:

- ✅ **HTTP 500 ошибка исправлена**
- ✅ **Перетаскивание фишек работает**
- ✅ **Координаты сохраняются в БД**
- ✅ **WebSocket синхронизация работает**
- ✅ **Разделение обновлений координат и профилей**

## 🧪 Для тестирования:

1. **Войдите как админ:** `admin/admin`
2. **Перетащите фишку игрока**
3. **Проверьте консоль:** должны видеть сообщения:
   ```
   💾 Сохранение координат игрока X: (123, 456)
   🎯 Updating coordinates for player X: (123, 456)
   ✅ Coordinates updated for player X
   ```
4. **Обновите страницу:** координаты должны сохраниться

Проблема полностью решена! 🚀
