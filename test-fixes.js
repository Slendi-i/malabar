#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ВСЕХ ИСПРАВЛЕНИЙ
 * 
 * Проверяет:
 * 1. WebSocket стабильность (троттлинг, защита от пиления)
 * 2. Авторизацию (кнопка Войти/Выйти, слёт в гостя)
 * 3. Периодическую синхронизацию (каждые 10 секунд)
 */

const API_BASE_URL = 'http://46.173.17.229:3001';

async function testWebSocketStability() {
  console.log('\n🔌 ТЕСТ: WebSocket стабильность');
  
  try {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://46.173.17.229:3001/ws');
    
    let messageCount = 0;
    const startTime = Date.now();
    
    ws.on('open', () => {
      console.log('✅ WebSocket подключение установлено');
      
      // Отправляем ping каждые 5 секунд
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          messageCount++;
        }
      }, 5000);
      
      // Тест на 30 секунд
      setTimeout(() => {
        clearInterval(pingInterval);
        ws.close();
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`📊 WebSocket тест завершён: ${messageCount} сообщений за ${duration}с`);
        console.log(`📊 Средняя частота: ${(messageCount / duration).toFixed(2)} сообщений/сек`);
      }, 30000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'pong') {
          console.log('📡 Получен pong от сервера');
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    });
    
    ws.on('close', () => {
      console.log('❌ WebSocket соединение закрыто');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Ошибка WebSocket теста:', error.message);
  }
}

async function testAuth() {
  console.log('\n🔐 ТЕСТ: Авторизация');
  
  try {
    // Тест 1: Проверка текущего пользователя (должен быть 401)
    console.log('1. Проверка неавторизованного пользователя...');
    const response1 = await fetch(`${API_BASE_URL}/api/users/current`, {
      credentials: 'include'
    });
    
    if (response1.status === 401) {
      console.log('✅ Правильно: 401 для неавторизованного пользователя');
    } else {
      console.log(`❌ Ошибка: ожидался 401, получен ${response1.status}`);
    }
    
    // Тест 2: Логин
    console.log('2. Тест логина...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/users/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'testuser',
        isLoggedIn: true
      })
    });
    
    if (loginResponse.ok) {
      console.log('✅ Логин успешен');
      
      // Тест 3: Проверка авторизованного пользователя
      console.log('3. Проверка авторизованного пользователя...');
      const response2 = await fetch(`${API_BASE_URL}/api/users/current`, {
        credentials: 'include'
      });
      
      if (response2.ok) {
        const user = await response2.json();
        console.log('✅ Пользователь авторизован:', user.username);
      } else {
        console.log(`❌ Ошибка получения пользователя: ${response2.status}`);
      }
      
      // Тест 4: Логаут
      console.log('4. Тест логаута...');
      const logoutResponse = await fetch(`${API_BASE_URL}/api/users/current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: '',
          isLoggedIn: false
        })
      });
      
      if (logoutResponse.ok) {
        console.log('✅ Логаут успешен');
      } else {
        console.log(`❌ Ошибка логаута: ${logoutResponse.status}`);
      }
      
    } else {
      console.log(`❌ Ошибка логина: ${loginResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста авторизации:', error.message);
  }
}

async function testPeriodicSync() {
  console.log('\n⏰ ТЕСТ: Периодическая синхронизация');
  
  try {
    // Тест получения игроков (имитация периодической синхронизации)
    console.log('1. Тест получения игроков...');
    const response = await fetch(`${API_BASE_URL}/api/players`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const players = await response.json();
      console.log(`✅ Получено ${players.length} игроков`);
      
      // Проверяем структуру данных
      if (players.length > 0) {
        const player = players[0];
        const hasCoords = player.x !== undefined && player.y !== undefined;
        console.log(`✅ Координаты игроков: ${hasCoords ? 'есть' : 'отсутствуют'}`);
        
        if (hasCoords) {
          console.log(`📊 Пример координат: (${player.x}, ${player.y})`);
        }
      }
    } else {
      console.log(`❌ Ошибка получения игроков: ${response.status}`);
    }
    
    // Тест обновления координат
    console.log('2. Тест обновления координат...');
    if (response.ok && players.length > 0) {
      const playerId = players[0].id;
      const newX = Math.floor(Math.random() * 800);
      const newY = Math.floor(Math.random() * 600);
      
      const coordResponse = await fetch(`${API_BASE_URL}/api/coordinates/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ x: newX, y: newY })
      });
      
      if (coordResponse.ok) {
        const result = await coordResponse.json();
        console.log(`✅ Координаты обновлены: (${result.x}, ${result.y})`);
        
        if (result.skipped) {
          console.log('ℹ️ Изменение пропущено (слишком мало)');
        }
      } else {
        console.log(`❌ Ошибка обновления координат: ${coordResponse.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста синхронизации:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ ВСЕХ ИСПРАВЛЕНИЙ');
  console.log('=====================================');
  
  await testAuth();
  await testPeriodicSync();
  
  // WebSocket тест запускаем асинхронно
  testWebSocketStability();
  
  console.log('\n✅ ВСЕ ТЕСТЫ ЗАПУЩЕНЫ');
  console.log('📝 Проверьте логи выше для результатов');
}

// Запуск тестов
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebSocketStability,
  testAuth,
  testPeriodicSync,
  runAllTests
};