const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware с расширенными CORS настройками для VPS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://46.173.17.229:3000',
    'http://vet-klinika-moscow.ru:3000',
    // Также поддерживаем https на случай если будет SSL
    'https://46.173.17.229:3000',
    'https://vet-klinika-moscow.ru:3000'
  ],
  credentials: true, // Включаем cookies для авторизации
  optionsSuccessStatus: 200 // Поддержка legacy браузеров
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Database setup with error handling and fallback
const dbPath = path.join(__dirname, 'malabar.db');
console.log('🗃️ Attempting to connect to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    console.error('❌ Database path:', dbPath);
    console.error('❌ Current working directory:', process.cwd());
    console.error('❌ __dirname:', __dirname);
    
    // Попробуем создать директорию если её нет
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log('📁 Creating database directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    process.exit(1); // Выходим если не можем подключиться к БД
  } else {
    console.log('✅ Connected to SQLite database:', dbPath);
  }
});

// Initialize database tables
db.serialize(() => {
  // Check if players table exists and has the right structure
  db.get("PRAGMA table_info(players)", (err, row) => {
    if (err || !row) {
      // Table doesn't exist, create it
      createPlayersTable();
    } else {
      // Table exists, check if it has the right columns
      db.all("PRAGMA table_info(players)", (err, columns) => {
        if (err) {
          console.error('Error checking table structure:', err);
          return;
        }
        
        const hasAvatar = columns.some(col => col.name === 'avatar');
        const hasImage = columns.some(col => col.name === 'image');
        const hasPosition = columns.some(col => col.name === 'position');
        const hasX = columns.some(col => col.name === 'x');
        const hasY = columns.some(col => col.name === 'y');
        
        if (!hasAvatar && hasImage) {
          // Old table structure, recreate it
          console.log('Updating existing table structure...');
          db.run('DROP TABLE players', (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
              return;
            }
            createPlayersTable();
          });
        } else if (!hasPosition) {
          // Need to add position column
          console.log('Adding position column to existing table...');
          db.run('ALTER TABLE players ADD COLUMN position INTEGER DEFAULT 0', (err) => {
            if (err) {
              console.error('Error adding position column:', err);
              // If adding column fails, recreate table
              db.run('DROP TABLE players', (dropErr) => {
                if (dropErr) {
                  console.error('Error dropping table:', dropErr);
                  return;
                }
                createPlayersTable();
              });
            } else {
              console.log('Position column added successfully');
              // Update existing players with default positions
              db.run(`UPDATE players SET position = id WHERE position = 0`, (updateErr) => {
                if (updateErr) {
                  console.error('Error updating positions:', updateErr);
                } else {
                  console.log('Default positions set for existing players');
                }
              });
              // Check if we need to add x, y columns
              if (!hasX || !hasY) {
                addCoordinateColumns();
              } else {
                checkAndInsertPlayers();
              }
            }
          });
        } else if (!hasX || !hasY) {
          // Need to add coordinate columns
          addCoordinateColumns();
        } else if (hasAvatar && hasPosition && hasX && hasY) {
          // Table already has correct structure
          console.log('Players table structure is correct');
          checkAndInsertPlayers();
        } else {
          // Unknown structure, recreate
          console.log('Recreating players table...');
          db.run('DROP TABLE players', (err) => {
            if (err) {
              console.error('Error dropping table:', err);
              return;
            }
            createPlayersTable();
          });
        }
      });
    }
  });

  // Create users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      isLoggedIn INTEGER DEFAULT 0,
      role TEXT DEFAULT NULL,
      playerId INTEGER DEFAULT NULL,
      lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created/verified');
      // Ensure new columns exist for legacy DBs
      db.all('PRAGMA table_info(users)', (e2, cols) => {
        if (e2) return;
        const hasRole = cols.some(c => c.name === 'role');
        const hasPlayerId = cols.some(c => c.name === 'playerId');
        if (!hasRole) {
          db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT NULL');
        }
        if (!hasPlayerId) {
          db.run('ALTER TABLE users ADD COLUMN playerId INTEGER DEFAULT NULL');
        }
      });
    }
  });
});

