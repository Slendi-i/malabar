#!/bin/bash

echo "⏹️ Остановка серверов на VPS..."

# Остановка по сохраненным PIDs
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "Остановка backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "Остановка frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
    rm .frontend.pid
fi

# Остановка всех Node.js процессов
echo "Остановка всех Node.js процессов..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Проверка что процессы остановлены
sleep 2

echo "Проверка оставшихся процессов..."
REMAINING=$(ps aux | grep -E "(node|npm)" | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️ Остались процессы Node.js:"
    ps aux | grep -E "(node|npm)" | grep -v grep
    echo ""
    echo "Принудительная остановка..."
    pkill -9 -f "node" 2>/dev/null || true
    pkill -9 -f "npm" 2>/dev/null || true
fi

echo "✅ Все серверы остановлены"
echo ""
echo "Проверка портов:"
netstat -tulpn | grep -E "(3000|3001)" || echo "Порты 3000 и 3001 свободны"
