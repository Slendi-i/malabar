#!/usr/bin/env node

/**
 * 🔧 ТЕСТ ИСПРАВЛЕНИЯ - проверяем что HTTP 500 исчез
 */

const API_BASE = 'http://localhost:3001';

async function testFix() {
  console.log('🔧 ТЕСТ ИСПРАВЛЕНИЯ HTTP 500');
  console.log('============================');
  
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
    
    // 2. Тестируем PUT запрос
    console.log('\n2. Тест PUT запроса...');
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
    
    console.log(`📊 PUT статус: ${putResponse.status}`);
    
    if (putResponse.ok) {
      const putData = await putResponse.json();
      console.log(`✅ PUT успешен!`, putData);
      
      // 3. Проверяем результат
      console.log('\n3. Проверка результата...');
      const checkResponse = await fetch(`${API_BASE}/api/players`);
      const checkData = await checkResponse.json();
      const updatedPlayer = checkData.players.find(p => p.id === testPlayer.id);
      
      console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
      
      if (updatedPlayer.x === testX && updatedPlayer.y === testY) {
        console.log('\n🎉 ИСПРАВЛЕНИЕ РАБОТАЕТ!');
        console.log('🔥 HTTP 500 исчез! Теперь в браузере должно работать!');
        console.log('\n📱 Следующие шаги:');
        console.log('1. Откройте http://localhost:3000');
        console.log('2. Войдите как admin/admin');
        console.log('3. Перетащите любую фишку');
        console.log('4. HTTP 500 больше не появится!');
      } else {
        console.log('\n❌ Координаты не обновились!');
        console.log(`Ожидалось: x=${testX}, y=${testY}`);
        console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
      }
    } else {
      const errorText = await putResponse.text();
      console.error(`❌ PUT ошибка: ${putResponse.status} - ${errorText}`);
      
      if (putResponse.status === 500) {
        console.log('\n💡 HTTP 500 всё ещё есть!');
        console.log('1. Перезапустите сервер: cd server && node server.js');
        console.log('2. Проверьте логи сервера на ошибки');
        console.log('3. Запустите диагностику: node diagnose-and-fix-db.js');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: cd server && node server.js');
    }
  }
}

testFix();
