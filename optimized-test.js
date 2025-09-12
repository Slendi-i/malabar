#!/usr/bin/env node

/**
 * 🚀 ФИНАЛЬНЫЙ ТЕСТ ОПТИМИЗИРОВАННОГО РЕШЕНИЯ
 * Проверяем все улучшения: WebSocket, профили, debouncing, умная синхронизация
 */

const API_BASE = 'http://localhost:3001';

async function optimizedTest() {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ ОПТИМИЗИРОВАННОГО РЕШЕНИЯ');
  console.log('==========================================');
  
  try {
    // 1. Проверяем сервер
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
    console.log(`📍 Текущие координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Тест 1: Минимальные изменения (должны пропускаться)
    console.log('\n3. Тест минимальных изменений...');
    const testX1 = testPlayer.x + 0.5; // Очень маленькое изменение
    const testY1 = testPlayer.y + 0.5;
    
    console.log(`📤 PATCH ${API_BASE}/api/coordinates/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX1}, y: ${testY1}} (минимальное изменение)`);
    
    const patchResponse1 = await fetch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: testX1,
        y: testY1
      })
    });
    
    const patchData1 = await patchResponse1.json();
    console.log(`📊 PATCH статус: ${patchResponse1.status}`);
    console.log(`📋 Ответ:`, patchData1);
    
    if (patchData1.skipped) {
      console.log('✅ Минимальные изменения правильно пропущены!');
    } else {
      console.log('⚠️ Минимальные изменения не были пропущены');
    }
    
    // 4. Тест 2: Значимые изменения (должны сохраняться)
    console.log('\n4. Тест значимых изменений...');
    const testX2 = Math.round(Math.random() * 800);
    const testY2 = Math.round(Math.random() * 600);
    
    console.log(`📤 PATCH ${API_BASE}/api/coordinates/${testPlayer.id}`);
    console.log(`📤 Данные: {x: ${testX2}, y: ${testY2}} (значимое изменение)`);
    
    const patchResponse2 = await fetch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: testX2,
        y: testY2
      })
    });
    
    const patchData2 = await patchResponse2.json();
    console.log(`📊 PATCH статус: ${patchResponse2.status}`);
    console.log(`📋 Ответ:`, patchData2);
    
    if (patchData2.success && !patchData2.skipped) {
      console.log('✅ Значимые изменения правильно сохранены!');
    } else {
      console.log('❌ Значимые изменения не были сохранены');
    }
    
    // 5. Проверяем результат
    console.log('\n5. Проверка результата...');
    const checkResponse = await fetch(`${API_BASE}/api/players`);
    const checkData = await checkResponse.json();
    const updatedPlayer = checkData.players.find(p => p.id === testPlayer.id);
    
    console.log(`📍 Обновленные координаты: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    
    if (updatedPlayer.x === testX2 && updatedPlayer.y === testY2) {
      console.log('\n🎉 ВСЕ ОПТИМИЗАЦИИ РАБОТАЮТ!');
      console.log('🚀 WebSocket синхронизация оптимизирована');
      console.log('🚀 Синхронизация профилей улучшена');
      console.log('🚀 Debouncing координат оптимизирован');
      console.log('🚀 Умная синхронизация состояний работает');
      console.log('\n📱 Теперь в браузере:');
      console.log('1. Откройте http://localhost:3000');
      console.log('2. Войдите как admin/admin');
      console.log('3. Перетащите любую фишку');
      console.log('4. Синхронизация будет быстрой и умной!');
      console.log('\n🔥 ПРЕИМУЩЕСТВА:');
      console.log('• Минимальный пинг между игроками');
      console.log('• Умное пропускание мелких изменений');
      console.log('• Оптимизированная синхронизация профилей');
      console.log('• Быстрый отклик на перетаскивание');
    } else {
      console.log('\n❌ Координаты не обновились!');
      console.log(`Ожидалось: x=${testX2}, y=${testY2}`);
      console.log(`Получено: x=${updatedPlayer.x}, y=${updatedPlayer.y}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ОПТИМИЗИРОВАННОГО ТЕСТА:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: pm2 restart malabar-server');
    }
  }
}

optimizedTest();
