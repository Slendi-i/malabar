// API Configuration
// VPS Server Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://46.173.17.229:3000'  // Your VPS server
  : 'http://localhost:3000';

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  HEALTH: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL;
