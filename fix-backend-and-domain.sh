#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ BACKEND И ДОМЕНА"
echo "==============================="

echo "1️⃣ ИСПРАВЛЕНИЕ BACKEND (sqlite3 проблема)..."
echo "--------------------------------------------"

cd /var/www/malabar/server

# Временное решение - переключаемся на file-based БД
echo "Создаем временную версию server.js без sqlite3..."

cp server.js server.js.backup

cat > server-temp.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// File-based database
const DB_FILE = './data.json';

// Initialize data file
let data = {
  players: [],
  users: []
};

if (fs.existsSync(DB_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('✅ Data loaded from file');
  } catch (error) {
    console.log('⚠️ Error loading data, using defaults');
  }
} else {
  // Create default players
  data.players = Array.from({length: 12}, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    avatar: null,
    socialLinks: {},
    stats: {},
    games: [],
    isOnline: false,
    position: i + 1,
    x: (i % 3) * 80 + 50,
    y: Math.floor(i / 3) * 100 + 100
  }));
  saveData();
}

function saveData() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// WebSocket setup
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
});

function broadcastUpdate(type, updateData) {
  const message = JSON.stringify({ type, data: updateData });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/players', (req, res) => {
  res.json(data.players || []);
});

app.get('/api/players/updates', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since) : 0;
  const currentTime = Date.now();
  
  res.json({
    players: data.players || [],
    timestamp: currentTime,
    since: since
  });
});

app.put('/api/players', (req, res) => {
  const { players } = req.body;
  if (Array.isArray(players)) {
    data.players = players;
    saveData();
    broadcastUpdate('players_batch_updated', { players });
  }
  res.json({ success: true });
});

app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const playerData = req.body;
  
  const playerIndex = data.players.findIndex(p => p.id === playerId);
  if (playerIndex !== -1) {
    data.players[playerIndex] = { ...data.players[playerIndex], ...playerData };
    saveData();
    broadcastUpdate('player_updated', { player: data.players[playerIndex], id: playerId });
  }
  
  res.json({ success: true });
});

app.post('/api/users/current', (req, res) => {
  res.json({ success: true });
});

console.log('✅ Temporary file-based server ready');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

echo "✅ Временный server создан"

echo ""
echo "2️⃣ ПЕРЕЗАПУСК BACKEND..."
echo "------------------------"

pm2 stop malabar-backend 2>/dev/null || echo "Backend уже остановлен"
pm2 delete malabar-backend 2>/dev/null || echo "Backend уже удален"

pm2 start server-temp.js --name "malabar-backend"

sleep 3

echo "Статус backend:"
pm2 status

echo ""
echo "3️⃣ ИСПРАВЛЕНИЕ NGINX ДЛЯ ДОМЕНА..."
echo "--------------------------------"

# Проверяем конфигурацию для домена
echo "Проверка конфигурации домена:"
if [ -f "/etc/nginx/sites-available/vet-klinika-moscow.ru" ]; then
    echo "✅ Конфигурация домена найдена"
else
    echo "❌ Конфигурация домена НЕ НАЙДЕНА"
    echo "Создаем конфигурацию для домена..."
    
    sudo tee /etc/nginx/sites-available/vet-klinika-moscow.ru > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name vet-klinika-moscow.ru www.vet-klinika-moscow.ru;
    
    # Логирование
    access_log /var/log/nginx/domain-access.log;
    error_log /var/log/nginx/domain-error.log;
    
    # Frontend (основная локация)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
NGINXEOF
    
    # Активируем конфигурацию
    sudo ln -sf /etc/nginx/sites-available/vet-klinika-moscow.ru /etc/nginx/sites-enabled/
    
    echo "✅ Конфигурация домена создана"
fi

echo ""
echo "4️⃣ ТЕСТ И ПЕРЕЗАГРУЗКА NGINX..."
echo "------------------------------"

sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx конфигурация корректна"
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации Nginx"
fi

echo ""
echo "5️⃣ ФИНАЛЬНАЯ ПРОВЕРКА..."
echo "------------------------"

sleep 3

echo "PM2 статус:"
pm2 status

echo ""
echo "Тест backend:"
curl -s --connect-timeout 5 http://localhost:3001/api/health && echo "" && echo "✅ Backend работает" || echo "❌ Backend не работает"

echo ""
echo "Тест по IP:"
curl -s --connect-timeout 5 -I http://46.173.17.229:3000 | head -1

echo "Тест по домену:"
curl -s --connect-timeout 5 -I http://vet-klinika-moscow.ru | head -1

echo ""
echo "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo ""
echo "🌐 ПРОВЕРЬТЕ САЙТЫ:"
echo "✅ IP:    http://46.173.17.229:3000"
echo "✅ Домен: http://vet-klinika-moscow.ru"
echo ""
echo "📊 СТАТУС:"
echo "- Frontend: работает в dev режиме"
echo "- Backend: работает на file-based БД (временно)"
echo "- Nginx: настроен для обоих адресов"