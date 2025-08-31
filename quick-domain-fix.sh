#!/bin/bash

# Быстрое исправление доступа по IP и домену

echo "⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ ДОСТУПА"
echo "=============================="

# 1. Остановка падающего backend
pm2 stop malabar-backend 2>/dev/null || true
pm2 delete malabar-backend 2>/dev/null || true

# 2. Запуск простого backend без WebSocket
echo "🚀 Запуск простого backend..."
cd server

# Создаем минимальный server.js
cat > simple-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple backend working' });
});

app.get('/api/players', (req, res) => {
  res.json([
    { id: 1, name: 'Player 1', position: 1 },
    { id: 2, name: 'Player 2', position: 2 }
  ]);
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Simple backend running on port 3001');
});
EOF

pm2 start simple-server.js --name malabar-backend-simple
cd ..

# 3. Открытие портов в firewall
echo "🔥 Открытие портов..."
sudo ufw allow 3000/tcp 2>/dev/null || true
sudo ufw allow 3001/tcp 2>/dev/null || true

# 4. Проверка доступности
sleep 3
echo "🔍 Проверка..."

echo "Backend:"
curl -s http://localhost:3001/api/health
echo ""

echo "Внешний доступ к backend:"
curl -s http://46.173.17.229:3001/api/health
echo ""

echo "Frontend:"
curl -s -I http://46.173.17.229:3000 | head -1

echo ""
echo "📊 PM2 статус:"
pm2 status

echo ""
echo "🌐 Тестируйте:"
echo "1. http://vet-klinika-moscow.ru (должен работать)"
echo "2. http://46.173.17.229:3000 (должен работать)"
echo "3. http://46.173.17.229:3001/api/health (должен работать)"
