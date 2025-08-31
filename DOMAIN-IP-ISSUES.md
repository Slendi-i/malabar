# 🌐 Проблемы с доменом и IP доступом

## Текущая ситуация
- ✅ Работает: http://vet-klinika-moscow.ru
- ❌ Не работает: http://46.173.17.229:3000
- ❌ Backend падает (errored, 15 перезапусков)

## Причины проблем

### 1. Backend падает из-за WebSocket ошибок
```
│ 0  │ malabar-backend │ errored │ 0 │ 0 │ 15 │
```

### 2. Доступ только через домен
Это означает что:
- Настроен Nginx/Apache проксирующий домен на приложение
- Прямой доступ к портам заблокирован или не настроен

## 🔧 Решения

### Быстрое решение:
```bash
chmod +x quick-domain-fix.sh
./quick-domain-fix.sh
```

### Полное решение:
```bash
chmod +x fix-backend-and-domain.sh
./fix-backend-and-domain.sh
```

## 📋 Ручное исправление

### 1. Исправление backend
```bash
# Остановка падающего процесса
pm2 stop malabar-backend
pm2 delete malabar-backend

# Диагностика ошибок
cd server
node server.js  # Посмотреть ошибки

# Установка зависимостей
npm install ws

# Запуск простой версии
pm2 start server.js --name malabar-backend
```

### 2. Настройка доступа по IP

#### Вариант A: Через Nginx
```bash
# Создать конфигурацию
sudo nano /etc/nginx/sites-available/malabar-ip

# Добавить:
server {
    listen 80;
    server_name 46.173.17.229;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}

# Активировать
sudo ln -s /etc/nginx/sites-available/malabar-ip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Вариант B: Прямой доступ к портам
```bash
# Открыть порты в firewall
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Проверить привязку приложений
netstat -tlnp | grep -E ":(3000|3001)"
```

### 3. Проверка результата
```bash
# Тестирование всех вариантов доступа
curl http://vet-klinika-moscow.ru
curl http://46.173.17.229:3000
curl http://46.173.17.229:3001/api/health

# Статус процессов
pm2 status
```

## 🐛 Диагностика WebSocket проблем

### Наиболее вероятные ошибки:
1. **Модуль ws не установлен**
2. **Синтаксические ошибки в коде**
3. **Конфликт портов**
4. **Проблемы с базой данных**

### Просмотр ошибок:
```bash
pm2 logs malabar-backend --lines 50
```

### Тест без WebSocket:
```bash
# Создать простую версию server.js без WebSocket
# Запустить и проверить
```

## 🎯 Ожидаемый результат

После исправления должно работать:
- ✅ http://vet-klinika-moscow.ru
- ✅ http://46.173.17.229:3000  
- ✅ http://46.173.17.229:3001/api/health
- ✅ Backend стабильно работает без ошибок

## 📞 Поддержка

Если проблемы остаются:
1. Запустите `fix-backend-and-domain.sh`
2. Сохраните вывод команды `pm2 logs`
3. Проверьте логи веб-сервера: `sudo tail -f /var/log/nginx/error.log`
