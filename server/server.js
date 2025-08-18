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
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Players table
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT,
    socialLinks TEXT,
    stats TEXT,
    games TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Check if we need to insert default players
  db.get("SELECT COUNT(*) as count FROM players", (err, row) => {
    if (err) {
      console.error('Error checking players count:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting default players...');
      insertDefaultPlayers();
    }
  });
}

// Insert default players
function insertDefaultPlayers() {
  const defaultPlayers = Array.from({ length: 12 }, (_, i) => ({
    name: `Игрок ${i + 1}`,
    image: '',
    socialLinks: JSON.stringify({ twitch: '', telegram: '', discord: '' }),
    stats: JSON.stringify({ wins: 0, rerolls: 0, drops: 0, position: i + 1 }),
    games: JSON.stringify([])
  }));

  const stmt = db.prepare(`INSERT INTO players (name, image, socialLinks, stats, games) VALUES (?, ?, ?, ?, ?)`);
  
  defaultPlayers.forEach(player => {
    stmt.run([player.name, player.image, player.socialLinks, player.stats, player.games]);
  });
  
  stmt.finalize((err) => {
    if (err) {
      console.error('Error inserting default players:', err);
    } else {
      console.log('Default players inserted successfully');
    }
  });
}

// API Routes

// Get all players
app.get('/api/players', (req, res) => {
  db.all("SELECT * FROM players ORDER BY id", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse JSON fields
    const players = rows.map(row => ({
      ...row,
      socialLinks: JSON.parse(row.socialLinks || '{}'),
      stats: JSON.parse(row.stats || '{}'),
      games: JSON.parse(row.games || '[]')
    }));
    
    res.json(players);
  });
});

// Update player
app.put('/api/players/:id', (req, res) => {
  const { id } = req.params;
  const { name, image, socialLinks, stats, games } = req.body;
  
  const updateData = {
    name: name || '',
    image: image || '',
    socialLinks: JSON.stringify(socialLinks || {}),
    stats: JSON.stringify(stats || {}),
    games: JSON.stringify(games || []),
    updated_at: new Date().toISOString()
  };

  db.run(
    `UPDATE players SET 
     name = ?, image = ?, socialLinks = ?, stats = ?, games = ?, updated_at = ?
     WHERE id = ?`,
    [updateData.name, updateData.image, updateData.socialLinks, updateData.stats, updateData.games, updateData.updated_at, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      
      res.json({ message: 'Player updated successfully', changes: this.changes });
    }
  );
});

// Get current user
app.get('/api/users/current', (req, res) => {
  // For now, we'll return a default user
  // In a real app, you'd implement proper authentication
  res.json({ type: 'viewer', id: -1, name: 'Зритель' });
});

// Update current user (for login/logout)
app.post('/api/users/current', (req, res) => {
  const { type, id, name } = req.body;
  
  // In a real app, you'd implement proper session management
  // For now, we'll just return the user data
  res.json({ type, id, name });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