// Function to add coordinate columns to existing table
function addCoordinateColumns() {
  console.log('Adding coordinate columns to existing table...');
  
  db.run('ALTER TABLE players ADD COLUMN x REAL DEFAULT NULL', (err) => {
    if (err) {
      console.error('Error adding x column:', err);
      // If adding column fails, recreate table
      db.run('DROP TABLE players', (dropErr) => {
        if (dropErr) {
          console.error('Error dropping table:', dropErr);
          return;
        }
        createPlayersTable();
      });
      return;
    }
    
    console.log('X column added successfully');
    
    db.run('ALTER TABLE players ADD COLUMN y REAL DEFAULT NULL', (err2) => {
      if (err2) {
        console.error('Error adding y column:', err2);
        // If adding column fails, recreate table
        db.run('DROP TABLE players', (dropErr) => {
          if (dropErr) {
            console.error('Error dropping table:', dropErr);
            return;
          }
          createPlayersTable();
        });
        return;
      }
      
      console.log('Y column added successfully');
      console.log('Coordinate columns added to existing table');
      checkAndInsertPlayers();
    });
  });
}

// Function to create players table
function createPlayersTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      socialLinks TEXT,
      stats TEXT,
      games TEXT,
      isOnline INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      x REAL DEFAULT NULL,
      y REAL DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating players table:', err);
    } else {
      console.log('Players table created/verified');
      checkAndInsertPlayers();
    }
  });
}

