#!/usr/bin/env node

/**
 * 🔥 БЫСТРЫЙ ТЕСТ - проверяем что координаты работают
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function quickTest() {
  console.log('🔥 БЫСТРЫЙ ТЕСТ КООРДИНАТ');
  console.log('========================');
  
  try {
    // 1. Проверяем что сервер работает
    console.log('\n1. Проверка сервера...');
    const health = await axios.get(`${API_BASE}/api/health`);
    console.log(`✅ Сервер работает: ${health.status}`);
    
    // 2. Получаем игроков
    console.log('\n2. Получение игроков...');
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    console.log(`✅ Игроков получено: ${playersResponse.data.players.length}`);
    
    if (playersResponse.data.players.length === 0) {
      console.log('❌ Нет игроков для тестирования');
      return;
    }
    
    const testPlayer = playersResponse.data.players[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Обновляем координаты через старый endpoint
    console.log('\n3. Обновление координат...');
    const newX = Math.round(Math.random() * 800);
    const newY = Math.round(Math.random() * 600);
    
    console.log(`📤 Отправляем новые координаты: x=${newX}, y=${newY}`);
    
    const updateResponse = await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
      x: newX,
      y: newY
    });
    
    console.log(`✅ Обновление успешно: ${updateResponse.status}`);
    console.log(`📋 Ответ сервера:`, updateResponse.data);
    
    // 4. Проверяем что координаты обновились
    console.log('\n4. Проверка результата...');
    const checkResponse = await axios.get(`${API_BASE}/api/players`);
    const updatedPlayer = checkResponse.data.players.find(p => p.id === testPlayer.id);
    
    console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    
    if (updatedPlayer.x === newX && updatedPlayer.y === newY) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕН! Координаты работают!');
      console.log('🔥 Теперь в браузере HTTP 500 должен исчезнуть!');
    } else {
      console.log('\n❌ ТЕСТ ПРОВАЛЕН! Координаты не обновились!');
      console.log(`Ожидалось: x=${newX}, y=${newY}`);
      console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА:', error.response?.status || error.message);
    if (error.response?.data) {
      console.error('📋 Детали:', error.response.data);
    }
    
    console.log('\n💡 РЕШЕНИЯ:');
    console.log('1. Перезапустите сервер: cd server && node server.js');
    console.log('2. Проверьте что сервер запущен на порту 3001');
    console.log('3. Запустите диагностику: node diagnose-and-fix-db.js');
  }
}

quickTest();
