#!/bin/bash

# Malabar Event Site VPS Deployment Script
# Make sure to run this from your project root directory

echo "🚀 Starting Malabar Event Site deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Create server directory if it doesn't exist
mkdir -p server

echo "📦 Installing backend dependencies..."
cd server
npm install

echo "🔧 Building frontend..."
cd ..
npm run build

echo "📋 Creating deployment configuration..."

# Create production config
cat > config/api.js << 'EOF'
// API Configuration for VPS
const API_BASE_URL = 'http://your-vps-ip:3001';  // CHANGE THIS TO YOUR VPS IP

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  HEALTH: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL;
EOF

echo "📝 Creating systemd service file..."

# Create systemd service file
sudo tee /etc/systemd/system/malabar-backend.service > /dev/null << EOF
[Unit]
Description=Malabar Event Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

echo "🔒 Setting up firewall..."
sudo ufw allow 3001

echo "📊 Starting backend service..."
sudo systemctl daemon-reload
sudo systemctl enable malabar-backend
sudo systemctl start malabar-backend

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit config/api.js and change 'your-vps-ip' to your actual VPS IP"
echo "2. Upload the entire project folder to your VPS"
echo "3. Run 'sudo systemctl status malabar-backend' to check if backend is running"
echo "4. Test the API: curl http://your-vps-ip:3001/api/health"
echo ""
echo "🌐 Your site will now use global database instead of localStorage!"
echo "🔄 All users will see the same data in real-time!"
