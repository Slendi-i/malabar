// API Configuration
// VPS Server Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://46.173.17.229:3001'  // Your VPS server
  : 'http://localhost:3001';      // Local development

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  PLAYERS_UPDATES: `${API_BASE_URL}/api/players/updates`,
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  HEALTH: `${API_BASE_URL}/api/health`,
  WEBSOCKET: API_BASE_URL.replace('http', 'ws') + '/ws'
};

export default API_BASE_URL;
