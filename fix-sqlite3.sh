#!/bin/bash

echo "🔧 Исправление проблемы с sqlite3 (invalid ELF header)..."

# Переходим в директорию сервера
cd server || { echo "❌ Не удалось перейти в директорию server"; exit 1; }

echo "🗑️ Удаляем старые модули sqlite3..."
rm -rf node_modules/sqlite3
rm -rf node_modules/.cache || true

echo "📦 Переустанавливаем sqlite3 для текущей платформы..."
npm install --no-audit --no-fund sqlite3 --build-from-source

# Проверяем результат
if [ $? -eq 0 ]; then
    echo "✅ sqlite3 успешно переустановлен!"
    echo "🧪 Тестируем подключение к БД..."
    node -e "
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, 'malabar.db');
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к БД:', err.message);
                process.exit(1);
            } else {
                console.log('✅ Подключение к БД успешно!', dbPath);
                db.close();
                process.exit(0);
            }
        });
    "
else
    echo "❌ Ошибка установки sqlite3"
    echo "🔧 Пробуем rebuild..."
    npm rebuild sqlite3 || exit 1
fi

echo "🎯 Готово! Теперь можно запускать PM2 через ./fix-and-restart-server.sh"
