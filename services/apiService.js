import { API_ENDPOINTS } from '../config/api';

class ApiService {
  // Generic fetch wrapper with error handling
    async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      // НЕ возвращаем пустые данные - это заставит frontend перезаписать БД!
      // Пусть frontend сам решает что делать при ошибке
      throw error;
    }
  }

  // Players API
  async getPlayers() {
    return this.fetchWithErrorHandling(API_ENDPOINTS.PLAYERS);
  }

  async updatePlayer(id, playerData) {
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    });
  }

  // Users API
  async getCurrentUser() {
    return this.fetchWithErrorHandling(API_ENDPOINTS.CURRENT_USER);
  }

  async setCurrentUser(userData) {
    return this.fetchWithErrorHandling(API_ENDPOINTS.CURRENT_USER, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Health check
  async healthCheck() {
    return this.fetchWithErrorHandling(API_ENDPOINTS.HEALTH);
  }

  // Batch update players (for efficiency) - Fixed to use single API call
  async batchUpdatePlayers(players) {
    return this.fetchWithErrorHandling(API_ENDPOINTS.PLAYERS, {
      method: 'PUT',
      body: JSON.stringify(players)
    });
  }

  // Update single player with detailed data
  async updatePlayerDetailed(id, playerData) {
    console.log(`Updating player ${id} with data:`, playerData);
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    });
  }

  // Update player games specifically
  async updatePlayerGames(id, games) {
    console.log(`Updating games for player ${id}:`, games);
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/${id}/games`, {
      method: 'POST',
      body: JSON.stringify({ games })
    });
  }

  // Update player social links specifically
  async updatePlayerSocial(id, socialLinks) {
    console.log(`Updating social links for player ${id}:`, socialLinks);
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/${id}/social`, {
      method: 'POST',
      body: JSON.stringify({ socialLinks })
    });
  }

  // Get real-time updates since timestamp
  async getUpdates(since = 0) {
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/updates?since=${since}`);
  }

  // Get specific player by ID
  async getPlayer(id) {
    return this.fetchWithErrorHandling(`${API_ENDPOINTS.PLAYERS}/${id}`);
  }

  // Update player coordinates specifically (for piece dragging)
  async updatePlayerCoordinates(id, x, y) {
    // Проверяем и нормализуем ID
    console.log(`🔍 API DEBUG: Received id:`, id, 'type:', typeof id);
    
    const playerId = parseInt(id);
    if (isNaN(playerId) || playerId <= 0) {
      const error = new Error(`Invalid player ID: ${id} (parsed: ${playerId})`);
      console.error('❌ API: Invalid player ID:', error.message);
      throw error;
    }
    
    const url = `${API_ENDPOINTS.PLAYERS}/${playerId}/coordinates`;
    console.log(`🎯 API: Updating coordinates for player ${playerId}: (${x}, ${y})`);
    console.log(`📡 API: Full URL: ${url}`);
    console.log(`🌍 API: API_ENDPOINTS.PLAYERS:`, API_ENDPOINTS.PLAYERS);
    
    // Проверяем координаты
    const numX = parseFloat(x);
    const numY = parseFloat(y);
    if (isNaN(numX) || isNaN(numY)) {
      const error = new Error(`Invalid coordinates: x=${x}, y=${y}`);
      console.error('❌ API: Invalid coordinates:', error.message);
      throw error;
    }
    
    const payload = { x: numX, y: numY };
    console.log(`📦 API: Payload:`, payload);
    
    try {
      const result = await this.fetchWithErrorHandling(url, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      console.log(`✅ API: Coordinates updated successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ API: Failed to update coordinates for player ${playerId}:`, error);
      console.error(`📍 API: URL was: ${url}`);
      console.error(`📦 API: Payload was:`, payload);
      console.error(`🔧 API: API_ENDPOINTS config:`, API_ENDPOINTS);
      throw error;
    }
  }
}

export default new ApiService();
