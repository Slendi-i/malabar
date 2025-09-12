#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ИСПРАВЛЕНИЯ АВТОРИЗАЦИИ
 * 
 * Проверяет что периодическая синхронизация не вызывает API сразу
 */

console.log('🧪 ТЕСТ: Проверка исправления авторизации');
console.log('=========================================');

// Тест 1: Проверка что хук не делает API вызовы сразу
console.log('\n1. Тест отложенного вызова API...');

// Счетчик API вызовов
let apiCallCount = 0;

// Мокаем setTimeout для контроля времени
let timeoutCallback = null;
const originalSetTimeout = global.setTimeout;
global.setTimeout = (callback, delay) => {
  console.log(`⏰ setTimeout вызван с задержкой ${delay}мс`);
  timeoutCallback = callback;
  return 1; // fake timeout id
};

// Мокаем setInterval
let intervalCallback = null;
const originalSetInterval = global.setInterval;
global.setInterval = (callback, delay) => {
  console.log(`⏰ setInterval вызван с интервалом ${delay}мс`);
  intervalCallback = callback;
  return 1; // fake interval id
};

// Мокаем clearInterval
global.clearInterval = () => {};

try {
  // Имитируем React хуки
  const mockUseCallback = (fn, deps) => fn;
  const mockUseRef = (initial) => ({ current: initial });
  const mockUseState = (initial) => [initial, () => {}];
  const mockUseEffect = (fn, deps) => {
    console.log('🔧 useEffect вызван');
    fn();
  };
  
  // Мокаем React
  global.React = {
    useCallback: mockUseCallback,
    useRef: mockUseRef,
    useState: mockUseState,
    useEffect: mockUseEffect
  };
  
  // Мокаем apiService с подсчетом вызовов
  const mockApiService = {
    getPlayers: () => {
      apiCallCount++;
      console.log(`📞 API вызов #${apiCallCount}: getPlayers`);
      return Promise.resolve({ players: [] });
    },
    getCurrentUser: () => {
      apiCallCount++;
      console.log(`📞 API вызов #${apiCallCount}: getCurrentUser`);
      return Promise.resolve(null);
    }
  };
  
  // Заменяем require для модулей
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === 'react') {
      return global.React;
    }
    if (id === './apiService') {
      return { default: mockApiService };
    }
    return originalRequire.apply(this, arguments);
  };
  
  // Загружаем и тестируем хук
  console.log('🔧 Загружаем usePeriodicSync...');
  const { usePeriodicSync } = require('./services/usePeriodicSync.js');
  
  console.log('🔧 Вызываем хук с isMounted = true...');
  const result = usePeriodicSync([], () => {}, null, () => {}, true);
  
  console.log(`📊 API вызовов сразу после создания хука: ${apiCallCount}`);
  
  if (apiCallCount === 0) {
    console.log('✅ ОТЛИЧНО: API не вызывается сразу при создании хука');
  } else {
    console.log('❌ ОШИБКА: API вызывается сразу при создании хука');
  }
  
  // Тест 2: Проверяем что API вызывается после setTimeout
  console.log('\n2. Тест вызова API через setTimeout...');
  
  if (timeoutCallback) {
    console.log('🔧 Вызываем callback из setTimeout...');
    timeoutCallback();
    
    console.log(`📊 API вызовов после setTimeout: ${apiCallCount}`);
    
    if (apiCallCount > 0) {
      console.log('✅ ОТЛИЧНО: API вызывается после timeout');
    } else {
      console.log('❌ ОШИБКА: API не вызывается после timeout');
    }
  } else {
    console.log('❌ ОШИБКА: setTimeout callback не найден');
  }
  
  // Тест 3: Проверяем интервал
  console.log('\n3. Тест интервала...');
  
  if (intervalCallback) {
    console.log('🔧 Вызываем callback из setInterval...');
    const apiCallsBefore = apiCallCount;
    intervalCallback();
    
    console.log(`📊 Дополнительных API вызовов: ${apiCallCount - apiCallsBefore}`);
    
    if (apiCallCount > apiCallsBefore) {
      console.log('✅ ОТЛИЧНО: API вызывается по интервалу');
    } else {
      console.log('❌ ОШИБКА: API не вызывается по интервалу');
    }
  } else {
    console.log('❌ ОШИБКА: setInterval callback не найден');
  }
  
  // Восстанавливаем оригинальные функции
  Module.prototype.require = originalRequire;
  global.setTimeout = originalSetTimeout;
  global.setInterval = originalSetInterval;
  
} catch (error) {
  console.log('❌ Ошибка теста:', error.message);
}

console.log('\n✅ ТЕСТ ЗАВЕРШЁН');
console.log('📝 Если все тесты прошли успешно, проблема с авторизацией исправлена!');
console.log('📝 API вызовы теперь не происходят сразу при создании хука');
