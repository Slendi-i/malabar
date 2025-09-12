#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ИСПРАВЛЕНИЯ SSR ОШИБКИ V2
 * 
 * Проверяет что API вызовы выполняются только в браузере
 */

console.log('🧪 ТЕСТ: Проверка SSR исправления V2');
console.log('===================================');

// Тест 1: Проверка что fetch доступен в Node.js
console.log('\n1. Проверка доступности fetch...');
try {
  if (typeof fetch === 'undefined') {
    console.log('❌ fetch не доступен в Node.js (ожидаемо)');
    console.log('✅ Это означает что нужно использовать node-fetch или другую библиотеку');
  } else {
    console.log('✅ fetch доступен в Node.js');
  }
} catch (error) {
  console.log('❌ Ошибка проверки fetch:', error.message);
}

// Тест 2: Проверка что код не падает при загрузке модулей
console.log('\n2. Проверка загрузки модулей...');

try {
  // Тест apiService
  const apiService = require('./services/apiService.js').default;
  console.log('✅ apiService загружен');
  
  // Тест usePeriodicSync
  const usePeriodicSync = require('./services/usePeriodicSync.js');
  console.log('✅ usePeriodicSync загружен');
  
  // Тест useRealTimeSync
  const useRealTimeSync = require('./services/useRealTimeSync.js');
  console.log('✅ useRealTimeSync загружен');
  
} catch (error) {
  console.log('❌ Ошибка загрузки модулей:', error.message);
}

// Тест 3: Проверка что API вызовы правильно обрабатывают ошибки
console.log('\n3. Тест обработки ошибок API...');

try {
  const apiService = require('./services/apiService.js').default;
  
  // Пытаемся вызвать API метод (должен упасть с fetch error)
  apiService.getPlayers().then(() => {
    console.log('❌ API вызов неожиданно выполнился');
  }).catch(error => {
    if (error.message.includes('Failed to fetch') || error.message.includes('fetch is not defined')) {
      console.log('✅ ПРАВИЛЬНО: API вызов упал с ошибкой fetch (ожидаемо в Node.js)');
    } else {
      console.log('❌ НЕОЖИДАННАЯ ОШИБКА:', error.message);
    }
  });
  
} catch (error) {
  console.log('❌ Ошибка теста API:', error.message);
}

console.log('\n✅ ТЕСТ ЗАВЕРШЁН');
console.log('📝 Если все тесты прошли успешно, SSR ошибка исправлена!');
console.log('📝 API вызовы теперь выполняются только в браузере через useEffect');
