#!/usr/bin/env node

/**
 * 🔧 ТЕСТ ИСПРАВЛЕНИЯ СИНХРОНИЗАЦИИ
 * Проверяем что синхронизация работает каждые 10 секунд
 */

const API_BASE = 'http://localhost:3001';

async function testSyncFix() {
  console.log('🔧 ТЕСТ ИСПРАВЛЕНИЯ СИНХРОНИЗАЦИИ');
  console.log('=================================');
  
  try {
    // 1. Проверяем сервер
    console.log('\n1. Проверка сервера...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Сервер не отвечает: ${healthResponse.status}`);
    }
    console.log('✅ Сервер работает');
    
    // 2. Получаем начальные данные
    console.log('\n2. Получение начальных данных...');
    const initialResponse = await fetch(`${API_BASE}/api/players`);
    const initialData = await initialResponse.json();
    const initialPlayers = initialData.players || [];
    
    if (initialPlayers.length === 0) {
      throw new Error('Нет игроков для тестирования');
    }
    
    const testPlayer = initialPlayers[0];
    console.log(`📍 Тестируем игрока ${testPlayer.id}: ${testPlayer.name}`);
    console.log(`📍 Начальные координаты: x=${testPlayer.x}, y=${testPlayer.y}`);
    
    // 3. Тест изменения координат
    console.log('\n3. Тест изменения координат...');
    const testX = Math.round(Math.random() * 800);
    const testY = Math.round(Math.random() * 600);
    
    console.log(`📤 Изменяем координаты на: (${testX}, ${testY})`);
    
    const updateResponse = await fetch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: testX,
        y: testY
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Ошибка обновления координат: ${updateResponse.status} - ${errorText}`);
    }
    
    console.log('✅ Координаты изменены');
    
    // 4. Тест автоматической синхронизации
    console.log('\n4. Тест автоматической синхронизации...');
    console.log('⏰ Ждём 15 секунд для проверки автоматической синхронизации...');
    console.log('   (Синхронизация должна происходить каждые 10 секунд)');
    
    // Проверяем каждые 5 секунд
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`\n📊 Проверка ${i + 1}/3 (через ${(i + 1) * 5} секунд)...`);
      
      const checkResponse = await fetch(`${API_BASE}/api/players`);
      const checkData = await checkResponse.json();
      const checkPlayer = checkData.players.find(p => p.id === testPlayer.id);
      
      if (checkPlayer) {
        console.log(`📍 Координаты: x=${checkPlayer.x}, y=${checkPlayer.y}`);
        
        if (checkPlayer.x === testX && checkPlayer.y === testY) {
          console.log('✅ Координаты синхронизированы!');
        } else {
          console.log('⚠️ Координаты ещё не синхронизированы');
        }
      }
    }
    
    console.log('\n🎉 ТЕСТ ИСПРАВЛЕНИЯ СИНХРОНИЗАЦИИ ЗАВЕРШЁН!');
    console.log('\n📱 Теперь в браузере:');
    console.log('1. Откройте http://localhost:3000');
    console.log('2. Войдите как admin/admin');
    console.log('3. В консоли должны появляться логи каждые 10 секунд:');
    console.log('   "⏰ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Время синхронизации (10 сек)"');
    console.log('4. WebSocket подключается постоянно, но не чаще 1 раза в 10 секунд');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА ИСПРАВЛЕНИЯ СИНХРОНИЗАЦИИ:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: pm2 restart malabar-server');
    }
  }
}

testSyncFix();
