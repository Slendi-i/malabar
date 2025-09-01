// API Configuration
// Flexible configuration for different environments

// Определяем базовый URL API
const getApiBaseUrl = () => {
  // Если мы в браузере, пытаемся определить на основе текущего хоста
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // Если это известные домены или IP
    if (host === 'vet-klinika-moscow.ru' || host === '46.173.17.229') {
      return `http://${host}:3001`;
    }
    
    // Для локальной разработки
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Fallback - пытаемся использовать текущий хост
    return `http://${host}:3001`;
  }
  
  // Server-side rendering или другие случаи
  return process.env.NODE_ENV === 'production'
    ? 'http://46.173.17.229:3001'  // VPS сервер по умолчанию
    : 'http://localhost:3001';     // Локальная разработка
};

const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  PLAYERS_UPDATES: `${API_BASE_URL}/api/players/updates`,
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  HEALTH: `${API_BASE_URL}/api/health`,
  WEBSOCKET: API_BASE_URL.replace('http', 'ws') + '/ws'
};

// Для отладки
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    host: window.location.hostname,
    baseUrl: API_BASE_URL,
    environment: process.env.NODE_ENV
  });
}

export default API_BASE_URL;
