// API Configuration
// Robust configuration for VPS deployment

// Определяем базовый URL API с улучшенной логикой для VPS
const getApiBaseUrl = () => {
  // Если мы в браузере, определяем на основе текущего хоста
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const isHttps = window.location.protocol === 'https:';
    
    console.log('🔧 API Config - определяем URL для хоста:', host, 'https:', isHttps);
    
    // Нормализуем www и делаем редирект если нужно
    const bareHost = host.startsWith('www.') ? host.slice(4) : host;
    
    // Редирект с www на без www для нового домена
    if (host.startsWith('www.malabar-event.ru')) {
      console.warn('⚠️ API Config - редирект с www на без www');
      window.location.replace('https://malabar-event.ru' + window.location.pathname + window.location.search);
      return;
    }
    
    // VPS сервер - новый домен (используем same-origin без явного порта)
    if (bareHost === 'malabar-event.ru') {
      const apiUrl = `${window.location.protocol}//${bareHost}`;
      console.log('✅ API Config - same-origin для нового домена:', apiUrl);
      return apiUrl;
    }
    
    // Обратная совместимость со старым доменом (с редиректом)
    if (bareHost === 'vet-klinika-moscow.ru') {
      console.warn('⚠️ API Config - старый домен, перенаправляем на новый');
      // Редирект на новый домен
      if (typeof window !== 'undefined') {
        window.location.replace('https://malabar-event.ru' + window.location.pathname + window.location.search);
        return;
      }
      // Для SSR используем новый домен
      const apiUrl = `https://malabar-event.ru:3001`;
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
    
    // Fallback - если работаем на нестандартном хосте, используем same-origin
    console.warn('⚠️ API Config - неизвестный хост, используем same-origin как fallback');
    return `${window.location.protocol}//${host}`;
  }
  
  // Server-side rendering - принудительно используем VPS на продакшене
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VPS_MODE === 'true';
  // На SSR в продакшене используем домен, если задан ENV, иначе IP
  const prodBase = process.env.PUBLIC_BASE_URL || 'https://malabar-event.ru';
  const apiUrl = isProduction ? prodBase : 'http://localhost:3001';
  console.log('🖥️ API Config - SSR режим:', apiUrl, '(production:', isProduction, ')');
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Явная настройка WebSocket адреса: для продакшена используем :3001 на новом домене
const getWebSocketUrl = (apiBaseUrl) => {
  // Браузер
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss' : 'ws';

    // Новый домен: всегда на :3001
    if (host === 'malabar-event.ru' || host === 'www.malabar-event.ru') {
      return `${wsProto}://malabar-event.ru:3001/ws`;
    }

    // Доступ по IP
    if (host === '46.173.17.229') {
      return `${wsProto}://46.173.17.229:3001/ws`;
    }

    // Локальная разработка
    if (host === 'localhost' || host === '127.0.0.1') {
      return `ws://localhost:3001/ws`;
    }

    // Fallback: из базового URL
    try {
      return apiBaseUrl.replace(/^http/, 'ws') + '/ws';
    } catch (e) {
      return `${wsProto}://${host}:3001/ws`;
    }
  }

  // SSR: в проде используем новый домен с :3001, иначе локалку
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VPS_MODE === 'true';
  return isProduction ? 'wss://malabar-event.ru:3001/ws' : 'ws://localhost:3001/ws';
};

export const API_ENDPOINTS = {
  PLAYERS: `${API_BASE_URL}/api/players`,
  PLAYERS_UPDATES: `${API_BASE_URL}/api/players/updates`,
  COORDINATES: `${API_BASE_URL}/api/coordinates`, // 🚀 НОВЫЙ endpoint для координат
  CURRENT_USER: `${API_BASE_URL}/api/users/current`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  HEALTH: `${API_BASE_URL}/api/health`,
  WEBSOCKET: getWebSocketUrl(API_BASE_URL)
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
