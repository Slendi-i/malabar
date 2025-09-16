#!/bin/bash

echo "🔍 ДИАГНОСТИКА ОШИБКИ PM2 СЕРВЕРА"
echo "================================="

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 PM2 List подробно:"
pm2 list

echo ""
echo "🔍 Логи malabar-server (последние 50 строк):"
pm2 logs malabar-server --lines 50

echo ""
echo "❌ Ошибки malabar-server (последние 30 строк):"
pm2 logs malabar-server --err --lines 30

echo ""
echo "📍 Информация о процессе:"
pm2 describe malabar-server

echo ""
echo "🔧 Проверка порта 3001:"
lsof -i :3001 || echo "Порт 3001 свободен"

echo ""
echo "💾 Проверка памяти:"
free -h

echo ""
echo "💿 Проверка диска:"
df -h

echo ""
echo "🏠 Проверка рабочей директории:"
pwd
ls -la

echo ""
echo "📁 Проверка server директории:"
ls -la server/

echo ""
echo "🗃️ Проверка базы данных:"
ls -la server/malabar.db || echo "База данных отсутствует"
ls -la malabar.db || echo "База данных в корне отсутствует"
