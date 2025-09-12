#!/usr/bin/env node

/**
 * 🔥 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ - проверяем что endpoint работает
 */

const API_BASE = 'http://localhost:3001';

async function finalFix() {
  console.log('🔥 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ HTTP 404');
  console.log('=================================');
  
  try {
    // 1. Проверяем что сервер работает
    console.log('\n1. Проверка сервера...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Сервер не отвечает: ${healthResponse.status}`);
    }
    console.log('✅ Сервер работает');
    
    // 2. Получаем игроков
    console.log('\n2. Получение игроков...');
    const playersResponse = await fetch(`${API_BASE}/api/players`);
    const playersData = await playersResponse.json();
    const players = playersData.players;
    
    if (players.length === 0) {
      throw new Error('Нет игроков для тестирования');
    }
    
    const testPlayer = players[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    
    // 3. Тестируем PATCH endpoint
    console.log('\n3. Тест PATCH /api/coordinates/:id...');
    const testX = 123;
    const testY = 456;
    
    console.log(`📤 PATCH ${API_BASE}/api/coordinates/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX}, y: ${testY}}`);
    
    const patchResponse = await fetch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: testX,
        y: testY
      })
    });
    
    console.log(`📊 PATCH статус: ${patchResponse.status}`);
    
    if (patchResponse.status === 404) {
      console.log('❌ HTTP 404 - endpoint не найден!');
      console.log('\n💡 РЕШЕНИЯ:');
      console.log('1. Перезапустите сервер: cd server && node server.js');
      console.log('2. Проверьте что нет ошибок запуска');
      console.log('3. Проверьте что endpoint зарегистрирован в server.js');
      return;
    }
    
    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      console.log(`❌ PATCH ошибка: ${patchResponse.status} - ${errorText}`);
      return;
    }
    
    const patchData = await patchResponse.json();
    console.log(`✅ PATCH успешен!`, patchData);
    
    // 4. Проверяем результат
    console.log('\n4. Проверка результата...');
    const checkResponse = await fetch(`${API_BASE}/api/players`);
    const checkData = await checkResponse.json();
    const updatedPlayer = checkData.players.find(p => p.id === testPlayer.id);
    
    console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    
    if (updatedPlayer.x === testX && updatedPlayer.y === testY) {
      console.log('\n🎉 ПРОБЛЕМА РЕШЕНА!');
      console.log('🔥 HTTP 404 исчез! Endpoint работает!');
      console.log('\n📱 Теперь в браузере:');
      console.log('1. Откройте http://localhost:3000');
      console.log('2. Войдите как admin/admin');
      console.log('3. Перетащите любую фишку');
      console.log('4. HTTP 404 больше не появится!');
    } else {
      console.log('\n❌ Координаты не обновились!');
      console.log(`Ожидалось: x=${testX}, y=${testY}`);
      console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: cd server && node server.js');
    }
  }
}

finalFix();
