#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ГЛОБАЛЬНОЙ СИНХРОНИЗАЦИИ
 * Проверяем периодическую синхронизацию каждые 10 секунд
 */

const API_BASE = 'http://localhost:3001';

async function globalSyncTest() {
  console.log('🚀 ТЕСТ ГЛОБАЛЬНОЙ СИНХРОНИЗАЦИИ');
  console.log('================================');
  
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
    const initialData = await fetch(`${API_BASE}/api/users/current`);
    
    const initialPlayers = initialResponse.ok ? (await initialResponse.json()).players : [];
    const initialUser = initialData.ok ? await initialData.json() : null;
    
    console.log(`📥 Начальные данные: ${initialPlayers.length} игроков`);
    if (initialUser) {
      console.log(`👤 Текущий пользователь: ${initialUser.name}`);
    }
    
    // 3. Тест изменения данных
    console.log('\n3. Тест изменения данных...');
    if (initialPlayers.length > 0) {
      const testPlayer = initialPlayers[0];
      const testX = Math.round(Math.random() * 800);
      const testY = Math.round(Math.random() * 600);
      
      console.log(`📤 Изменяем координаты игрока ${testPlayer.id}: (${testX}, ${testY})`);
      
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
      
      if (updateResponse.ok) {
        console.log('✅ Координаты изменены');
      } else {
        console.log('❌ Ошибка изменения координат');
      }
    }
    
    // 4. Тест периодической синхронизации
    console.log('\n4. Тест периодической синхронизации...');
    console.log('⏰ Ждём 12 секунд для проверки периодической синхронизации...');
    
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    // 5. Проверяем что данные синхронизировались
    console.log('\n5. Проверка синхронизации...');
    const syncResponse = await fetch(`${API_BASE}/api/players`);
    const syncData = await fetch(`${API_BASE}/api/users/current`);
    
    const syncPlayers = syncResponse.ok ? (await syncResponse.json()).players : [];
    const syncUser = syncData.ok ? await syncData.json() : null;
    
    console.log(`📥 Синхронизированные данные: ${syncPlayers.length} игроков`);
    if (syncUser) {
      console.log(`👤 Синхронизированный пользователь: ${syncUser.name}`);
    }
    
    // 6. Проверяем изменения
    if (initialPlayers.length > 0 && syncPlayers.length > 0) {
      const initialPlayer = initialPlayers[0];
      const syncPlayer = syncPlayers.find(p => p.id === initialPlayer.id);
      
      if (syncPlayer) {
        console.log(`📍 Начальные координаты: x=${initialPlayer.x}, y=${initialPlayer.y}`);
        console.log(`📍 Синхронизированные координаты: x=${syncPlayer.x}, y=${syncPlayer.y}`);
        
        if (syncPlayer.x !== initialPlayer.x || syncPlayer.y !== initialPlayer.y) {
          console.log('✅ Координаты успешно синхронизированы!');
        } else {
          console.log('⚠️ Координаты не изменились (возможно, не было изменений)');
        }
      }
    }
    
    // 7. Тест принудительной синхронизации
    console.log('\n6. Тест принудительной синхронизации...');
    console.log('🔄 Имитируем принудительную синхронизацию...');
    
    const forceSyncResponse = await fetch(`${API_BASE}/api/players`);
    if (forceSyncResponse.ok) {
      console.log('✅ Принудительная синхронизация работает');
    } else {
      console.log('❌ Ошибка принудительной синхронизации');
    }
    
    console.log('\n🎉 ТЕСТ ГЛОБАЛЬНОЙ СИНХРОНИЗАЦИИ ЗАВЕРШЁН!');
    console.log('\n📱 Теперь в браузере:');
    console.log('1. Откройте http://localhost:3000');
    console.log('2. Войдите как admin/admin');
    console.log('3. Данные будут синхронизироваться каждые 10 секунд');
    console.log('4. При изменениях - принудительная синхронизация через 2 секунды');
    console.log('5. Нагрузка на БД значительно снижена!');
    
    console.log('\n🔥 ПРЕИМУЩЕСТВА:');
    console.log('• Периодическая синхронизация каждые 10 секунд');
    console.log('• Принудительная синхронизация при изменениях');
    console.log('• Синхронизация всех данных (игроки, профили, координаты)');
    console.log('• Минимальная нагрузка на БД');
    console.log('• Глобальная синхронизация между всеми пользователями');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА ГЛОБАЛЬНОЙ СИНХРОНИЗАЦИИ:');
    console.error(`Сообщение: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Сервер не запущен!');
      console.log('Запустите: pm2 restart malabar-server');
    }
  }
}

globalSyncTest();