// Function to check and insert default players
function checkAndInsertPlayers() {
  db.get('SELECT COUNT(*) as count FROM players', (err, row) => {
    if (err) {
      console.error('Error checking players count:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting default players...');
      const defaultPlayers = [
        {
          name: 'Player 1',
          avatar: '/avatars/player1.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 2',
          avatar: '/avatars/player2.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 3',
          avatar: '/avatars/player3.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 4',
          avatar: '/avatars/player4.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 5',
          avatar: '/avatars/player5.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 6',
          avatar: '/avatars/player6.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 7',
          avatar: '/avatars/player7.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 8',
          avatar: '/avatars/player8.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 9',
          avatar: '/avatars/player9.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 10',
          avatar: '/avatars/player10.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 11',
          avatar: '/avatars/player11.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        },
        {
          name: 'Player 12',
          avatar: '/avatars/player12.jpg',
          socialLinks: JSON.stringify({ discord: '', twitter: '', instagram: '' }),
          stats: JSON.stringify({ wins: 0, losses: 0, draws: 0 }),
          games: JSON.stringify([]),
          isOnline: 0
        }
      ];

      // Insert players one by one using db.run
      let insertedCount = 0;
      defaultPlayers.forEach((player, index) => {
        const sql = `
          INSERT INTO players (name, avatar, socialLinks, stats, games, isOnline, position, x, y)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          player.name,
          player.avatar,
          player.socialLinks,
          player.stats,
          player.games,
          player.isOnline,
          index + 1,  // Position based on array index
          null, // x coordinate - will be set later through UI
          null  // y coordinate - will be set later through UI
        ];

        db.run(sql, params, function(err) {
          if (err) {
            console.error('Error inserting player:', err);
          } else {
            insertedCount++;
            if (insertedCount === defaultPlayers.length) {
              console.log('Default players inserted successfully');
            }
          }
        });
      });
    } else {
      console.log(`Database already has ${row.count} players`);
    }
  });
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 🚀 Debug endpoint удален - больше не нужен

// Updates endpoint for HTTP polling
app.get('/api/players/updates', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since) : 0;
  const currentTime = Date.now();
  
  console.log(`HTTP polling request - since: ${since}, current: ${currentTime}`);
  
  // Получаем всех игроков для HTTP polling
  db.all('SELECT * FROM players ORDER BY id', (err, players) => {
    if (err) {
      console.error('Error fetching players for updates:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // В простой реализации возвращаем всех игроков
    // В реальности здесь можно добавить временные метки для фильтрации
    res.json({
      players: players || [],
      timestamp: currentTime,
      since: since
    });
  });
});

// Get all players (legacy endpoint)
app.get('/api/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY position ASC, id ASC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse JSON fields and add position
    const players = rows.map(row => ({
      ...row,
      socialLinks: JSON.parse(row.socialLinks || '{}'),
      stats: JSON.parse(row.stats || '{}'),
      games: JSON.parse(row.games || '[]'),
      isOnline: Boolean(row.isOnline),
      position: row.position || row.id
    }));
    
    res.json({ 
      players, 
      timestamp: Date.now()
    });
  });
});

// Get individual player by ID
app.get('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Parse JSON fields
    const player = {
      ...row,
      socialLinks: JSON.parse(row.socialLinks || '{}'),
      stats: JSON.parse(row.stats || '{}'),
      games: JSON.parse(row.games || '[]'),
      isOnline: Boolean(row.isOnline)
    };
    
    res.json(player);
  });
});

// 🚀 ОПТИМИЗИРОВАННЫЙ ENDPOINT - умная синхронизация координат!
app.patch('/api/coordinates/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const { x, y } = req.body;
  
  console.log(`🚀 OPTIMIZED: Обновление координат игрока ${playerId}: (${x}, ${y})`);
  
  // Минимальная валидация
  if (!playerId || isNaN(playerId)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }
  
  if (x === undefined || y === undefined) {
    return res.status(400).json({ error: 'Missing x or y coordinates' });
  }
  
  const validX = parseFloat(x);
  const validY = parseFloat(y);
  
  if (isNaN(validX) || isNaN(validY)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  // 🚀 УМНАЯ СИНХРОНИЗАЦИЯ - проверяем изменения перед обновлением
  db.get('SELECT x, y FROM players WHERE id = ?', [playerId], (err, currentPlayer) => {
    if (err) {
      console.error(`❌ OPTIMIZED: Database error:`, err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!currentPlayer) {
      console.error(`❌ OPTIMIZED: Player ${playerId} not found`);
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Проверяем значимость изменений
    const deltaX = Math.abs(validX - (currentPlayer.x || 0));
    const deltaY = Math.abs(validY - (currentPlayer.y || 0));
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < 1) { // Минимальное изменение 1px
      console.log(`🚫 OPTIMIZED: Изменение слишком мало: ${distance.toFixed(2)}px - пропускаем`);
      return res.json({ 
        success: true, 
        message: 'No significant change',
        playerId: playerId,
        x: currentPlayer.x,
        y: currentPlayer.y,
        skipped: true
      });
    }
    
    // Обновляем только если есть значимые изменения
    const sql = 'UPDATE players SET x = ?, y = ? WHERE id = ?';
    const params = [validX, validY, playerId];
    
    console.log(`🚀 OPTIMIZED: SQL: ${sql}`);
    console.log(`🚀 OPTIMIZED: Params: [${params.join(', ')}]`);
    console.log(`🚀 OPTIMIZED: Distance: ${distance.toFixed(2)}px`);
  
    db.run(sql, params, function(err) {
      if (err) {
        console.error(`❌ OPTIMIZED: SQL Error:`, err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (this.changes === 0) {
        console.error(`❌ OPTIMIZED: Player ${playerId} not found`);
        return res.status(404).json({ error: 'Player not found' });
      }
      
      console.log(`✅ OPTIMIZED: Координаты обновлены для игрока ${playerId} (distance: ${distance.toFixed(2)}px)`);
      
      // 🚀 УМНЫЙ BROADCAST - только если есть изменения
      const updateData = {
        type: 'player_position_update',
        playerId: playerId,
        x: validX,
        y: validY,
        distance: distance.toFixed(2)
      };
      
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(updateData));
        }
      });
      
      res.json({ 
        success: true, 
        message: 'Coordinates updated',
        playerId: playerId,
        x: validX,
        y: validY,
        distance: distance.toFixed(2),
        changes: this.changes
      });
    });
  });
});

// 🚀 PATCH endpoint удален - используем проверенный PUT /api/players/:id

// Update individual player by ID
app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const updatedPlayer = req.body;
  
  console.log('🔍 SERVER: PUT /api/players/', playerId, 'данные:', updatedPlayer);
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    console.log('🔍 SERVER: Текущие данные игрока:', {
      id: player.id,
      name: player.name,
      hasAvatar: !!player.avatar,
      x: player.x,
      y: player.y
    });
    
    // 🚀 УМНЫЙ UPDATE - объединяем существующие данные с новыми
    const mergedPlayer = {
      name: updatedPlayer.name !== undefined ? updatedPlayer.name : player.name,
      avatar: updatedPlayer.avatar !== undefined ? updatedPlayer.avatar : player.avatar,
      socialLinks: updatedPlayer.socialLinks !== undefined ? updatedPlayer.socialLinks : JSON.parse(player.socialLinks || '{}'),
      stats: updatedPlayer.stats !== undefined ? updatedPlayer.stats : JSON.parse(player.stats || '{}'),
      games: updatedPlayer.games !== undefined ? updatedPlayer.games : JSON.parse(player.games || '[]'),
      isOnline: updatedPlayer.isOnline !== undefined ? updatedPlayer.isOnline : player.isOnline,
      position: updatedPlayer.position !== undefined ? updatedPlayer.position : player.position,
      x: updatedPlayer.x !== undefined ? updatedPlayer.x : player.x,
      y: updatedPlayer.y !== undefined ? updatedPlayer.y : player.y
    };
    
    console.log('🔍 SERVER: Объединенные данные:', {
      name: mergedPlayer.name,
      hasAvatar: !!mergedPlayer.avatar,
      x: mergedPlayer.x,
      y: mergedPlayer.y
    });
    
    // Update the specific player с объединенными данными
    const sql = `
      UPDATE players 
      SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?, position = ?, x = ?, y = ?
      WHERE id = ?
    `;
    
    const params = [
      mergedPlayer.name,
      mergedPlayer.avatar,
      JSON.stringify(mergedPlayer.socialLinks),
      JSON.stringify(mergedPlayer.stats),
      JSON.stringify(mergedPlayer.games),
      mergedPlayer.isOnline ? 1 : 0,
      mergedPlayer.position || 0,  // 🔥 ИСПРАВЛЕНО: значение по умолчанию
      mergedPlayer.x,
      mergedPlayer.y,
      playerId
    ];
    
    console.log('🔍 SERVER: SQL запрос:', sql);
    console.log('🔍 SERVER: Параметры:', params);
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ SERVER: Update error:', err);
        console.error('❌ SERVER: SQL:', sql);
        console.error('❌ SERVER: Params:', params);
        return res.status(500).json({ error: 'Update failed', details: err.message });
      }
      
      // 🔍 УЛУЧШЕННАЯ логика broadcast с детальной диагностикой
      const requestKeys = Object.keys(req.body);
      const hasX = requestKeys.includes('x');
      const hasY = requestKeys.includes('y');
      const isCoordinateUpdate = hasX && hasY && requestKeys.length <= 3; // x, y + возможно id
      
      console.log('🔍 SERVER: Анализируем тип обновления:', {
        requestKeys,
        hasX,
        hasY,
        isCoordinateUpdate,
        bodyKeysCount: requestKeys.length
      });
      
      if (isCoordinateUpdate) {
        // Только координаты - отправляем coordinates
        console.log('📍 SERVER: Broadcasting coordinates update для игрока', playerId);
        const coordinatesData = { 
          id: playerId, 
          x: mergedPlayer.x,
          y: mergedPlayer.y
        };
        console.log('📍 SERVER: Данные координат:', coordinatesData);
        broadcastUpdate('coordinates', coordinatesData);
      } else {
        // Профиль - отправляем profile
        console.log('📝 SERVER: Broadcasting profile update для игрока', playerId);
        const profileData = { 
          id: playerId, 
          player: mergedPlayer 
        };
        console.log('📝 SERVER: Данные профиля (краткие):', {
          id: profileData.id,
          name: profileData.player.name,
          hasAvatar: !!profileData.player.avatar
        });
        broadcastUpdate('profile', profileData);
      }
      
      res.json({ message: 'Player updated successfully', id: playerId });
    });
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
        SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?, position = ?, x = ?, y = ?
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
        player.x !== undefined ? player.x : null,
        player.y !== undefined ? player.y : null,
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
      // Broadcast batch update to all connected clients
      broadcastUpdate('players_batch_updated', { 
        players,
        results 
      });
      
      res.json({ message: 'All players updated successfully', results });
    })
    .catch(err => {
      console.error('Batch update error:', err);
      res.status(500).json({ error: 'Batch update failed' });
    });
});

// Update player games specifically
app.post('/api/players/:id/games', (req, res) => {
  const playerId = parseInt(req.params.id);
  const { games } = req.body;
  
  console.log(`Updating games for player ${playerId}:`, games);
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Update only the games field
    const sql = 'UPDATE players SET games = ? WHERE id = ?';
    const params = [JSON.stringify(games || []), playerId];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Update games error:', err);
        return res.status(500).json({ error: 'Update games failed' });
      }
      
      // Get the updated player to broadcast
      db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, updatedPlayer) => {
        if (err) {
          console.error('Error fetching updated player:', err);
          return res.status(500).json({ error: 'Error fetching updated player' });
        }
        
        const playerWithParsedData = {
          ...updatedPlayer,
          socialLinks: JSON.parse(updatedPlayer.socialLinks || '{}'),
          stats: JSON.parse(updatedPlayer.stats || '{}'),
          games: JSON.parse(updatedPlayer.games || '[]'),
          isOnline: Boolean(updatedPlayer.isOnline)
        };
        
        // Broadcast update to all connected clients
        broadcastUpdate('player_updated', { 
          id: playerId, 
          player: playerWithParsedData 
        });
        
        res.json({ 
          message: 'Player games updated successfully', 
          id: playerId,
          games: JSON.parse(updatedPlayer.games || '[]')
        });
      });
    });
  });
});

// Update player social links specifically  
app.post('/api/players/:id/social', (req, res) => {
  const playerId = parseInt(req.params.id);
  const { socialLinks } = req.body;
  
  console.log(`Updating social links for player ${playerId}:`, socialLinks);
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Update only the social links field
    const sql = 'UPDATE players SET socialLinks = ? WHERE id = ?';
    const params = [JSON.stringify(socialLinks || {}), playerId];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Update social links error:', err);
        return res.status(500).json({ error: 'Update social links failed' });
      }
      
      // Get the updated player to broadcast
      db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, updatedPlayer) => {
        if (err) {
          console.error('Error fetching updated player:', err);
          return res.status(500).json({ error: 'Error fetching updated player' });
        }
        
        const playerWithParsedData = {
          ...updatedPlayer,
          socialLinks: JSON.parse(updatedPlayer.socialLinks || '{}'),
          stats: JSON.parse(updatedPlayer.stats || '{}'),
          games: JSON.parse(updatedPlayer.games || '[]'),
          isOnline: Boolean(updatedPlayer.isOnline)
        };
        
        // Broadcast update to all connected clients
        broadcastUpdate('player_updated', { 
          id: playerId, 
          player: playerWithParsedData 
        });
        
        res.json({ 
          message: 'Player social links updated successfully', 
          id: playerId,
          socialLinks: JSON.parse(updatedPlayer.socialLinks || '{}')
        });
      });
    });
  });
});

// 🚨 СТАРЫЙ EMERGENCY ENDPOINT УДАЛЕН - используем только радикальный!

// 🚀 УДАЛЕН дублирующий POST роут - используем только PATCH /coordinates

// Get current user
app.get('/api/users/current', (req, res) => {
  db.get('SELECT * FROM users WHERE isLoggedIn = 1 ORDER BY lastLogin DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      // Возвращаем 401 если пользователь не авторизован
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Маппинг к фронтенд-модели пользователя
    const result = {
      id: row.playerId != null ? row.playerId : row.id,
      name: row.username,
      username: row.username,
      isLoggedIn: Boolean(row.isLoggedIn),
      type: row.role || (row.username === 'Администратор' ? 'admin' : 'viewer'),
      lastLogin: row.lastLogin
    };
    res.json(result);
  });
});

// Set current user (login/logout)
app.post('/api/users/current', (req, res) => {
  const { username, isLoggedIn, role, playerId } = req.body;
  
  if (isLoggedIn) {
    // Login: Create or update user
    db.run(`
      INSERT OR REPLACE INTO users (username, isLoggedIn, role, playerId, lastLogin)
      VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)
    `, [username, role || null, Number.isInteger(playerId) ? playerId : null], function(err) {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Broadcast user login to all connected clients
      broadcastUpdate('user_logged_in', { 
        username,
        userId: this.lastID,
        role: role || null,
        playerId: Number.isInteger(playerId) ? playerId : null
      });
      
      res.json({ message: 'Login successful', userId: this.lastID, role: role || null, playerId: Number.isInteger(playerId) ? playerId : null });
    });
  } else {
    // Logout: Set all users to logged out (мягко, только если явно logout)
    db.run('UPDATE users SET isLoggedIn = 0', (err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      res.json({ message: 'Logout successful' });
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with enhanced error handling
const server = app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Server URL: http://0.0.0.0:${PORT}`);
  console.log(`✅ API Health: http://0.0.0.0:${PORT}/api/health`);
  console.log('✅ Database initialized');
  console.log('✅ WebSocket server ready');
  
  // Проверяем что сервер действительно слушает
  const address = server.address();
  if (address) {
    console.log(`🌐 Server listening on ${address.address}:${address.port}`);
  }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);
  
  // Handle incoming messages (including heartbeat)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'ping') {
        // Отвечаем на ping клиента
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } else if (message.type === 'pong') {
        // Клиент ответил на наш ping - обновляем время последней активности
        ws.lastActivity = Date.now();
      } else if (message.type === 'save_coordinates') {
        // 🚀 РАДИКАЛЬНОЕ РЕШЕНИЕ: Сохранение координат через WebSocket
        handleWebSocketCoordinatesSave(ws, message.data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
  
  // Устанавливаем начальную метку активности
  ws.lastActivity = Date.now();
});

// Heartbeat механизм для очистки неактивных соединений (оптимизированный)
setInterval(() => {
  const now = Date.now();
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      const timeSinceLastActivity = now - (ws.lastActivity || now);
      
      // Если давно не было активности (более 45 секунд), отправляем ping
      if (timeSinceLastActivity > 45000) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
        } catch (error) {
          console.error('Failed to send heartbeat ping to client:', error);
          clients.delete(ws);
        }
      }
      
      // Если очень давно не было активности (более 2 минут), закрываем соединение
      if (timeSinceLastActivity > 120000) {
        console.log('Closing inactive WebSocket connection');
        ws.close();
        clients.delete(ws);
      }
    } else {
      // Удаляем закрытые соединения
      clients.delete(ws);
    }
  });
}, 20000); // Проверяем каждые 20 секунд для быстрого отклика

