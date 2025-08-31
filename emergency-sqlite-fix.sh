#!/bin/bash

# ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ SQLITE3 И ВОССТАНОВЛЕНИЕ BACKEND

echo "🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ SQLITE3"
echo "================================="

# 1. Полная остановка всех процессов
echo "🛑 Остановка всех процессов..."
pm2 stop all
pm2 delete all

# 2. Проверка архитектуры системы
echo "🔍 Проверка системы..."
echo "Архитектура: $(uname -m)"
echo "Node.js версия: $(node --version)"
echo "NPM версия: $(npm --version)"

# 3. Полная очистка SQLite3
echo "🧹 Полная очистка SQLite3..."
cd server

# Удаление всех скомпилированных модулей
rm -rf node_modules/sqlite3/
rm -rf node_modules/.cache/
rm -rf ~/.npm/_cacache/
npm cache clean --force

# 4. Создание временного backend БЕЗ SQLite3
echo "🔧 Создание временного backend без SQLite3..."
cat > temp-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Файловое хранилище вместо SQLite
const dataFile = path.join(__dirname, 'players-data.json');

// Инициализация данных
let players = [];
try {
  if (fs.existsSync(dataFile)) {
    players = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } else {
    // Создание дефолтных игроков
    players = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      avatar: `/avatars/player${i + 1}.jpg`,
      socialLinks: { discord: '', twitter: '', instagram: '' },
      stats: { wins: 0, losses: 0, draws: 0 },
      games: [],
      isOnline: false,
      position: i + 1
    }));
    saveData();
  }
} catch (error) {
  console.error('Error loading data:', error);
  players = [];
}

function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(players, null, 2));
    console.log('Data saved to file');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    storage: 'file',
    players: players.length
  });
});

app.get('/api/players', (req, res) => {
  res.json(players);
});

app.put('/api/players', (req, res) => {
  if (Array.isArray(req.body)) {
    players = req.body;
    saveData();
    console.log(`Updated ${players.length} players`);
    res.json({ message: 'All players updated successfully' });
  } else {
    res.status(400).json({ error: 'Invalid data format' });
  }
});

app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const updatedPlayer = req.body;
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  players[playerIndex] = { ...players[playerIndex], ...updatedPlayer };
  saveData();
  
  console.log(`Updated player ${playerId}`);
  res.json({ message: 'Player updated successfully', id: playerId });
});

app.post('/api/players/:id/games', (req, res) => {
  const playerId = parseInt(req.params.id);
  const games = req.body.games;
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  players[playerIndex].games = games;
  saveData();
  
  console.log(`Updated games for player ${playerId}`);
  res.json({ message: 'Games updated successfully', id: playerId });
});

app.post('/api/players/:id/social', (req, res) => {
  const playerId = parseInt(req.params.id);
  const socialLinks = req.body.socialLinks;
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  players[playerIndex].socialLinks = socialLinks;
  saveData();
  
  console.log(`Updated social links for player ${playerId}`);
  res.json({ message: 'Social links updated successfully', id: playerId });
});

app.get('/api/users/current', (req, res) => {
  res.json({ id: -1, username: 'Guest', isLoggedIn: false });
});

app.post('/api/users/current', (req, res) => {
  res.json({ message: 'Login successful' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Temporary server running on port ${PORT}`);
  console.log(`📁 Using file storage: ${dataFile}`);
  console.log(`👥 Loaded ${players.length} players`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  saveData();
  process.exit(0);
});
EOF

# 5. Запуск временного сервера
echo "🚀 Запуск временного backend..."
pm2 start temp-server.js --name malabar-backend-temp

cd ..

# 6. Проверка и запуск frontend
echo "🖥️  Проверка frontend..."
pm2 start npm --name malabar-frontend -- start

# 7. Ожидание запуска
echo "⏳ Ожидание запуска серверов..."
sleep 10

# 8. Проверка работоспособности
echo "🔍 Проверка работоспособности..."
echo "Backend health check:"
curl -s http://localhost:3001/api/health && echo ""

echo "Players API:"
curl -s http://localhost:3001/api/players | head -100 && echo ""

echo "Frontend check:"
curl -s -I http://localhost:3000 | head -1

# 9. Проверка статуса PM2
echo ""
echo "📊 Статус PM2:"
pm2 status

# 10. Проверка портов
echo ""
echo "🔍 Порты:"
netstat -tlnp | grep -E ":(3000|3001)"

# 11. Попытка исправления SQLite3 в фоне
echo ""
echo "🔧 Попытка исправления SQLite3 в фоне..."
(
  cd server
  # Попытка переустановки с правильной архитектурой
  npm install sqlite3@5.1.6 --build-from-source --verbose > sqlite3-install.log 2>&1 &
) &

echo ""
echo "✅ ВРЕМЕННОЕ РЕШЕНИЕ АКТИВНО!"
echo ""
echo "🌐 Проверьте доступность:"
echo "1. http://vet-klinika-moscow.ru - должен работать"
echo "2. http://46.173.17.229:3000 - проверим nginx"
echo "3. http://46.173.17.229:3001/api/health - должен работать"
echo ""
echo "📋 Данные теперь хранятся в файле server/players-data.json"
echo "📋 Логи установки SQLite3: server/sqlite3-install.log"
echo ""
echo "🔧 Если нужно восстановить nginx для IP доступа:"
echo "   ./fix-all-remaining-issues.sh"
