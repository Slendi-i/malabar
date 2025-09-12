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

  // 🚨 ЭКСТРЕННОЕ РЕШЕНИЕ: Максимально простой метод координат
  async updatePlayerCoordinates(id, x, y) {
    console.log(`🚨 EMERGENCY API: Start updating coordinates for player ${id}: (${x}, ${y})`);
    
    try {
      // Проверяем базовые данные
      if (!id) throw new Error('No player ID provided');
      if (x === undefined || x === null) throw new Error('No X coordinate provided');
      if (y === undefined || y === null) throw new Error('No Y coordinate provided');
      
      const playerId = parseInt(id);
      if (isNaN(playerId) || playerId <= 0) {
        throw new Error(`Invalid player ID: ${id}`);
      }
      
      const validX = parseFloat(x);
      const validY = parseFloat(y);
      
      if (isNaN(validX) || isNaN(validY)) {
        throw new Error(`Invalid coordinates: x=${x} (${typeof x}), y=${y} (${typeof y})`);
      }
      
      const coordinatesData = { x: validX, y: validY };
      const url = `${API_ENDPOINTS.COORDINATES}/${playerId}`;
      
      console.log(`🚨 EMERGENCY API: Sending to URL: ${url}`);
      console.log(`🚨 EMERGENCY API: Data:`, coordinatesData);
      
      // ПРЯМОЙ fetch без обёртки для максимальной диагностики
      console.log('🚨 EMERGENCY API: Starting fetch...');
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coordinatesData),
      });
      
      console.log(`🚨 EMERGENCY API: Response status: ${response.status}`);
      console.log(`🚨 EMERGENCY API: Response ok: ${response.ok}`);
      console.log(`🚨 EMERGENCY API: Response headers:`, [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log(`🚨 EMERGENCY API: Response text:`, responseText);
      
      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
        } catch (e) {
          errorDetails = { rawResponse: responseText };
        }
        
        console.error(`🚨 EMERGENCY API: HTTP ${response.status} error:`, errorDetails);
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorDetails)}`);
      }
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('🚨 EMERGENCY API: Failed to parse response JSON:', e);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      console.log(`🚨 EMERGENCY API: Parsed response:`, responseData);
      
      if (responseData.success) {
        console.log(`✅ EMERGENCY API: Coordinates updated successfully!`);
        return responseData;
      } else {
        throw new Error(`Server returned success=false: ${JSON.stringify(responseData)}`);
      }
      
    } catch (error) {
      console.error(`❌ EMERGENCY API: COMPLETE FAILURE for player ${id}:`, error);
      console.error(`❌ EMERGENCY API: Error stack:`, error.stack);
      
      // 🔄 ЕДИНСТВЕННЫЙ FALLBACK - старый endpoint
      try {
        console.log(`🔄 EMERGENCY FALLBACK: Trying old PUT endpoint...`);
        return await this.updatePlayerCoordinatesFallback(id, x, y);
      } catch (fallbackError) {
        console.error(`❌ EMERGENCY FALLBACK: Also failed:`, fallbackError);
        throw new Error(`All methods failed. Original: ${error.message}. Fallback: ${fallbackError.message}`);
      }
    }
  }

  // 🚀 FALLBACK метод через старый endpoint
  async updatePlayerCoordinatesFallback(id, x, y) {
    console.log(`🔄 FALLBACK: Используем старый PUT endpoint для игрока ${id}`);
    
    const coordinatesData = {
      x: parseFloat(x),
      y: parseFloat(y)
    };
    
    const response = await this.fetchWithErrorHandling(
      `${API_ENDPOINTS.PLAYERS}/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coordinatesData),
      }
    );
    
    console.log(`✅ FALLBACK: Coordinates updated via old method`);
    return response;
  }
}

export default new ApiService();
