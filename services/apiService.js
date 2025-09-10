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
    console.log(`🎯 API: Updating coordinates for player ${id}: (${x}, ${y})`);
    
    try {
      // 1. Сначала получаем текущие данные игрока
      console.log(`📥 API: Getting current player data for ${id}...`);
      const currentPlayer = await this.getPlayer(id);
      console.log(`📋 API: Current player data:`, currentPlayer);
      
      // 2. Обновляем только координаты, сохраняя остальные поля
      const updatedPlayer = {
        ...currentPlayer,
        x: parseFloat(x),
        y: parseFloat(y)
      };
      
      console.log(`📤 API: Sending full player update with new coordinates...`);
      
      // 3. Используем существующий PUT endpoint
      const result = await this.updatePlayer(id, updatedPlayer);
      console.log(`✅ API: Coordinates updated successfully via PUT:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ API: Failed to update coordinates for player ${id}:`, error);
      throw error;
    }
  }
}

export default new ApiService();
