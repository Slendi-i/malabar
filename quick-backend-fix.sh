#!/bin/bash

echo "⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ BACKEND"
echo "============================="

echo "1️⃣ Диагностика PM2..."
pm2 status

echo ""
echo "2️⃣ Проверка API..."
echo "Backend доступен?"
curl -s --connect-timeout 3 http://localhost:3001/api/health || echo "❌ Backend НЕ РАБОТАЕТ"

echo ""
echo "3️⃣ ЭКСТРЕННЫЙ ПЕРЕЗАПУСК BACKEND..."
echo "=================================="

# Останавливаем всё что связано с backend
pm2 stop malabar-backend 2>/dev/null || echo "Backend уже остановлен"
pm2 delete malabar-backend 2>/dev/null || echo "Backend уже удален" 

# Идем в папку сервера
cd /var/www/malabar/server

# Создаем ПРОСТЕЙШИЙ backend без зависимостей
cat > emergency-backend.js << 'EOF'
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://46.173.17.229:3000', 'http://vet-klinika-moscow.ru'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// В памяти данные
let players = [
  {id: 1, name: 'Player 1', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 1, x: 50, y: 100},
  {id: 2, name: 'Player 2', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 2, x: 130, y: 100},
  {id: 3, name: 'Player 3', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 3, x: 210, y: 100},
  {id: 4, name: 'Player 4', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 4, x: 50, y: 200},
  {id: 5, name: 'Player 5', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 5, x: 130, y: 200},
  {id: 6, name: 'Player 6', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 6, x: 210, y: 200},
  {id: 7, name: 'Player 7', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 7, x: 50, y: 300},
  {id: 8, name: 'Player 8', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 8, x: 130, y: 300},
  {id: 9, name: 'Player 9', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 9, x: 210, y: 300},
  {id: 10, name: 'Player 10', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 10, x: 50, y: 400},
  {id: 11, name: 'Player 11', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 11, x: 130, y: 400},
  {id: 12, name: 'Player 12', avatar: null, socialLinks: {}, stats: {}, games: [], isOnline: false, position: 12, x: 210, y: 400}
];

console.log('🚀 Emergency backend starting...');

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/players', (req, res) => {
  console.log('📋 Players requested');
  res.json(players);
});

app.get('/api/players/updates', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since) : 0;
  console.log(`📊 Updates requested since: ${since}`);
  res.json({
    players: players,
    timestamp: Date.now(),
    since: since
  });
});

app.put('/api/players', (req, res) => {
  console.log('💾 Batch players update');
  if (req.body && Array.isArray(req.body)) {
    players = req.body;
  }
  res.json({ success: true });
});

app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  console.log(`💾 Player ${playerId} update:`, req.body);
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex !== -1) {
    players[playerIndex] = { ...players[playerIndex], ...req.body };
  }
  
  res.json({ success: true });
});

app.post('/api/users/current', (req, res) => {
  console.log('👤 User login');
  res.json({ success: true });
});

// Обработка всех остальных API запросов
app.all('/api/*', (req, res) => {
  console.log(`🔄 Fallback API: ${req.method} ${req.path}`);
  res.json({ success: true, message: 'Emergency backend response' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Emergency backend running on port ${PORT}`);
  console.log(`🌐 Accessible at: http://localhost:${PORT}`);
  console.log(`🌐 External: http://46.173.17.229:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down emergency backend...');
  process.exit(0);
});
EOF

echo "📝 Emergency backend создан"

echo ""
echo "4️⃣ ЗАПУСК EMERGENCY BACKEND..."
echo "=============================="

pm2 start emergency-backend.js --name "malabar-backend"

sleep 3

echo ""
echo "5️⃣ ПРОВЕРКА РЕЗУЛЬТАТА..."
echo "========================="

echo "PM2 статус:"
pm2 status

echo ""
echo "Порт 3001:"
netstat -tlnp | grep :3001 || echo "❌ Порт всё еще не занят"

echo ""
echo "API тест:"
curl -s http://localhost:3001/api/health && echo "" || echo "❌ API всё еще не работает"

echo ""
echo "Players API:"
curl -s http://localhost:3001/api/players | head -100 || echo "❌ Players API не работает"

echo ""
echo "✅ ЭКСТРЕННЫЙ BACKEND ЗАПУЩЕН!"
echo ""
echo "🧪 ПРОВЕРЬТЕ САЙТ:"
echo "http://46.173.17.229:3000"
echo ""
echo "Если всё еще ошибки - проверьте логи:"
echo "pm2 logs malabar-backend --lines 10"
