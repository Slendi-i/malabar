#!/bin/bash

# Быстрая проверка состояния сервера

echo "🔍 БЫСТРАЯ ДИАГНОСТИКА СЕРВЕРА"
echo "=============================="

echo "📊 PM2 процессы:"
pm2 status || echo "❌ PM2 не отвечает"

echo ""
echo "🔍 Порты:"
echo "Порт 3000 (Frontend):"
netstat -tlnp | grep ":3000" || echo "❌ Ничего не слушает на 3000"

echo "Порт 3001 (Backend):"
netstat -tlnp | grep ":3001" || echo "❌ Ничего не слушает на 3001"

echo ""
echo "🌐 HTTP проверки:"
echo "Backend health:"
curl -s --connect-timeout 5 http://localhost:3001/api/health || echo "❌ Backend недоступен"

echo ""
echo "Frontend:"
curl -s --connect-timeout 5 -I http://localhost:3000 | head -1 || echo "❌ Frontend недоступен"

echo ""
echo "🔍 Node.js процессы:"
ps aux | grep node | grep -v grep

echo ""
echo "📋 Последние логи PM2:"
pm2 logs --lines 10 --nostream 2>/dev/null || echo "❌ Нет логов PM2"

echo ""
echo "💾 Дисковое пространство:"
df -h | head -2

echo ""
echo "🧠 Память:"
free -h

echo ""
echo "⚡ БЫСТРЫЕ КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ:"
echo "1. Полный перезапуск: ./emergency-restart.sh"
echo "2. Перезапуск PM2: pm2 restart all"
echo "3. Просмотр логов: pm2 logs"
echo "4. Убить процессы: pm2 delete all && pm2 kill"