// 🚀 РАДИКАЛЬНОЕ РЕШЕНИЕ: Обработка сохранения координат через WebSocket
function handleWebSocketCoordinatesSave(ws, data) {
  console.log(`🚀 WS SAVE: Получен запрос сохранения координат:`, data);
  
  const { id, x, y } = data;
  
  // Валидация
  if (!id || x === undefined || y === undefined) {
    ws.send(JSON.stringify({
      type: 'coordinates_error',
      error: 'Invalid coordinates data',
      data: { id, x, y }
    }));
    return;
  }
  
  const playerId = parseInt(id);
  if (isNaN(playerId) || playerId <= 0) {
    ws.send(JSON.stringify({
      type: 'coordinates_error', 
      error: 'Invalid player ID',
      data: { id, x, y }
    }));
    return;
  }
  
  // Сохранение в БД
  const sql = 'UPDATE players SET x = ?, y = ? WHERE id = ?';
  const params = [parseFloat(x), parseFloat(y), playerId];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error(`❌ WS SAVE: Ошибка БД:`, err);
      ws.send(JSON.stringify({
        type: 'coordinates_error',
        error: 'Database error',
        details: err.message,
        data: { id: playerId, x, y }
      }));
      return;
    }
    
    if (this.changes === 0) {
      ws.send(JSON.stringify({
        type: 'coordinates_error',
        error: 'Player not found',
        data: { id: playerId, x, y }
      }));
      return;
    }
    
    console.log(`✅ WS SAVE: Координаты сохранены для игрока ${playerId}`);
    
    // Подтверждение отправителю
    ws.send(JSON.stringify({
      type: 'coordinates_saved',
      data: { id: playerId, x: parseFloat(x), y: parseFloat(y) }
    }));
    
    // Трансляция всем остальным клиентам
    const coordinatesData = { id: playerId, x: parseFloat(x), y: parseFloat(y) };
    broadcastUpdate('coordinates', coordinatesData);
  });
}

// Function to broadcast updates to all connected clients
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  const now = Date.now();
  
  console.log(`📡 SERVER: Начинаем broadcast "${type}" для ${clients.size} клиентов`);
  
  let successCount = 0;
  let failCount = 0;
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        // Обновляем метку активности при успешной отправке
        client.lastActivity = now;
        successCount++;
      } catch (error) {
        console.error('❌ Error broadcasting to client:', error);
        clients.delete(client);
        failCount++;
      }
    } else {
      // Удаляем неактивные соединения
      console.log('🧹 Удаляем неактивное WebSocket соединение');
      clients.delete(client);
      failCount++;
    }
  });
  
  console.log(`📊 SERVER: Broadcast завершен - успешно: ${successCount}, ошибок: ${failCount}, тип: "${type}"`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
