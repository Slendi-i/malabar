const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');

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
      lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created/verified');
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

// Update individual player by ID
app.put('/api/players/:id', (req, res) => {
  const playerId = parseInt(req.params.id);
  const updatedPlayer = req.body;
  
  db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Update the specific player
    const sql = `
      UPDATE players 
      SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?, position = ?, x = ?, y = ?
      WHERE id = ?
    `;
    
    const params = [
      updatedPlayer.name,
      updatedPlayer.avatar,
      JSON.stringify(updatedPlayer.socialLinks || {}),
      JSON.stringify(updatedPlayer.stats || {}),
      JSON.stringify(updatedPlayer.games || []),
      updatedPlayer.isOnline ? 1 : 0,
      updatedPlayer.position,
      updatedPlayer.x !== undefined ? updatedPlayer.x : null,
      updatedPlayer.y !== undefined ? updatedPlayer.y : null,
      playerId
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed' });
      }
      
      // Broadcast update to all connected clients
      broadcastUpdate('player_updated', { 
        id: playerId, 
        player: updatedPlayer 
      });
      
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

// Get current user
app.get('/api/users/current', (req, res) => {
  db.get('SELECT * FROM users WHERE isLoggedIn = 1 ORDER BY lastLogin DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      // Return default user instead of error
      return res.json({
        id: -1,
        username: 'Guest',
        isLoggedIn: false,
        lastLogin: null
      });
    }
    
    res.json({
      id: row.id,
      username: row.username,
      isLoggedIn: Boolean(row.isLoggedIn),
      lastLogin: row.lastLogin
    });
  });
});

// Set current user (login/logout)
app.post('/api/users/current', (req, res) => {
  const { username, isLoggedIn } = req.body;
  
  if (isLoggedIn) {
    // Login: Create or update user
    db.run(`
      INSERT OR REPLACE INTO users (username, isLoggedIn, lastLogin)
      VALUES (?, 1, CURRENT_TIMESTAMP)
    `, [username], function(err) {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Broadcast user login to all connected clients
      broadcastUpdate('user_logged_in', { 
        username,
        userId: this.lastID 
      });
      
      res.json({ message: 'Login successful', userId: this.lastID });
    });
  } else {
    // Logout: Set all users to logged out
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

// Start server with WebSocket support
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Database initialized');
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

// Heartbeat механизм для очистки неактивных соединений
setInterval(() => {
  const now = Date.now();
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      const timeSinceLastActivity = now - (ws.lastActivity || now);
      
      // Если давно не было активности (более 2 минут), отправляем ping
      if (timeSinceLastActivity > 120000) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
        } catch (error) {
          console.error('Failed to send heartbeat ping to client:', error);
          clients.delete(ws);
        }
      }
      
      // Если очень давно не было активности (более 5 минут), закрываем соединение
      if (timeSinceLastActivity > 300000) {
        console.log('Closing inactive WebSocket connection');
        ws.close();
        clients.delete(ws);
      }
    } else {
      // Удаляем закрытые соединения
      clients.delete(ws);
    }
  });
}, 60000); // Проверяем каждую минуту

// Function to broadcast updates to all connected clients
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  const now = Date.now();
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        // Обновляем метку активности при успешной отправке
        client.lastActivity = now;
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        clients.delete(client);
      }
    } else {
      // Удаляем неактивные соединения
      clients.delete(client);
    }
  });
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
