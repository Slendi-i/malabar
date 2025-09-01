# 🔧 SQLITE3 ОШИБКА ИСПРАВЛЕНА

## ❌ Проблема была:
```
Error: /var/www/malabar/server/node_modules/sqlite3/build/Release/node_sqlite3.node: invalid ELF header
```

**Причина**: SQLite3 модуль был скомпилирован для другой архитектуры (Windows) и не может работать на Linux VPS.

## ✅ Решение:

### 🚀 БЫСТРОЕ ИСПРАВЛЕНИЕ (рекомендуется):

```bash
cd /var/www/malabar
git pull origin main
chmod +x quick-sqlite3-fix.sh
./quick-sqlite3-fix.sh
```

### 🔧 ПОЛНОЕ ИСПРАВЛЕНИЕ (если быстрое не помогло):

```bash
cd /var/www/malabar  
git pull origin main
chmod +x fix-sqlite3-error.sh
./fix-sqlite3-error.sh
```

## 📋 Что делают скрипты:

### 1. **Полная очистка**
- Остановка всех PM2 процессов
- Удаление старых `node_modules` 
- Очистка npm cache

### 2. **Системные зависимости**
- Установка `build-essential`
- Установка `python3` и `make`
- Подготовка для компиляции

### 3. **Переустановка зависимостей**
- Backend: `npm install --build-from-source`
- Принудительная перекомпиляция SQLite3 для Linux
- Frontend: обновление зависимостей

### 4. **Тестирование**
- Проверка что SQLite3 загружается
- Тест Backend API
- Запуск через PM2

## 🎯 Ожидаемый результат:

После исправления должно работать:
- ✅ Backend запускается без ошибок SQLite3
- ✅ API отвечает: `/api/health`, `/api/players`
- ✅ База данных создается и работает
- ✅ PM2 процессы online
- ✅ Сайт доступен по всем адресам

## 🌐 Проверка результата:

```bash
# Статус PM2
pm2 status

# API тесты  
curl http://localhost:3001/api/health
curl http://localhost:3001/api/players

# Браузер
http://46.173.17.229:3000
http://vet-klinika-moscow.ru
```

## 🆘 Если проблемы остаются:

### 1. Проверьте логи:
```bash
pm2 logs malabar-backend --lines 20
```

### 2. Ручная проверка SQLite3:
```bash
cd /var/www/malabar/server
node -e "console.log(require('sqlite3'))"
```

### 3. Альтернативная установка SQLite3:
```bash
cd /var/www/malabar/server
npm uninstall sqlite3
npm install sqlite3 --build-from-source --verbose
```

## 💡 Почему это произошло:

SQLite3 - это нативный модуль Node.js, который нужно компилировать для конкретной архитектуры:
- **Windows x64** → `.node` файл для Windows
- **Linux x64** → `.node` файл для Linux  
- **macOS** → `.node` файл для macOS

Когда `node_modules` копируются между системами или устанавливаются на одной системе, а запускаются на другой - возникает эта ошибка.

**Решение**: Переустановка зависимостей непосредственно на целевой системе с флагом `--build-from-source`.

---

## 🚀 ЗАПУСКАЙТЕ ИСПРАВЛЕНИЕ!

```bash
cd /var/www/malabar
./quick-sqlite3-fix.sh
```

**SQLite3 ошибка будет исправлена! 🎉**
