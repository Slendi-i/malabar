#!/bin/bash

# Исправление всех оставшихся проблем

echo "🔧 ИСПРАВЛЕНИЕ ВСЕХ ОСТАВШИХСЯ ПРОБЛЕМ"
echo "======================================"

# 1. ИСПРАВЛЕНИЕ NGINX 500 ОШИБКИ
echo "🌐 1. ИСПРАВЛЕНИЕ NGINX 500 ОШИБКИ..."
echo "------------------------------------"

# Проверка логов nginx
echo "📋 Проверка логов nginx..."
echo "Последние ошибки nginx:"
sudo tail -20 /var/log/nginx/error.log | grep -E "(error|crit|alert|emerg)" || echo "Нет критических ошибок в логах"

# Проверка конфигурации для IP
echo ""
echo "📝 Проверка конфигурации nginx для IP..."
if [ -f "/etc/nginx/sites-enabled/malabar-ip" ]; then
    echo "✅ Конфигурация malabar-ip найдена"
    sudo nginx -t
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка в конфигурации nginx"
        sudo nginx -t 2>&1
    fi
else
    echo "❌ Конфигурация malabar-ip не найдена, создаем..."
    
    # Создание правильной конфигурации nginx
    sudo cat > /etc/nginx/sites-available/malabar-ip << 'EOF'
server {
    listen 80;
    server_name 46.173.17.229;
    
    # Логирование для диагностики
    access_log /var/log/nginx/malabar-ip-access.log;
    error_log /var/log/nginx/malabar-ip-error.log;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket специфичные настройки
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Активация конфигурации
    sudo ln -sf /etc/nginx/sites-available/malabar-ip /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx конфигурация обновлена"
fi

# 2. ПРОВЕРКА ПРОЦЕССОВ
echo ""
echo "🚀 2. ПРОВЕРКА ПРОЦЕССОВ..."
echo "---------------------------"
pm2 status

# Проверка что фронтенд отвечает локально
echo ""
echo "🔍 Тест локального доступа к фронтенду:"
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null; then
    echo "✅ Frontend отвечает локально на порту 3000"
else
    echo "❌ Frontend НЕ отвечает локально на порту 3000"
    echo "Перезапускаем frontend..."
    pm2 restart malabar-frontend
    sleep 3
fi

# Тест backend
echo ""
echo "🔍 Тест backend:"
curl -s http://localhost:3001/api/health || echo "❌ Backend не отвечает"

# 3. ИСПРАВЛЕНИЕ СОХРАНЕНИЯ ДАННЫХ ПРОФИЛЕЙ
echo ""
echo "💾 3. ИСПРАВЛЕНИЕ СОХРАНЕНИЯ ДАННЫХ ПРОФИЛЕЙ..."
echo "---------------------------------------------"

# Проверка API endpoints
echo "🔍 Проверка API endpoints..."
curl -s http://localhost:3001/api/players | head -200 | tail -1

# Создание расширенного API для профилей
cd server
echo "🔧 Добавление endpoints для профилей..."

# Добавляем новые API endpoints в конец server.js
cat >> server.js << 'EOF'

// Update individual player by ID (для профилей)
app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const updatedPlayer = req.body;
  
  console.log(`Updating player ${playerId}:`, updatedPlayer);
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const sql = `
      UPDATE players 
      SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?, position = ?
      WHERE id = ?
    `;
    
    const params = [
      updatedPlayer.name || player.name,
      updatedPlayer.avatar || player.avatar,
      JSON.stringify(updatedPlayer.socialLinks || JSON.parse(player.socialLinks || '{}')),
      JSON.stringify(updatedPlayer.stats || JSON.parse(player.stats || '{}')),
      JSON.stringify(updatedPlayer.games || JSON.parse(player.games || '[]')),
      updatedPlayer.isOnline !== undefined ? (updatedPlayer.isOnline ? 1 : 0) : player.isOnline,
      updatedPlayer.position || player.position,
      playerId
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed' });
      }
      
      console.log(`Player ${playerId} updated successfully`);
      res.json({ message: 'Player updated successfully', id: playerId });
    });
  });
});

// Специальный endpoint для сохранения игр
app.post('/api/players/:id/games', (req, res) => {
  const playerId = parseInt(req.params.id);
  const games = req.body.games;
  
  console.log(`Updating games for player ${playerId}:`, games);
  
  const sql = 'UPDATE players SET games = ? WHERE id = ?';
  db.run(sql, [JSON.stringify(games), playerId], function(err) {
    if (err) {
      console.error('Games update error:', err);
      return res.status(500).json({ error: 'Games update failed' });
    }
    
    console.log(`Games updated for player ${playerId}`);
    res.json({ message: 'Games updated successfully', id: playerId });
  });
});

// Специальный endpoint для социальных сетей
app.post('/api/players/:id/social', (req, res) => {
  const playerId = parseInt(req.params.id);
  const socialLinks = req.body.socialLinks;
  
  console.log(`Updating social links for player ${playerId}:`, socialLinks);
  
  const sql = 'UPDATE players SET socialLinks = ? WHERE id = ?';
  db.run(sql, [JSON.stringify(socialLinks), playerId], function(err) {
    if (err) {
      console.error('Social links update error:', err);
      return res.status(500).json({ error: 'Social links update failed' });
    }
    
    console.log(`Social links updated for player ${playerId}`);
    res.json({ message: 'Social links updated successfully', id: playerId });
  });
});
EOF

cd ..

# Перезапуск backend с новыми endpoints
echo "🔄 Перезапуск backend с новыми endpoints..."
pm2 restart malabar-backend

# 4. ФИНАЛЬНАЯ ПРОВЕРКА
echo ""
echo "🏁 4. ФИНАЛЬНАЯ ПРОВЕРКА..."
echo "--------------------------"
sleep 5

echo "📊 Статус процессов:"
pm2 status

echo ""
echo "🌐 Проверка доступности:"
echo "1. Домен: http://vet-klinika-moscow.ru"
if curl -s --connect-timeout 10 http://vet-klinika-moscow.ru > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает"
fi

echo "2. IP адрес: http://46.173.17.229:3000"
if curl -s --connect-timeout 10 http://46.173.17.229:3000 > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает - проверьте логи: sudo tail -f /var/log/nginx/malabar-ip-error.log"
fi

echo "3. Backend API: http://46.173.17.229:3001/api/health"
if curl -s --connect-timeout 10 http://46.173.17.229:3001/api/health > /dev/null; then
    echo "   ✅ Работает"
else
    echo "   ❌ Не работает"
fi

echo ""
echo "📋 ЛОГИ ДЛЯ ДИАГНОСТИКИ:"
echo "Nginx ошибки: sudo tail -f /var/log/nginx/malabar-ip-error.log"
echo "PM2 логи: pm2 logs"
echo "Backend логи: pm2 logs malabar-backend"

echo ""
echo "✅ ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ!"
echo "Теперь нужно обновить frontend код для корректной работы перетаскивания."
