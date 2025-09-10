#!/usr/bin/env node

// Простой тест для проверки endpoint обновления координат

const API_BASE = 'http://localhost:3001';

async function testEndpoint() {
  console.log('🧪 Тестирование endpoint для обновления координат...\n');
  
  try {
    // 1. Проверяем health check
    console.log('1. Проверяем health check...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // 2. Получаем список игроков для отладки
    console.log('\n2. Получаем список игроков...');
    const debugResponse = await fetch(`${API_BASE}/api/debug/players`);
    const debugData = await debugResponse.json();
    console.log('📊 Игроки в БД:', debugData);
    
    if (debugData.players.length === 0) {
      console.log('❌ Нет игроков в базе данных!');
      return;
    }
    
    // 3. Пробуем обновить координаты первого игрока
    const testPlayerId = debugData.players[0].id;
    const testCoordinates = { x: 123.45, y: 678.90 };
    
    console.log(`\n3. Тестируем обновление координат для игрока ${testPlayerId}...`);
    console.log(`📍 Новые координаты:`, testCoordinates);
    
    const updateResponse = await fetch(`${API_BASE}/api/players/${testPlayerId}/coordinates`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCoordinates)
    });
    
    console.log(`📡 Response status: ${updateResponse.status}`);
    
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('✅ Успешно обновлено:', updateData);
    } else {
      const errorText = await updateResponse.text();
      console.log('❌ Ошибка:', errorText);
    }
    
    // 4. Проверяем что координаты действительно обновились
    console.log('\n4. Проверяем результат...');
    const checkResponse = await fetch(`${API_BASE}/api/debug/players`);
    const checkData = await checkResponse.json();
    const updatedPlayer = checkData.players.find(p => p.id === testPlayerId);
    console.log(`🔍 Координаты игрока ${testPlayerId}:`, { x: updatedPlayer.x, y: updatedPlayer.y });
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Запускаем тест
testEndpoint();
