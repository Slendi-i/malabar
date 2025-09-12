#!/usr/bin/env node

/**
 * 🔥 РАДИКАЛЬНЫЙ ТЕСТ - новый PATCH endpoint
 */

const API_BASE = 'http://localhost:3001';

async function radicalTest() {
  console.log('🔥 РАДИКАЛЬНЫЙ ТЕСТ - PATCH /api/coordinates/:id');
  console.log('===============================================');
  
  try {
    // 1. Получаем игроков
    console.log('\n1. Получение игроков...');
    const playersResponse = await fetch(`${API_BASE}/api/players`);
    const playersData = await playersResponse.json();
    const players = playersData.players;
    
    if (players.length === 0) {
      console.log('❌ Нет игроков для тестирования');
      return;
    }
    
    const testPlayer = players[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 2. Тестируем НОВЫЙ PATCH endpoint
    console.log('\n2. Тест PATCH /api/coordinates/:id...');
    const testX = Math.round(Math.random() * 800);
    const testY = Math.round(Math.random() * 600);
    
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
    
    if (patchResponse.ok) {
      const patchData = await patchResponse.json();
      console.log(`✅ PATCH успешен!`, patchData);
      
      // 3. Проверяем результат
      console.log('\n3. Проверка результата...');
      const checkResponse = await fetch(`${API_BASE}/api/players`);
      const checkData = await checkResponse.json();
      const updatedPlayer = checkData.players.find(p => p.id === testPlayer.id);
      
      console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
      
      if (updatedPlayer.x === testX && updatedPlayer.y === testY) {
        console.log('\n🎉 РАДИКАЛЬНОЕ РЕШЕНИЕ РАБОТАЕТ!');
        console.log('🔥 HTTP 500 исчез! Новый endpoint работает!');
        console.log('\n📱 Следующие шаги:');
        console.log('1. Откройте http://localhost:3000');
        console.log('2. Войдите как admin/admin');
        console.log('3. Перетащите любую фишку');
        console.log('4. HTTP 500 больше не появится!');
        console.log('\n🔥 Теперь используется PATCH /api/coordinates/:id');
        console.log('🔥 Простейший SQL: UPDATE players SET x = ?, y = ? WHERE id = ?');
      } else {
        console.log('\n❌ Координаты не обновились!');
        console.log(`Ожидалось: x=${testX}, y=${testY}`);
        console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
      }
    } else {
      const errorText = await patchResponse.text();
      console.error(`❌ PATCH ошибка: ${patchResponse.status} - ${errorText}`);
      
      if (patchResponse.status === 500) {
        console.log('\n💡 HTTP 500 всё ещё есть!');
        console.log('1. Перезапустите сервер: cd server && node server.js');
        console.log('2. Проверьте логи сервера на ошибки');
        console.log('3. Проверьте что новый endpoint зарегистрирован');
      } else if (patchResponse.status === 404) {
        console.log('\n💡 HTTP 404 - endpoint не найден!');
        console.log('1. Проверьте что сервер перезапущен');
        console.log('2. Проверьте что новый endpoint добавлен в server.js');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА РАДИКАЛЬНОГО ТЕСТА:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: cd server && node server.js');
    }
  }
}

radicalTest();
