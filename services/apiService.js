import { API_ENDPOINTS } from '../config/api';

class ApiService {
  // Generic fetch wrapper with error handling
    async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        credentials: 'include', // Включаем cookies для авторизации
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
    try {
      return await this.fetchWithErrorHandling(API_ENDPOINTS.CURRENT_USER);
    } catch (error) {
      if (error.message.includes('401')) {
        // Не авторизован - возвращаем null
        return null;
      }
      throw error;
    }
  }

  async setCurrentUser(userData) {
    return this.fetchWithErrorHandling(API_ENDPOINTS.CURRENT_USER, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Авторизация (используем setCurrentUser для логина)
  async login(username, password) {
    return this.setCurrentUser({
      username: username,
      isLoggedIn: true
    });
  }

  async logout() {
    return this.setCurrentUser({
      username: '',
      isLoggedIn: false
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

  // 🔥 РАДИКАЛЬНО ПРОСТОЙ - только новый endpoint!
  async updatePlayerCoordinates(id, x, y) {
    console.log(`🔥 RADICAL: Обновление координат игрока ${id}: (${x}, ${y})`);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.COORDINATES}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: parseFloat(x),
          y: parseFloat(y)
        }),
      });
      
      console.log(`🔥 RADICAL: Статус ответа: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔥 RADICAL: HTTP ${response.status} ошибка:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ RADICAL: Координаты обновлены!`, responseData);
      return responseData;
      
    } catch (error) {
      console.error(`❌ RADICAL: Ошибка:`, error);
      throw error;
    }
  }
}

export default new ApiService();
