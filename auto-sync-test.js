#!/usr/bin/env node

/**
 * 🚀 ТЕСТ АВТОМАТИЧЕСКОЙ СИНХРОНИЗАЦИИ
 * Проверяем что синхронизация происходит автоматически каждые 10 секунд
 */

const API_BASE = 'http://localhost:3001';

async function autoSyncTest() {
  console.log('🚀 ТЕСТ АВТОМАТИЧЕСКОЙ СИНХРОНИЗАЦИИ');
  console.log('===================================');
  
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
    
    // 5. Финальная проверка
    console.log('\n5. Финальная проверка...');
    const finalResponse = await fetch(`${API_BASE}/api/players`);
    const finalData = await finalResponse.json();
    const finalPlayer = finalData.players.find(p => p.id === testPlayer.id);
    
    if (finalPlayer) {
      console.log(`📍 Финальные координаты: x=${finalPlayer.x}, y=${finalPlayer.y}`);
      
      if (finalPlayer.x === testX && finalPlayer.y === testY) {
        console.log('✅ АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ РАБОТАЕТ!');
      } else {
        console.log('❌ Автоматическая синхронизация не работает');
        console.log(`Ожидалось: x=${testX}, y=${testY}`);
        console.log(`Получено: x=${finalPlayer.x}, y=${finalPlayer.y}`);
      }
    }
    
    console.log('\n🎉 ТЕСТ АВТОМАТИЧЕСКОЙ СИНХРОНИЗАЦИИ ЗАВЕРШЁН!');
    console.log('\n📱 Теперь в браузере:');
    console.log('1. Откройте http://localhost:3000');
    console.log('2. Войдите как admin/admin');
    console.log('3. Синхронизация происходит автоматически каждые 10 секунд');
    console.log('4. При изменениях - принудительная синхронизация через 2 секунды');
    console.log('5. Интерфейс упрощён до цветового индикатора');
    
    console.log('\n🔥 АВТОМАТИЗАЦИЯ:');
    console.log('• Убрана кнопка синхронизации');
    console.log('• Синхронизация полностью автоматическая');
    console.log('• Интерфейс упрощён до цветового индикатора');
    console.log('• Периодическая синхронизация каждые 10 секунд');
    console.log('• Принудительная синхронизация при изменениях');
    
    console.log('\n🎨 ЦВЕТОВЫЕ ИНДИКАТОРЫ:');
    console.log('• 🟢 Зелёный - синхронизировано');
    console.log('• 🟡 Жёлтый - синхронизация/сохранение');
    console.log('• 🔵 Синий - подключение');
    console.log('• 🟠 Оранжевый - переподключение');
    console.log('• 🟣 Фиолетовый - HTTP режим');
    console.log('• 🔴 Красный - ошибка');
    console.log('• ⚪ Серый - не подключен');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА АВТОМАТИЧЕСКОЙ СИНХРОНИЗАЦИИ:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: pm2 restart malabar-server');
    }
  }
}

autoSyncTest();
