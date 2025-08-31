#!/bin/bash

# Финальное исправление SQLite3 и запуск полного backend

echo "🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ SQLITE3"
echo "================================"

# 1. Остановка временных процессов
echo "🛑 Остановка временных backend процессов..."
pm2 stop malabar-backend-simple 2>/dev/null || true
pm2 stop malabar-backend-safe 2>/dev/null || true
pm2 delete malabar-backend-simple 2>/dev/null || true
pm2 delete malabar-backend-safe 2>/dev/null || true

# 2. Исправление SQLite3
echo "🔧 Исправление модуля SQLite3..."
cd server

# Удаление старых скомпилированных модулей
echo "🗑️  Удаление старых модулей..."
rm -rf node_modules/sqlite3
rm -rf node_modules/.cache
npm cache clean --force

# Переустановка sqlite3 с принудительной перекомпиляцией
echo "📦 Переустановка sqlite3..."
npm install sqlite3 --build-from-source

# Если не помогло, пробуем альтернативный способ
if [ $? -ne 0 ]; then
    echo "⚠️  Стандартная установка не удалась, пробуем альтернативный способ..."
    npm install sqlite3 --no-optional --build-from-source
fi

# Если и это не помогло, устанавливаем prebuilt версию
if [ $? -ne 0 ]; then
    echo "⚠️  Пробуем prebuilt версию..."
    npm install sqlite3@5.1.6 --save
fi

# 3. Тест sqlite3
echo "🧪 Тестирование sqlite3..."
node -e "
try {
  const sqlite3 = require('sqlite3');
  console.log('✅ SQLite3 модуль загружается корректно');
  const db = new sqlite3.Database(':memory:');
  db.close();
  console.log('✅ SQLite3 база данных создается корректно');
} catch (e) {
  console.log('❌ Ошибка SQLite3:', e.message);
  process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo "✅ SQLite3 исправлен успешно!"
    
    # 4. Восстановление оригинального server.js если есть бэкап
    if [ -f "server.js.with-websocket" ]; then
        echo "🔄 Восстановление полной версии server.js..."
        cp server.js.with-websocket server.js
    fi
    
    # 5. Запуск полного backend
    echo "🚀 Запуск полного backend..."
    pm2 start server.js --name malabar-backend
    
else
    echo "❌ SQLite3 все еще не работает, используем версию без базы данных..."
    # Используем версию без SQLite
    cat > server-no-db.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// In-memory storage
let players = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Player ${i + 1}`,
  avatar: `/avatars/player${i + 1}.jpg`,
  socialLinks: { discord: '', twitter: '', instagram: '' },
  stats: { wins: 0, losses: 0, draws: 0 },
  games: [],
  isOnline: false,
  position: i + 1
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/players', (req, res) => {
  res.json(players);
});

app.put('/api/players', (req, res) => {
  if (Array.isArray(req.body)) {
    players = req.body;
    res.json({ message: 'Players updated successfully' });
  } else {
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.get('/api/users/current', (req, res) => {
  res.json({ id: -1, username: 'Guest', isLoggedIn: false });
});

app.post('/api/users/current', (req, res) => {
  res.json({ message: 'Login successful' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (no database)`);
});
EOF
    
    pm2 start server-no-db.js --name malabar-backend-nodb
fi

cd ..

# 6. Ожидание и проверка
echo "⏳ Ожидание запуска (5 секунд)..."
sleep 5

# 7. Финальная проверка
echo "📊 Финальный статус процессов:"
pm2 status

echo ""
echo "🌐 Проверка доступности:"
echo "Backend health check:"
curl -s http://localhost:3001/api/health && echo "" || echo "❌ Backend недоступен"

echo "Players API:"
curl -s http://localhost:3001/api/players | head -100 && echo "" || echo "❌ Players API недоступен"

echo "Frontend:"
curl -s -I http://localhost:3000 | head -1 || echo "❌ Frontend недоступен"

echo ""
echo "✅ РЕЗУЛЬТАТ:"
echo "1. http://vet-klinika-moscow.ru - должен работать"
echo "2. http://46.173.17.229:3000 - должен работать"  
echo "3. http://46.173.17.229:3001/api/health - должен работать"
echo ""
echo "📋 Проверьте все три адреса в браузере!"

# 8. Сохранение PM2 конфигурации
pm2 save
echo "💾 PM2 конфигурация сохранена"
