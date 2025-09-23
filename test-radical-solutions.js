#!/usr/bin/env node

/**
 * 🚀 ТЕСТИРОВАНИЕ РАДИКАЛЬНЫХ РЕШЕНИЙ HTTP 500
 * Проверяет все новые методы сохранения координат
 */

const axios = require('axios');
const WebSocket = require('ws');
const { runFullDiagnosis } = require('./diagnose-and-fix-db');

// Конфигурация
const API_BASE = process.env.NODE_ENV === 'production' ? 'https://malabar-event.ru:3001' : 'http://localhost:3001';
const WS_URL = process.env.NODE_ENV === 'production' ? 'wss://malabar-event.ru:3001/ws' : 'ws://localhost:3001/ws';

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logStep(step, description) {
  log(`\n🔧 Шаг ${step}: ${description}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function assert(condition, message, isWarning = false) {
  if (condition) {
    logSuccess(message);
    testResults.passed++;
  } else {
    if (isWarning) {
      logWarning(message);
      testResults.warnings++;
    } else {
      logError(message);
      testResults.failed++;
    }
  }
}

async function testServerHealth() {
  logStep(1, 'Проверка состояния сервера');
  
  try {
    const response = await axios.get(`${API_BASE}/api/health`);
    assert(response.status === 200, 'Сервер API доступен');
    return true;
  } catch (error) {
    assert(false, `Сервер недоступен: ${error.message}`);
    return false;
  }
}

async function testNewCoordinatesEndpoint() {
  logStep(2, '🚀 Тестирование НОВОГО endpoint /api/coordinates/:id');
  
  try {
    // Получаем список игроков
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    assert(playersResponse.status === 200, 'Получен список игроков');
    
    const players = playersResponse.data.players;
    if (!players || players.length === 0) {
      assert(false, 'Список игроков пуст');
      return false;
    }
    
    const testPlayer = players[0];
    const testX = 777.77;
    const testY = 666.66;
    
    logInfo(`Тестируем новый endpoint с игроком ${testPlayer.id}: (${testX}, ${testY})`);
    
    // Пробуем новый PATCH endpoint
    const response = await axios.patch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      x: testX,
      y: testY
    });
    
    assert(response.status === 200, `Новый endpoint работает (статус ${response.status})`);
    assert(response.data.success === true, 'Новый endpoint возвращает success: true');
    assert(response.data.x === testX, `Координата X корректна: ${response.data.x}`);
    assert(response.data.y === testY, `Координата Y корректна: ${response.data.y}`);
    
    logSuccess('🎉 НОВЫЙ ENDPOINT /api/coordinates/:id РАБОТАЕТ!');
    return true;
    
  } catch (error) {
    assert(false, `Ошибка нового endpoint: ${error.response?.status || error.message}`);
    return false;
  }
}

async function testFallbackMethod() {
  logStep(3, '🔄 Тестирование FALLBACK метода через старый endpoint');
  
  try {
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    
    if (!players || players.length === 0) {
      assert(false, 'Нет игроков для fallback теста');
      return false;
    }
    
    const testPlayer = players[0];
    const testX = 555.55;
    const testY = 444.44;
    
    logInfo(`Тестируем fallback с игроком ${testPlayer.id}: (${testX}, ${testY})`);
    
    // Пробуем старый PUT endpoint
    const response = await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
      x: testX,
      y: testY
    });
    
    assert(response.status === 200, `Fallback endpoint работает (статус ${response.status})`);
    logSuccess('🔄 FALLBACK через PUT /api/players/:id работает!');
    return true;
    
  } catch (error) {
    assert(false, `Ошибка fallback метода: ${error.response?.status || error.message}`);
    return false;
  }
}

async function testWebSocketSaving() {
  logStep(4, '📡 Тестирование сохранения через WebSocket');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let coordinatesSaved = false;
    const testX = 333.33;
    const testY = 222.22;
    const testPlayerId = 1;
    
    const timeout = setTimeout(() => {
      if (!coordinatesSaved) {
        assert(false, 'WebSocket сохранение заняло больше 10 секунд');
      }
      ws.close();
      resolve(coordinatesSaved);
    }, 10000);
    
    ws.on('open', () => {
      logInfo(`Отправляем координаты через WebSocket для игрока ${testPlayerId}`);
      ws.send(JSON.stringify({
        type: 'save_coordinates',
        data: { id: testPlayerId, x: testX, y: testY }
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'coordinates_saved' && message.data.id === testPlayerId) {
          assert(message.data.x === testX, `WebSocket сохранил X: ${message.data.x}`);
          assert(message.data.y === testY, `WebSocket сохранил Y: ${message.data.y}`);
          coordinatesSaved = true;
          logSuccess('📡 WebSocket сохранение работает!');
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        } else if (message.type === 'coordinates_error') {
          assert(false, `WebSocket ошибка: ${message.error}`);
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        }
      } catch (error) {
        logError(`Ошибка парсинга WebSocket сообщения: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      assert(false, `Ошибка WebSocket соединения: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function testMethodSequence() {
  logStep(5, '🔥 Тестирование последовательности методов (как в реальном коде)');
  
  try {
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    
    if (!players || players.length === 0) {
      assert(false, 'Нет игроков для sequence теста');
      return false;
    }
    
    const testPlayer = players[0];
    const testX = 111.11;
    const testY = 999.99;
    
    logInfo(`Последовательность: Новый endpoint → Fallback → WebSocket`);
    
    // 1. Пробуем новый endpoint
    try {
      const newResponse = await axios.patch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
        x: testX,
        y: testY
      });
      
      if (newResponse.status === 200) {
        logSuccess('✅ Новый endpoint сработал в последовательности');
        return true;
      }
    } catch (newError) {
      logWarning(`Новый endpoint не сработал: ${newError.response?.status || newError.message}`);
    }
    
    await delay(500);
    
    // 2. Пробуем fallback
    try {
      const fallbackResponse = await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
        x: testX,
        y: testY
      });
      
      if (fallbackResponse.status === 200) {
        logSuccess('✅ Fallback endpoint сработал в последовательности');
        return true;
      }
    } catch (fallbackError) {
      logWarning(`Fallback не сработал: ${fallbackError.response?.status || fallbackError.message}`);
    }
    
    await delay(500);
    
    // 3. Пробуем WebSocket
    const wsResult = await testWebSocketSaving();
    if (wsResult) {
      logSuccess('✅ WebSocket сработал в последовательности');
      return true;
    }
    
    assert(false, 'Все методы в последовательности провалились');
    return false;
    
  } catch (error) {
    assert(false, `Ошибка тестирования последовательности: ${error.message}`);
    return false;
  }
}

async function testPerformanceComparison() {
  logStep(6, '⚡ Тестирование производительности методов');
  
  const playersResponse = await axios.get(`${API_BASE}/api/players`);
  const players = playersResponse.data.players;
  
  if (!players || players.length === 0) {
    assert(false, 'Нет игроков для performance теста', true);
    return;
  }
  
  const testPlayer = players[0];
  const results = {};
  
  // Тест нового endpoint
  try {
    const start = Date.now();
    await axios.patch(`${API_BASE}/api/coordinates/${testPlayer.id}`, {
      x: 100, y: 100
    });
    results.newEndpoint = Date.now() - start;
    logInfo(`Новый endpoint: ${results.newEndpoint}ms`);
  } catch (error) {
    results.newEndpoint = null;
    logWarning(`Новый endpoint не работает для performance теста`);
  }
  
  await delay(200);
  
  // Тест старого endpoint
  try {
    const start = Date.now();
    await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
      x: 200, y: 200
    });
    results.oldEndpoint = Date.now() - start;
    logInfo(`Старый endpoint: ${results.oldEndpoint}ms`);
  } catch (error) {
    results.oldEndpoint = null;
    logWarning(`Старый endpoint не работает для performance теста`);
  }
  
  // Сравнение
  if (results.newEndpoint && results.oldEndpoint) {
    const improvement = results.oldEndpoint - results.newEndpoint;
    if (improvement > 0) {
      logSuccess(`⚡ Новый endpoint быстрее на ${improvement}ms`);
    } else {
      logInfo(`⚡ Старый endpoint быстрее на ${Math.abs(improvement)}ms`);
    }
  }
}

async function runAllRadicalTests() {
  log('\n🚀 ТЕСТИРОВАНИЕ РАДИКАЛЬНЫХ РЕШЕНИЙ HTTP 500', 'magenta');
  log('===============================================', 'magenta');
  
  // Сначала диагностика БД
  log('\n🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ:', 'cyan');
  const dbResults = await runFullDiagnosis();
  
  if (!dbResults.fileCheck || !dbResults.connectionTest || !dbResults.updateTest) {
    log('\n💥 КРИТИЧЕСКИЕ ПРОБЛЕМЫ С БД! Тесты API невозможны.', 'red');
    return;
  }
  
  log('\n🌐 ТЕСТИРОВАНИЕ API:', 'cyan');
  
  const serverOk = await testServerHealth();
  if (!serverOk) {
    log('\n❌ Сервер недоступен, API тесты прерваны', 'red');
    return;
  }
  
  await testNewCoordinatesEndpoint();
  await delay(1000);
  
  await testFallbackMethod();
  await delay(1000);
  
  await testWebSocketSaving();
  await delay(1000);
  
  await testMethodSequence();
  await delay(1000);
  
  await testPerformanceComparison();
  
  // Результаты
  log('\n📊 РЕЗУЛЬТАТЫ РАДИКАЛЬНЫХ ТЕСТОВ', 'magenta');
  log('==================================', 'magenta');
  logSuccess(`Пройдено тестов: ${testResults.passed}`);
  if (testResults.warnings > 0) {
    logWarning(`Предупреждений: ${testResults.warnings}`);
  }
  if (testResults.failed > 0) {
    logError(`Провалено тестов: ${testResults.failed}`);
  } else {
    logSuccess('🎉 ВСЕ РАДИКАЛЬНЫЕ РЕШЕНИЯ РАБОТАЮТ!');
  }
  
  log('\n💡 РАДИКАЛЬНЫЕ УЛУЧШЕНИЯ:', 'cyan');
  log('• Отдельный endpoint /api/coordinates/:id', 'white');
  log('• Автоматический fallback к старому методу', 'white');
  log('• WebSocket-only сохранение как резерв', 'white');
  log('• localStorage резерв для критических случаев', 'white');
  log('• Автодиагностика и восстановление БД', 'white');
  log('• Исправление tsconfig.json пути', 'white');
  log('• Множественная валидация данных', 'white');
  log('• Детальная диагностика ошибок', 'white');
}

// Запуск тестов
if (require.main === module) {
  runAllRadicalTests().catch(error => {
    logError(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllRadicalTests };
