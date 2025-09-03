@echo off
echo 🔧 Исправление ошибки Next.js "missing required error components"...
echo.

echo ⏹️ Остановка всех процессов...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul
echo.

echo 🧹 Очистка кэша Next.js...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo.

echo 📦 Проверка зависимостей...
if not exist node_modules (
    echo Установка зависимостей...
    npm install
) else (
    echo Зависимости уже установлены
)
echo.

echo 🚀 Запуск backend сервера...
start "Backend Server" cmd /k "cd server && node server.js"
echo.

echo ⏳ Ожидание запуска backend...
timeout /t 3 /nobreak >nul
echo.

echo 🚀 Запуск frontend сервера...
start "Frontend Server" cmd /k "npm run dev"
echo.

echo ⏳ Ожидание запуска frontend...
timeout /t 5 /nobreak >nul
echo.

echo 🧪 Проверка серверов...
echo Backend: http://localhost:3001/api/health
echo Frontend: http://localhost:3000
echo.

echo ✅ Готово! Откройте http://localhost:3000 в браузере
echo.
echo 📝 Если ошибка остается:
echo 1. Очистите кэш браузера (Ctrl+Shift+Delete)
echo 2. Проверьте консоль браузера (F12)
echo 3. Проверьте логи в открытых терминалах
echo.
pause
