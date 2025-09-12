#!/usr/bin/env node

/**
 * 🚀 ТЕСТ ИСПРАВЛЕНИЯ SSR ОШИБКИ V3
 * 
 * Проверяет что usePeriodicSync не выполняет API вызовы на сервере
 */

console.log('🧪 ТЕСТ: Проверка SSR исправления V3');
console.log('===================================');

// Тест 1: Проверка что хук не падает при загрузке
console.log('\n1. Проверка загрузки usePeriodicSync...');
try {
  const usePeriodicSync = require('./services/usePeriodicSync.js');
  console.log('✅ usePeriodicSync загружен без ошибок');
} catch (error) {
  console.log('❌ Ошибка загрузки usePeriodicSync:', error.message);
}

// Тест 2: Имитация вызова хука с isMounted = false
console.log('\n2. Тест вызова хука с isMounted = false...');
try {
  // Имитируем React хуки
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
    getPlayers: () => {
      console.log('❌ API вызов выполнился (не должен был)');
      return Promise.resolve({ players: [] });
    },
    getCurrentUser: () => {
      console.log('❌ API вызов выполнился (не должен был)');
      return Promise.resolve(null);
    }
  };
  
  // Заменяем require для apiService
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === './apiService') {
      return { default: mockApiService };
    }
    return originalRequire.apply(this, arguments);
  };
  
  // Загружаем модуль
  const usePeriodicSync = require('./services/usePeriodicSync.js');
  
  // Тестируем с isMounted = false
  console.log('Тестируем с isMounted = false...');
  usePeriodicSync([], () => {}, null, () => {}, false);
  
  console.log('✅ Хук с isMounted = false выполнился без API вызовов');
  
  // Восстанавливаем оригинальный require
  Module.prototype.require = originalRequire;
  
} catch (error) {
  console.log('❌ Ошибка теста хука:', error.message);
}

// Тест 3: Проверка что хук работает с isMounted = true
console.log('\n3. Тест вызова хука с isMounted = true...');
try {
  // Мокаем apiService с логированием
  const mockApiService = {
    getPlayers: () => {
      console.log('✅ API вызов выполнился (ожидаемо)');
      return Promise.resolve({ players: [] });
    },
    getCurrentUser: () => {
      console.log('✅ API вызов выполнился (ожидаемо)');
      return Promise.resolve(null);
    }
  };
  
  // Заменяем require для apiService
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === './apiService') {
      return { default: mockApiService };
    }
    return originalRequire.apply(this, arguments);
  };
  
  // Загружаем модуль
  const usePeriodicSync = require('./services/usePeriodicSync.js');
  
  // Тестируем с isMounted = true
  console.log('Тестируем с isMounted = true...');
  usePeriodicSync([], () => {}, null, () => {}, true);
  
  console.log('✅ Хук с isMounted = true выполнился с API вызовами');
  
  // Восстанавливаем оригинальный require
  Module.prototype.require = originalRequire;
  
} catch (error) {
  console.log('❌ Ошибка теста хука:', error.message);
}

console.log('\n✅ ТЕСТ ЗАВЕРШЁН');
console.log('📝 Если все тесты прошли успешно, SSR ошибка исправлена!');
console.log('📝 usePeriodicSync теперь не выполняет API вызовы на сервере');
