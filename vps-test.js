#!/usr/bin/env node

/**
 * 🎯 VPS ТЕСТ - без внешних зависимостей
 * Использует только встроенный fetch (Node.js 18+)
 */

const API_BASE = 'http://localhost:3001';

async function vpsTest() {
  console.log('🎯 VPS ТЕСТ КООРДИНАТ');
  console.log('====================');
  
  try {
    // 1. Проверяем сервер
    console.log('\n1. Проверка сервера...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    console.log(`✅ Сервер работает: ${healthResponse.status}`);
    
    // 2. Получаем игроков
    console.log('\n2. Получение игроков...');
    const playersResponse = await fetch(`${API_BASE}/api/players`);
    const playersData = await playersResponse.json();
    const players = playersData.players;
    console.log(`✅ Игроков получено: ${players.length}`);
    
    if (players.length === 0) {
      console.log('❌ Нет игроков для тестирования');
      return;
    }
    
    const testPlayer = players[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Тестируем PUT запрос
    console.log('\n3. Тест PUT запроса...');
    const testX = Math.round(Math.random() * 800);
    const testY = Math.round(Math.random() * 600);
    
    console.log(`📤 PUT ${API_BASE}/api/players/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX}, y: ${testY}}`);
    
    const putResponse = await fetch(`${API_BASE}/api/players/${testPlayer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: testX,
        y: testY
      })
    });
    
    console.log(`✅ PUT статус: ${putResponse.status}`);
    
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.error(`❌ PUT ошибка: ${putResponse.status} - ${errorText}`);
      return;
    }
    
    const putData = await putResponse.json();
    console.log(`📋 PUT ответ:`, putData);
    
    // 4. Проверяем результат
    console.log('\n4. Проверка результата...');
    const checkResponse = await fetch(`${API_BASE}/api/players`);
    const checkData = await checkResponse.json();
    const updatedPlayer = checkData.players.find(p => p.id === testPlayer.id);
    
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
    console.error('\n❌ ОШИБКА VPS ТЕСТА:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 РЕШЕНИЯ:');
      console.log('1. Запустите сервер: cd server && node server.js');
      console.log('2. Проверьте что сервер запущен на порту 3001');
      console.log('3. Проверьте что нет ошибок запуска сервера');
    } else if (error.message.includes('fetch')) {
      console.log('\n💡 РЕШЕНИЯ:');
      console.log('1. Обновите Node.js до версии 18+');
      console.log('2. Или установите axios: npm install axios');
      console.log('3. Или используйте curl для тестирования');
    } else {
      console.log('\n💡 РЕШЕНИЯ:');
      console.log('1. Проверьте подключение к серверу');
      console.log('2. Проверьте логи сервера');
      console.log('3. Запустите диагностику: node diagnose-and-fix-db.js');
    }
  }
}

vpsTest();
