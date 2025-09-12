#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ИСПРАВЛЕНИЯ SSR ОШИБКИ
 * 
 * Проверяет что API вызовы не выполняются на сервере
 */

// Имитируем серверное окружение
global.window = undefined;
global.document = undefined;

console.log('🧪 ТЕСТ: Проверка SSR исправления');
console.log('================================');

// Тест 1: apiService в серверном окружении
console.log('\n1. Тест apiService в серверном окружении...');
try {
  const apiService = require('./services/apiService.js').default;
  
  // Пытаемся вызвать API метод
  apiService.getPlayers().then(() => {
    console.log('❌ ОШИБКА: API вызов выполнился на сервере!');
  }).catch(error => {
    if (error.message.includes('browser environment')) {
      console.log('✅ ПРАВИЛЬНО: API вызов заблокирован на сервере');
    } else {
      console.log('❌ НЕОЖИДАННАЯ ОШИБКА:', error.message);
    }
  });
} catch (error) {
  console.log('❌ ОШИБКА загрузки apiService:', error.message);
}

// Тест 2: usePeriodicSync в серверном окружении
console.log('\n2. Тест usePeriodicSync в серверном окружении...');
try {
  // Имитируем React хуки
  const mockSetPlayers = () => {};
  const mockSetCurrentUser = () => {};
  const mockCurrentUser = null;
  
  // Имитируем useCallback
  const mockUseCallback = (fn) => fn;
  const mockUseRef = (initial) => ({ current: initial });
  const mockUseState = (initial) => [initial, () => {}];
  const mockUseEffect = (fn, deps) => {
    // Вызываем функцию сразу для тестирования
    fn();
  };
  
  // Мокаем React
  const React = {
    useCallback: mockUseCallback,
    useRef: mockUseRef,
    useState: mockUseState,
    useEffect: mockUseEffect
  };
  
  // Мокаем apiService
  const mockApiService = {
    getPlayers: () => Promise.reject(new Error('Should not be called on server')),
    getCurrentUser: () => Promise.reject(new Error('Should not be called on server'))
  };
  
  // Загружаем модуль
  const usePeriodicSyncModule = require('./services/usePeriodicSync.js');
  
  console.log('✅ usePeriodicSync загружен без ошибок');
  
} catch (error) {
  console.log('❌ ОШИБКА загрузки usePeriodicSync:', error.message);
}

// Тест 3: useRealTimeSync в серверном окружении
console.log('\n3. Тест useRealTimeSync в серверном окружении...');
try {
  const useRealTimeSyncModule = require('./services/useRealTimeSync.js');
  console.log('✅ useRealTimeSync загружен без ошибок');
} catch (error) {
  console.log('❌ ОШИБКА загрузки useRealTimeSync:', error.message);
}

console.log('\n✅ ТЕСТ ЗАВЕРШЁН');
console.log('📝 Если все тесты прошли успешно, SSR ошибка исправлена!');
