#!/bin/bash

echo "🔧 Исправление проблемы с sqlite3..."

# Переходим в директорию сервера
cd server

echo "🗑️ Удаляем старые модули sqlite3..."
rm -rf node_modules/sqlite3
rm -rf node_modules/.cache

echo "📦 Переустанавливаем sqlite3 для текущей платформы..."
npm install sqlite3 --build-from-source

# Проверяем результат
if [ $? -eq 0 ]; then
    echo "✅ sqlite3 успешно переустановлен!"
    echo "🧪 Тестируем подключение к БД..."
    node -e "
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('./malabar.db', (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к БД:', err.message);
                process.exit(1);
            } else {
                console.log('✅ Подключение к БД успешно!');
                db.close();
                process.exit(0);
            }
        });
    "
else
    echo "❌ Ошибка установки sqlite3"
    echo "🔧 Пробуем rebuild..."
    npm rebuild sqlite3
fi

echo "🎯 Готово! Теперь можете запустить ./restart-servers.sh"
