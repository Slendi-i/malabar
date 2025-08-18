# 🚀 Malabar Event Site - VPS Deployment Guide

## Overview
This guide will help you migrate your site from localStorage (local data) to a global database system where all users see the same data in real-time.

## 🏗️ Architecture Changes

### Before (localStorage)
- ❌ Each user has their own data
- ❌ Changes don't sync between users
- ❌ Data lost when browser is cleared
- ❌ No real-time updates

### After (Global Database)
- ✅ All users see the same data
- ✅ Changes sync immediately
- ✅ Data persists on server
- ✅ Real-time synchronization

## 📋 Prerequisites

1. **VPS Server** with Ubuntu/Debian
2. **Node.js** (v16 or higher)
3. **Git** (for code deployment)
4. **Domain name** (optional but recommended)

## 🚀 Deployment Steps

### Step 1: Prepare Your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Verify installation
node --version
npm --version
```

### Step 2: Upload Your Code

```bash
# On your local machine, build the project
npm run build

# Upload to VPS (replace with your VPS IP)
scp -r . user@your-vps-ip:/home/user/malabar-event

# Or use Git
git clone https://github.com/your-username/malabar-event.git
cd malabar-event
```

### Step 3: Configure the Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Edit the API configuration
nano ../config/api.js
```

**Change this line in `config/api.js`:**
```javascript
const API_BASE_URL = 'http://YOUR_ACTUAL_VPS_IP:3001';
```

### Step 4: Start the Backend

```bash
# Start the backend server
cd server
node server.js

# Or use PM2 for production
pm2 start server.js --name "malabar-backend"
pm2 save
pm2 startup
```

### Step 5: Configure Firewall

```bash
# Allow port 3001
sudo ufw allow 3001

# If using nginx as reverse proxy
sudo ufw allow 80
sudo ufw allow 443
```

### Step 6: Test the API

```bash
# Test if backend is running
curl http://your-vps-ip:3001/api/health

# Should return: {"status":"OK","timestamp":"..."}
```

## 🔧 Configuration Files

### Backend Configuration (`server/server.js`)
- Port: 3001 (configurable via environment variable)
- Database: SQLite (automatically created)
- CORS: Enabled for all origins (customize as needed)

### Frontend Configuration (`config/api.js`)
- API base URL: Points to your VPS
- Environment-aware: Different URLs for dev/prod

## 📊 Database Schema

The backend automatically creates these tables:

### Players Table
```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  image TEXT,
  socialLinks TEXT,  -- JSON string
  stats TEXT,        -- JSON string
  games TEXT,        -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Real-time Updates

### Current Implementation
- Manual refresh required
- API calls on user actions
- Batch updates for efficiency

### Future Enhancements (Optional)
- WebSocket connections for real-time updates
- Server-sent events
- Database change notifications

## 🚨 Troubleshooting

### Backend Won't Start
```bash
# Check logs
pm2 logs malabar-backend

# Check if port is in use
sudo netstat -tlnp | grep :3001

# Restart service
pm2 restart malabar-backend
```

### Database Issues
```bash
# Check database file
ls -la server/malabar.db

# Recreate database (WARNING: loses all data)
rm server/malabar.db
pm2 restart malabar-backend
```

### Frontend Can't Connect
```bash
# Check firewall
sudo ufw status

# Test API endpoint
curl -v http://your-vps-ip:3001/api/health

# Check CORS settings in server.js
```

## 🔒 Security Considerations

### Current Security
- Basic CORS protection
- Input validation
- SQL injection protection via parameterized queries

### Recommended Enhancements
- Rate limiting
- Authentication middleware
- HTTPS enforcement
- Input sanitization

## 📈 Performance Optimization

### Database
- SQLite for small to medium scale
- Consider PostgreSQL for larger deployments
- Add database indexes for frequently queried fields

### API
- Response caching
- Database connection pooling
- Compression middleware

## 🔄 Migration from localStorage

### Automatic Migration
- Backend creates default players on first run
- Existing localStorage data can be imported manually
- No data loss during transition

### Manual Data Import
```javascript
// In browser console, export localStorage data
const players = JSON.parse(localStorage.getItem('players'));
console.log(JSON.stringify(players, null, 2));

// Use this data to populate your database or
// manually recreate players through the admin interface
```

## 🌐 Domain Configuration

### With Domain
```bash
# Install nginx
sudo apt install nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/malabar-event
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Without Domain
- Use VPS IP directly
- Update `config/api.js` with your VPS IP
- Access via `http://your-vps-ip:3001`

## ✅ Verification Checklist

- [ ] Backend server running on port 3001
- [ ] API health check returns success
- [ ] Frontend can connect to backend
- [ ] Players data loads from database
- [ ] Changes persist between sessions
- [ ] Multiple users see same data
- [ ] Firewall allows port 3001
- [ ] Database file created successfully

## 🆘 Support

If you encounter issues:

1. Check the logs: `pm2 logs malabar-backend`
2. Verify configuration: `config/api.js`
3. Test API endpoints manually
4. Check firewall and network settings
5. Ensure Node.js version compatibility

## 🎉 Success!

Once deployed, your site will:
- ✅ Show the same data to all users
- ✅ Save changes globally
- ✅ Work reliably on your VPS
- ✅ Scale to multiple users
- ✅ Maintain data persistence

**Welcome to the global database era! 🌍**
