# 🔄 МИГРАЦИЯ ДОМЕНА И ПЕРЕХОД НА SSL

## 📋 Описание изменений

Выполнена полная миграция с домена `vet-klinika-moscow.ru` на `malabar-event.ru` с переходом на HTTPS и настройкой редиректов.

## ✅ Выполненные изменения

### 1. **Обновление серверной конфигурации** (`server/server.js`)

- ✅ Обновлены CORS настройки для нового домена
- ✅ Добавлена поддержка HTTPS
- ✅ Сохранена обратная совместимость со старым доменом
- ✅ Добавлены все варианты URL (с www и без)

```javascript
origin: [
  'https://malabar-event.ru:3000',
  'https://malabar-event.ru',
  'http://malabar-event.ru:3000',
  'http://malabar-event.ru',
  'https://www.malabar-event.ru:3000',
  'https://www.malabar-event.ru',
  // Старый домен для обратной совместимости
  'http://vet-klinika-moscow.ru:3000',
  'http://vet-klinika-moscow.ru',
  // ... другие URL
]
```

### 2. **Обновление API конфигурации** (`config/api.js`)

- ✅ Приоритет новому домену с HTTPS
- ✅ Автоматический редирект со старого домена
- ✅ Редирект с www на без www
- ✅ Принудительный HTTPS для основного домена

```javascript
// Новая логика определения API URL
if (bareHost === 'malabar-event.ru') {
  const apiUrl = `https://malabar-event.ru:3001`;
  return apiUrl;
}

// Редирект с www на без www
if (host.startsWith('www.malabar-event.ru')) {
  window.location.replace('https://malabar-event.ru' + window.location.pathname);
  return;
}
```

### 3. **Настройка редиректов на уровне приложения** (`pages/_app.js`)

- ✅ Автоматический редирект со старого домена на новый
- ✅ Редирект с www на без www
- ✅ Принудительный HTTPS для основного домена

```javascript
// Редирект со старого домена на новый
if (hostname.includes('vet-klinika-moscow.ru')) {
  window.location.replace(`https://malabar-event.ru${pathname}${search}`);
}
// Редирект с www на без www
else if (hostname === 'www.malabar-event.ru') {
  window.location.replace(`https://malabar-event.ru${pathname}${search}`);
}
```

### 4. **Конфигурация Next.js** (`next.config.js`)

- ✅ Добавлены HTTP заголовки безопасности для HTTPS
- ✅ Настроены серверные редиректы
- ✅ Конфигурация асетов для продакшена

```javascript
// Заголовки безопасности
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' }
    ]
  }];
}

// Серверные редиректы
async redirects() {
  return [
    // www.malabar-event.ru → malabar-event.ru
    // vet-klinika-moscow.ru → malabar-event.ru
    // www.vet-klinika-moscow.ru → malabar-event.ru
  ];
}
```

### 5. **Обновление WebSocket конфигурации**

- ✅ Автоматическая адаптация WebSocket URL (HTTP→WS, HTTPS→WSS)
- ✅ Обновлены тестовые файлы для использования нового домена
- ✅ Правильная конфигурация портов для WebSocket

```javascript
// Автоматическое определение WebSocket протокола
WEBSOCKET: API_BASE_URL.replace('http', 'ws') + '/ws'
// https://malabar-event.ru:3001 → wss://malabar-event.ru:3001/ws
```

### 6. **Обновление диагностических инструментов**

- ✅ Обновлены конфигурации в `debug-connection.js`
- ✅ Добавлено тестирование старого и нового домена
- ✅ Обновлены все тестовые скрипты

## 🔧 Конфигурация на сервере

### Требования для полной работы:

1. **SSL сертификат** для домена `malabar-event.ru`
   ```bash
   # Установка certbot (если еще не установлен)
   sudo apt install certbot
   
   # Получение SSL сертификата
   sudo certbot certonly --standalone -d malabar-event.ru
   ```

2. **Nginx конфигурация** для редиректов и SSL
   ```nginx
   # Редирект с www на без www
   server {
       listen 80;
       listen 443 ssl;
       server_name www.malabar-event.ru;
       ssl_certificate /etc/letsencrypt/live/malabar-event.ru/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/malabar-event.ru/privkey.pem;
       return 301 https://malabar-event.ru$request_uri;
   }
   
   # Редирект со старого домена
   server {
       listen 80;
       listen 443 ssl;
       server_name vet-klinika-moscow.ru www.vet-klinika-moscow.ru;
       return 301 https://malabar-event.ru$request_uri;
   }
   
   # Основной сайт
   server {
       listen 80;
       server_name malabar-event.ru;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name malabar-event.ru;
       
       ssl_certificate /etc/letsencrypt/live/malabar-event.ru/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/malabar-event.ru/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       location /ws {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Обновление DNS записей**
   ```
   A    malabar-event.ru        46.173.17.229
   A    www.malabar-event.ru    46.173.17.229
   ```

## 🚀 Инструкции по развертыванию

### 1. Остановить старые службы
```bash
pm2 stop all
sudo systemctl stop nginx
```

### 2. Обновить код
```bash
cd /path/to/malabar
git pull origin main
npm install
cd server && npm install
```

### 3. Настроить SSL сертификат
```bash
sudo certbot certonly --standalone -d malabar-event.ru
```

### 4. Обновить конфигурацию Nginx
```bash
sudo nano /etc/nginx/sites-available/malabar
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Запустить службы
```bash
pm2 start ecosystem.config.js
pm2 save
```

## 🧪 Тестирование

### Проверка редиректов:
```bash
# Тест редиректа с www
curl -I https://www.malabar-event.ru

# Тест редиректа со старого домена
curl -I http://vet-klinika-moscow.ru

# Тест основного домена
curl -I https://malabar-event.ru
```

### Проверка API:
```bash
# Health check
curl https://malabar-event.ru:3001/api/health

# Проверка игроков
curl https://malabar-event.ru:3001/api/players
```

### Проверка WebSocket:
```bash
# Запуск диагностики
node debug-connection.js
```

## 📊 Преимущества миграции

- ✅ **SSL/TLS шифрование** для безопасности
- ✅ **SEO улучшения** с HTTPS
- ✅ **Современные стандарты** безопасности
- ✅ **Автоматические редиректы** для пользователей
- ✅ **Обратная совместимость** со старыми ссылками
- ✅ **Лучшая производительность** с HTTP/2

## ⚠️ Важные замечания

1. **Обратная совместимость**: Старые ссылки продолжают работать через редиректы
2. **Постепенный переход**: Можно тестировать новый домен параллельно со старым
3. **SSL сертификат**: Требуется действующий SSL сертификат для домена
4. **DNS пропагация**: Может потребоваться время для обновления DNS записей

---

**Создано:** 23 сентября 2025  
**Статус:** ✅ Готово к развертыванию  
**Автор:** AI Assistant
