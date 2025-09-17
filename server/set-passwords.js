const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Path to SQLite database used by the server
const dbPath = path.join(__dirname, 'malabar.db');
const db = new sqlite3.Database(dbPath);

function hashPassword(plain) {
  if (!plain || typeof plain !== 'string' || plain.length < 6) {
    throw new Error('Invalid password value. Provide a string with length >= 6');
  }
  return bcrypt.hashSync(plain, 10);
}

function upsertUser({ username, role = null, playerId = null, password }) {
  return new Promise((resolve, reject) => {
    const passwordHash = hashPassword(password);

    // Ensure row exists
    const insertSql = `INSERT OR IGNORE INTO users (username, isLoggedIn, role, playerId, lastLogin)
                       VALUES (?, 0, ?, ?, CURRENT_TIMESTAMP)`;
    db.run(insertSql, [username, role, Number.isInteger(playerId) ? playerId : null], function (insertErr) {
      if (insertErr) return reject(insertErr);

      const updateSql = `UPDATE users SET passwordHash = ?, role = ?, playerId = ?, isLoggedIn = 0 WHERE username = ?`;
      db.run(updateSql, [passwordHash, role, Number.isInteger(playerId) ? playerId : null, username], function (updateErr) {
        if (updateErr) return reject(updateErr);
        resolve();
      });
    });
  });
}

async function main() {
  try {
    const tasks = [];

    // Admin
    if (process.env.ADMIN_PASSWORD) {
      tasks.push(upsertUser({ username: 'admin', role: 'admin', playerId: null, password: process.env.ADMIN_PASSWORD }));
    }

    // Players 1..12
    for (let i = 1; i <= 12; i += 1) {
      const envVar = `PLAYER${i}_PASSWORD`;
      if (process.env[envVar]) {
        tasks.push(upsertUser({ username: `Player${i}`, role: 'player', playerId: i, password: process.env[envVar] }));
      }
    }

    if (tasks.length === 0) {
      console.log('No passwords provided via environment variables.');
      console.log('Expected: ADMIN_PASSWORD, PLAYER1_PASSWORD ... PLAYER12_PASSWORD');
      process.exit(1);
    }

    await Promise.all(tasks);
    console.log('Passwords have been set successfully.');
  } catch (e) {
    console.error('Failed to set passwords:', e);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();


