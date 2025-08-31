// Дополнительные endpoints для полной синхронизации всех данных

// В server.js добавить эти endpoints:

/*
// === ПОЛНАЯ СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ ===

// Синхронизация таблицы
app.put('/api/table', (req, res) => {
  const { tableData } = req.body;
  
  // Сохранение состояния стола в БД или файл
  // ... логика сохранения ...
  
  // Уведомление всех клиентов
  broadcastUpdate('table_updated', { table: tableData });
  
  res.json({ success: true });
});

// Синхронизация кубиков
app.post('/api/dice/roll', (req, res) => {
  const { diceResults, playerId } = req.body;
  
  // Сохранение результата броска
  // ... логика сохранения ...
  
  // Уведомление всех клиентов
  broadcastUpdate('dice_rolled', { 
    dice: diceResults, 
    playerId,
    timestamp: Date.now() 
  });
  
  res.json({ success: true, diceResults });
});

// Синхронизация игр/раундов
app.put('/api/game', (req, res) => {
  const { gameState } = req.body;
  
  // Сохранение состояния игры
  // ... логика сохранения ...
  
  // Уведомление всех клиентов
  broadcastUpdate('game_updated', { game: gameState });
  
  res.json({ success: true });
});

// Синхронизация логов
app.post('/api/logs', (req, res) => {
  const { message, type, playerId } = req.body;
  
  const logEntry = {
    id: Date.now(),
    message,
    type,
    playerId,
    timestamp: new Date().toISOString()
  };
  
  // Сохранение лога в БД
  db.run(`INSERT INTO logs (message, type, playerId, timestamp) VALUES (?, ?, ?, ?)`,
    [logEntry.message, logEntry.type, logEntry.playerId, logEntry.timestamp]);
  
  // Уведомление всех клиентов
  broadcastUpdate('log_added', { log: logEntry });
  
  res.json({ success: true, log: logEntry });
});

// Получение всех логов
app.get('/api/logs', (req, res) => {
  const limit = req.query.limit || 100;
  
  db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// Создание таблицы логов если не существует
db.run(`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  playerId INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
*/

console.log('📋 Инструкции для полной синхронизации:');
console.log('1. Добавить код выше в server.js');
console.log('2. Создать таблицу логов в БД'); 
console.log('3. Обновить frontend для отправки всех событий');
console.log('4. Протестировать синхронизацию всех компонентов');
