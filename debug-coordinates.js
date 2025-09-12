#!/usr/bin/env node

/**
 * 🔍 ОТЛАДКА КООРДИНАТ - точная диагностика
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function debugCoordinates() {
  console.log('🔍 ОТЛАДКА КООРДИНАТ');
  console.log('===================');
  
  try {
    // 1. Проверяем сервер
    console.log('\n1. Проверка сервера...');
    const health = await axios.get(`${API_BASE}/api/health`);
    console.log(`✅ Сервер: ${health.status}`);
    
    // 2. Получаем игроков
    console.log('\n2. Получение игроков...');
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    console.log(`✅ Игроков: ${players.length}`);
    
    if (players.length === 0) {
      console.log('❌ Нет игроков!');
      return;
    }
    
    const testPlayer = players[0];
    console.log(`📍 Тестовый игрок: ID=${testPlayer.id}, Name=${testPlayer.name}`);
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Тестируем PUT запрос точно как в коде
    console.log('\n3. Тест PUT запроса...');
    const testX = 123.45;
    const testY = 678.90;
    
    console.log(`📤 Отправляем PUT на: ${API_BASE}/api/players/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX}, y: ${testY}}`);
    
    const putResponse = await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
      x: testX,
      y: testY
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ PUT ответ: ${putResponse.status}`);
    console.log(`📋 Данные ответа:`, putResponse.data);
    
    // 4. Проверяем что обновилось
    console.log('\n4. Проверка обновления...');
    const checkResponse = await axios.get(`${API_BASE}/api/players`);
    const updatedPlayer = checkResponse.data.players.find(p => p.id === testPlayer.id);
    
    console.log(`📍 Новые координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    
    if (updatedPlayer.x === testX && updatedPlayer.y === testY) {
      console.log('\n🎉 ВСЁ РАБОТАЕТ! PUT endpoint функционирует!');
      console.log('🔥 Проблема НЕ в сервере - проблема в клиенте!');
    } else {
      console.log('\n❌ PUT endpoint НЕ работает!');
      console.log(`Ожидалось: x=${testX}, y=${testY}`);
      console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ОТЛАДКИ:');
    console.error(`Статус: ${error.response?.status}`);
    console.error(`Сообщение: ${error.message}`);
    
    if (error.response?.data) {
      console.error('Данные ошибки:', error.response.data);
    }
    
    if (error.response?.status === 500) {
      console.log('\n💡 HTTP 500 - проблема на сервере!');
      console.log('1. Проверьте логи сервера');
      console.log('2. Запустите: node diagnose-and-fix-db.js');
      console.log('3. Перезапустите сервер');
    } else if (error.response?.status === 404) {
      console.log('\n💡 HTTP 404 - endpoint не найден!');
      console.log('1. Проверьте что сервер запущен');
      console.log('2. Проверьте URL endpoint');
    } else {
      console.log('\n💡 Другая ошибка - проверьте подключение');
    }
  }
}

debugCoordinates();
