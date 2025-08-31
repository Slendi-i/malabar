#!/bin/bash

# Исправление проблем с backend и доступностью по IP

echo "🔧 ИСПРАВЛЕНИЕ BACKEND И НАСТРОЙКА ДОСТУПА ПО IP"
echo "==============================================="

# 1. Диагностика проблемы backend
echo "🔍 Проверка логов backend (почему падает)..."
pm2 logs malabar-backend --lines 20 --nostream

echo ""
echo "📊 Статус процессов:"
pm2 status

# 2. Остановка backend для диагностики
echo "🛑 Остановка падающего backend..."
pm2 stop malabar-backend
pm2 delete malabar-backend

# 3. Тест запуска backend вручную для диагностики
echo "🧪 Тестовый запуск backend для диагностики..."
cd server

echo "Пробный запуск (5 секунд)..."
timeout 5 node server.js 2>&1 | tee ../backend-error.log

echo ""
echo "📋 Ошибки backend сохранены в backend-error.log"

# 4. Проверка и установка зависимостей
echo "📦 Проверка зависимостей backend..."
if ! npm list ws >/dev/null 2>&1; then
    echo "📦 Установка ws..."
    npm install ws
fi

# 5. Создание безопасной версии server.js без WebSocket (fallback)
echo "🔧 Создание резервной версии server.js без WebSocket..."
cp server.js server.js.with-websocket
cat > server.js.no-websocket << 'EOF'
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Database setup
const db = new sqlite3.Database('./malabar.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all players
app.get('/api/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY position ASC, id ASC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const players = rows.map(row => ({
      ...row,
      socialLinks: JSON.parse(row.socialLinks || '{}'),
      stats: JSON.parse(row.stats || '{}'),
      games: JSON.parse(row.games || '[]'),
      isOnline: Boolean(row.isOnline),
      position: row.position || row.id
    }));
    
    res.json(players);
  });
});

// Update all players (batch update)
app.put('/api/players', (req, res) => {
  const players = req.body;
  
  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'Players data must be an array' });
  }
  
  const updatePromises = players.map(player => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE players 
        SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?, position = ?
        WHERE id = ?
      `;
      
      const params = [
        player.name,
        player.avatar,
        JSON.stringify(player.socialLinks || {}),
        JSON.stringify(player.stats || {}),
        JSON.stringify(player.games || []),
        player.isOnline ? 1 : 0,
        player.position,
        player.id
      ];
      
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: player.id, changes: this.changes });
      });
    });
  });
  
  Promise.all(updatePromises)
    .then(results => {
      res.json({ message: 'All players updated successfully', results });
    })
    .catch(err => {
      console.error('Batch update error:', err);
      res.status(500).json({ error: 'Batch update failed' });
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} WITHOUT WebSocket`);
  console.log('Database initialized');
});
EOF

echo "✅ Резервная версия создана"
cd ..

# 6. Запуск backend без WebSocket
echo "🚀 Запуск backend без WebSocket..."
cd server
pm2 start server.js.no-websocket --name malabar-backend-safe
cd ..

# 7. Проверка доступности по IP
echo "🌐 Проверка доступности по IP..."
sleep 5

echo "Backend test:"
curl -s http://localhost:3001/api/health || echo "❌ Backend недоступен локально"
curl -s http://46.173.17.229:3001/api/health || echo "❌ Backend недоступен по IP"

echo ""
echo "Frontend test:"
curl -s -I http://localhost:3000 | head -1 || echo "❌ Frontend недоступен локально"
curl -s -I http://46.173.17.229:3000 | head -1 || echo "❌ Frontend недоступен по IP"

# 8. Проверка веб-сервера (nginx/apache)
echo ""
echo "🔍 Проверка веб-сервера..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx активен"
    echo "📝 Конфигурация Nginx:"
    find /etc/nginx -name "*.conf" -exec grep -l "vet-klinika-moscow\|46.173.17.229" {} \; 2>/dev/null | head -3
elif systemctl is-active --quiet apache2; then
    echo "✅ Apache активен"
    echo "📝 Конфигурация Apache:"
    find /etc/apache2 -name "*.conf" -exec grep -l "vet-klinika-moscow\|46.173.17.229" {} \; 2>/dev/null | head -3
else
    echo "❌ Веб-сервер не найден"
fi

# 9. Проверка firewall
echo ""
echo "🔥 Проверка firewall..."
ufw status | grep -E "(3000|3001)"

# 10. Создание конфигурации Nginx для доступа по IP
echo ""
echo "🔧 Создание конфигурации для доступа по IP..."
cat > /tmp/malabar-ip-access.conf << 'EOF'
server {
    listen 80;
    server_name 46.173.17.229;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Прямой доступ к портам
server {
    listen 3000;
    server_name 46.173.17.229;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

echo "📋 Конфигурация сохранена в /tmp/malabar-ip-access.conf"
echo ""
echo "🔧 Установка конфигурации Nginx..."
if [ -d "/etc/nginx/sites-available" ]; then
    sudo cp /tmp/malabar-ip-access.conf /etc/nginx/sites-available/malabar-ip
    sudo ln -sf /etc/nginx/sites-available/malabar-ip /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx сконфигурирован"
else
    echo "⚠️  Nginx не найден, скопируйте конфигурацию вручную"
fi

# 11. Статус и результаты
echo ""
echo "📊 ИТОГОВЫЙ СТАТУС:"
pm2 status

echo ""
echo "🌐 ПРОВЕРЬТЕ ДОСТУПНОСТЬ:"
echo "1. По домену: http://vet-klinika-moscow.ru"
echo "2. По IP: http://46.173.17.229:3000"
echo "3. Backend: http://46.173.17.229:3001/api/health"
echo ""
echo "📋 ЛОГИ ДЛЯ ДИАГНОСТИКИ:"
echo "Backend ошибки: cat backend-error.log"
echo "PM2 логи: pm2 logs"
echo "Nginx логи: sudo tail -f /var/log/nginx/error.log"
