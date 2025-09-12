#!/usr/bin/env node

/**
 * 🎯 ФИНАЛЬНЫЙ ТЕСТ - проверяем что всё работает
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function finalTest() {
  console.log('🎯 ФИНАЛЬНЫЙ ТЕСТ КООРДИНАТ');
  console.log('===========================');
  
  try {
    // 1. Проверяем сервер
    console.log('\n1. Проверка сервера...');
    const health = await axios.get(`${API_BASE}/api/health`);
    console.log(`✅ Сервер работает: ${health.status}`);
    
    // 2. Получаем игроков
    console.log('\n2. Получение игроков...');
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    console.log(`✅ Игроков получено: ${players.length}`);
    
    if (players.length === 0) {
      console.log('❌ Нет игроков для тестирования');
      return;
    }
    
    const testPlayer = players[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Тестируем точно как в коде клиента
    console.log('\n3. Тест PUT запроса (как в коде)...');
    const testX = Math.round(Math.random() * 800);
    const testY = Math.round(Math.random() * 600);
    
    console.log(`📤 PUT ${API_BASE}/api/players/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX}, y: ${testY}}`);
    
    const response = await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
      x: testX,
      y: testY
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ PUT успешен: ${response.status}`);
    console.log(`📋 Ответ:`, response.data);
    
    // 4. Проверяем результат
    console.log('\n4. Проверка результата...');
    const checkResponse = await axios.get(`${API_BASE}/api/players`);
    const updatedPlayer = checkResponse.data.players.find(p => p.id === testPlayer.id);
    
    console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    
    if (updatedPlayer.x === testX && updatedPlayer.y === testY) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕН! Координаты работают!');
      console.log('🔥 Теперь в браузере должно работать без HTTP 500!');
      console.log('\n📱 Следующие шаги:');
      console.log('1. Откройте http://localhost:3000');
      console.log('2. Войдите как admin/admin');
      console.log('3. Перетащите любую фишку');
      console.log('4. HTTP 500 должен исчезнуть!');
    } else {
      console.log('\n❌ ТЕСТ ПРОВАЛЕН! Координаты не обновились!');
      console.log(`Ожидалось: x=${testX}, y=${testY}`);
      console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ФИНАЛЬНОГО ТЕСТА:');
    console.error(`Статус: ${error.response?.status}`);
    console.error(`Сообщение: ${error.message}`);
    
    if (error.response?.data) {
      console.error('Данные ошибки:', error.response.data);
    }
    
    console.log('\n💡 РЕШЕНИЯ:');
    console.log('1. Перезапустите сервер: cd server && node server.js');
    console.log('2. Проверьте что нет ошибок запуска сервера');
    console.log('3. Запустите диагностику: node diagnose-and-fix-db.js');
    console.log('4. Проверьте что порт 3001 свободен');
  }
}

finalTest();
