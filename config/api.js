// API Configuration
// Robust configuration for VPS deployment

// Определяем базовый URL API с улучшенной логикой для VPS
const getApiBaseUrl = () => {
  // Если мы в браузере, определяем на основе текущего хоста
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const isHttps = window.location.protocol === 'https:';
    
    console.log('🔧 API Config - определяем URL для хоста:', host, 'https:', isHttps);
    
    // Нормализуем www
    const bareHost = host.startsWith('www.') ? host.slice(4) : host;
    
    // VPS сервер - домен и IP
    if (bareHost === 'vet-klinika-moscow.ru') {
      const apiUrl = `${isHttps ? 'https' : 'http'}://vet-klinika-moscow.ru:3001`;
      console.log('✅ API Config - используем домен VPS:', apiUrl);
      return apiUrl;
    }
    
    if (bareHost === '46.173.17.229') {
      const apiUrl = `${isHttps ? 'https' : 'http'}://46.173.17.229:3001`;
      console.log('✅ API Config - используем IP VPS:', apiUrl);
      return apiUrl;
    }
    
    // Локальная разработка
    if (bareHost === 'localhost' || bareHost === '127.0.0.1') {
      const apiUrl = 'http://localhost:3001';
      console.log('✅ API Config - локальная разработка:', apiUrl);
      return apiUrl;
    }
    
    // Fallback - если работаем на нестандартном хосте, пробуем с VPS IP
    console.warn('⚠️ API Config - неизвестный хост, используем VPS IP как fallback');
    return `${isHttps ? 'https' : 'http'}://46.173.17.229:3001`;
  }
  
  // Server-side rendering - принудительно используем VPS на продакшене
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VPS_MODE === 'true';
  const apiUrl = isProduction ? 'http://46.173.17.229:3001' : 'http://localhost:3001';
  console.log('🖥️ API Config - SSR режим:', apiUrl, '(production:', isProduction, ')');
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  PLAYERS_UPDATES: `${API_BASE_URL}/api/players/updates`,
  COORDINATES: `${API_BASE_URL}/api/coordinates`, // 🚀 НОВЫЙ endpoint для координат
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
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
