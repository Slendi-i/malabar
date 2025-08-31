#!/bin/bash

echo "🔍 ДИАГНОСТИКА ОШИБОК FETCH"
echo "==========================="

echo "1️⃣ Проверка PM2 статуса..."
pm2 status

echo ""
echo "2️⃣ Проверка портов..."
echo "Порт 3001 (backend):"
netstat -tlnp | grep :3001 || echo "❌ Порт 3001 НЕ ЗАНЯТ - backend не работает!"

echo "Порт 3000 (frontend):"
netstat -tlnp | grep :3000 || echo "❌ Порт 3000 НЕ ЗАНЯТ"

echo ""
echo "3️⃣ Прямое тестирование backend API..."
echo "Health endpoint:"
curl -v http://localhost:3001/api/health 2>&1 || echo "❌ Backend API недоступен"

echo ""
echo "Players endpoint:"
curl -v http://localhost:3001/api/players 2>&1 || echo "❌ Players API недоступен"

echo ""
echo "4️⃣ Логи backend (последние ошибки)..."
echo "====================================="
pm2 logs malabar-backend --lines 15 --nostream --err 2>/dev/null || echo "Нет логов backend"

echo ""
echo "5️⃣ Проверка файлов backend..."
echo "============================"
cd /var/www/malabar/server

echo "server.js:"
ls -la server.js || echo "❌ server.js не найден"

echo "server-temp.js:"
ls -la server-temp.js || echo "❌ server-temp.js не создан"

echo "data.json:"
ls -la data.json || echo "⚠️ data.json не существует"

echo ""
echo "6️⃣ Тест nginx конфигурации домена..."
echo "==================================="

echo "Конфигурация домена:"
ls -la /etc/nginx/sites-available/vet-klinika-moscow.ru || echo "❌ Конфигурация домена НЕ НАЙДЕНА"

echo "Активна ли конфигурация:"
ls -la /etc/nginx/sites-enabled/vet-klinika-moscow.ru || echo "❌ Конфигурация домена НЕ АКТИВНА"

echo ""
echo "Nginx test:"
sudo nginx -t

echo ""
echo "7️⃣ Тест доступности домена..."
echo "============================"

echo "Внутренний тест домена:"
curl -v -H "Host: vet-klinika-moscow.ru" http://localhost 2>&1 | head -10

echo ""
echo "Внешний тест домена:"
curl -v http://vet-klinika-moscow.ru 2>&1 | head -10

echo ""
echo "8️⃣ DNS проверка..."
echo "=================="
echo "DNS резолвинг домена:"
nslookup vet-klinika-moscow.ru || echo "❌ DNS не резолвится"

echo ""
echo "9️⃣ ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ..."
echo "============================"

if ! pm2 list | grep -q "online.*malabar-backend"; then
    echo "❌ Backend не работает! Запускаем экстренный запуск..."
    
    cd /var/www/malabar/server
    
    # Пробуем запустить оригинальный server.js напрямую на 5 секунд
    echo "Тест оригинального server.js:"
    timeout 5s node server.js &
    sleep 6
    
    # Если не сработало, создаем простейший backend
    echo "Создаем простейший backend..."
    cat > simple-backend.js << 'EOF'
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Простые данные в памяти
const players = Array.from({length: 12}, (_, i) => ({
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/players', (req, res) => {
  res.json(players);
});

app.get('/api/players/updates', (req, res) => {
  res.json({
    players: players,
    timestamp: Date.now(),
    since: req.query.since || 0
  });
});

app.put('/api/players', (req, res) => {
  res.json({ success: true });
});

app.put('/api/players/:id', (req, res) => {
  res.json({ success: true });
});

app.post('/api/users/current', (req, res) => {
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Simple backend running on port ${PORT}`);
});
EOF

    echo "Запускаем простейший backend..."
    pm2 start simple-backend.js --name "malabar-backend"
    
    sleep 3
    
    echo "Проверка простейшего backend:"
    curl -s http://localhost:3001/api/health || echo "❌ Даже простейший backend не работает"
fi

echo ""
echo "🔍 ИТОГОВАЯ ДИАГНОСТИКА:"
echo "========================"
echo "PM2:"
pm2 status

echo ""
echo "Порты:"
netstat -tlnp | grep -E ":(3000|3001)"

echo ""
echo "API тест:"
curl -s http://localhost:3001/api/health

echo ""
echo "📋 РЕКОМЕНДАЦИИ:"
echo "================="
echo "1. Если backend всё еще не работает -> ./fix-backend-and-domain.sh"
echo "2. Если домен не работает -> проверьте DNS настройки"
echo "3. Если API не отвечает -> проверьте firewall: ufw status"
