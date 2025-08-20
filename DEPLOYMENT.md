# Malabar Event Site - VPS Deployment Guide

## Overview
This guide will help you deploy your Malabar Event Site to a VPS server with global data synchronization.

## Architecture
- **Frontend**: Next.js website running on port 3000
- **Backend**: Express.js API server running on port 3001
- **Database**: SQLite for data persistence
- **Synchronization**: Global API endpoints for real-time updates

## Prerequisites
- VPS with Ubuntu/Debian
- Node.js 18+ installed
- Git access to your repository
- SSH access to your VPS

## Deployment Steps

### 1. Prepare Your VPS
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Upload Your Code
```bash
# Clone your repository
git clone <your-repo-url> /var/www/malabar
cd /var/www/malabar

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Backend
```bash
# Navigate to server directory
cd /var/www/malabar/server

# Start the backend server
node server.js
```

**Expected output:**
```
Server running on port 3001
Database initialized
```

### 4. Configure Frontend
```bash
# Build the frontend for production
cd /var/www/malabar
npm run build

# Start the frontend (or use PM2)
npm start
```

### 5. Firewall Configuration
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow frontend port
sudo ufw allow 3000

# Allow backend API port
sudo ufw allow 3001

# Enable firewall
sudo ufw enable
```

### 6. Test Your Setup
```bash
# Test backend API locally
curl http://localhost:3001/api/health
curl http://localhost:3001/api/players

# Test from external machine
curl http://46.173.17.229:3001/api/health
```

## Configuration Files

### Backend Server (server/server.js)
- **Port**: 3001
- **Database**: SQLite (malabar.db)
- **CORS**: Enabled for frontend access

### Frontend API Config (config/api.js)
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://46.173.17.229:3001'  // Backend API
  : 'http://localhost:3001';      // Local development
```

## Database Schema

### Players Table
```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar TEXT,
  socialLinks TEXT,  -- JSON string
  stats TEXT,        -- JSON string
  games TEXT,        -- JSON string
  isOnline INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  isLoggedIn INTEGER DEFAULT 0,
  lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get specific player
- `PUT /api/players/:id` - Update specific player
- `PUT /api/players` - Batch update all players

### Users
- `GET /api/users/current` - Get current logged-in user
- `POST /api/users/current` - Login/logout user

### Health
- `GET /api/health` - Server health check

## Real-Time Updates
The frontend automatically syncs with the backend API:
- Player data updates
- User authentication
- Online status changes
- Game statistics

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo netstat -tlnp | grep :3001

# Kill the process
sudo kill -9 <PID>
```

#### 2. API Connection Failed
- Verify backend server is running on port 3001
- Check firewall allows port 3001
- Ensure CORS is properly configured

#### 3. Database Errors
```bash
# Check database file permissions
ls -la /var/www/malabar/server/malabar.db

# Recreate database if needed
rm malabar.db
node server.js
```

### Logs
```bash
# Backend logs
tail -f /var/www/malabar/server/server.log

# PM2 logs (if using PM2)
pm2 logs malabar-backend
```

## Security Considerations

### Firewall
- Only expose necessary ports (3000, 3001)
- Use UFW for firewall management
- Consider using a reverse proxy (Nginx)

### Environment Variables
- Store sensitive data in environment variables
- Use `.env` files for local development
- Never commit `.env` files to version control

### CORS Configuration
- Restrict CORS origins to your frontend domain
- Consider implementing rate limiting
- Validate all input data

## Performance Optimization

### Database
- Use database indexes for frequently queried fields
- Implement connection pooling for high traffic
- Consider database migrations for schema changes

### Caching
- Implement Redis for session storage
- Cache frequently accessed data
- Use CDN for static assets

### Monitoring
- Set up process monitoring with PM2
- Monitor server resources (CPU, memory, disk)
- Implement health checks and alerts

## Nginx Configuration (Optional)

For production use, consider setting up Nginx as a reverse proxy:

```nginx
# Frontend (port 3000)
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (port 3001)
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Migration from localStorage

### Frontend Changes
- Replace `localStorage.getItem()` with `apiService.getPlayers()`
- Replace `localStorage.setItem()` with `apiService.updatePlayer()`
- Update authentication to use backend API

### Data Migration
- Export existing localStorage data
- Import data to backend database
- Verify data integrity after migration

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Verify network connectivity
4. Test API endpoints individually

## Next Steps

After successful deployment:
1. Set up SSL certificates (Let's Encrypt)
2. Configure automatic backups
3. Set up monitoring and alerts
4. Implement CI/CD pipeline

---

**Happy Deploying! 🚀**
