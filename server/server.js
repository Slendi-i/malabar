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
        } else if (hasAvatar) {
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

// Function to create players table
function createPlayersTable() {
  db.run(`
    CREATE TABLE players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      socialLinks TEXT,
      stats TEXT,
      games TEXT,
      isOnline INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating players table:', err);
    } else {
      console.log('Players table created successfully');
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

      const insertStmt = db.prepare(`
        INSERT INTO players (name, avatar, socialLinks, stats, games, isOnline)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      defaultPlayers.forEach(player => {
        insertStmt.run([
          player.name,
          player.avatar,
          player.socialLinks,
          player.stats,
          player.games,
          player.isOnline
        ]);
      });

      insertStmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing player insert:', err);
        } else {
          console.log('Default players inserted successfully');
        }
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

// Get all players
app.get('/api/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse JSON fields
    const players = rows.map(row => ({
      ...row,
      socialLinks: JSON.parse(row.socialLinks || '{}'),
      stats: JSON.parse(row.stats || '{}'),
      games: JSON.parse(row.games || '[]'),
      isOnline: Boolean(row.isOnline)
    }));
    
    res.json(players);
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
      SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?
      WHERE id = ?
    `;
    
    const params = [
      updatedPlayer.name,
      updatedPlayer.avatar,
      JSON.stringify(updatedPlayer.socialLinks || {}),
      JSON.stringify(updatedPlayer.stats || {}),
      JSON.stringify(updatedPlayer.games || []),
      updatedPlayer.isOnline ? 1 : 0,
      playerId
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Update failed' });
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
        SET name = ?, avatar = ?, socialLinks = ?, stats = ?, games = ?, isOnline = ?
        WHERE id = ?
      `;
      
      const params = [
        player.name,
        player.avatar,
        JSON.stringify(player.socialLinks || {}),
        JSON.stringify(player.stats || {}),
        JSON.stringify(player.games || []),
        player.isOnline ? 1 : 0,
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

// Get current user
app.get('/api/users/current', (req, res) => {
  db.get('SELECT * FROM users WHERE isLoggedIn = 1 ORDER BY lastLogin DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      // Return default user instead of 404
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Database initialized');
});

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
