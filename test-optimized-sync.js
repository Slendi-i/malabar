#!/usr/bin/env node

/**
 * Тестирование оптимизированной синхронизации
 * Проверяет все улучшения производительности
 */

const WebSocket = require('ws');
const axios = require('axios');

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
  log(`\n📋 Шаг ${step}: ${description}`, 'cyan');
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

// Функция задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testServerHealth() {
  logStep(1, 'Проверка состояния сервера');
  
  try {
    const response = await axios.get(`${API_BASE}/api/health`);
    assert(response.status === 200, 'Сервер API доступен');
    assert(response.data.status === 'OK', 'API возвращает корректный статус');
    logInfo(`Время ответа сервера: ${response.data.timestamp}`);
  } catch (error) {
    assert(false, `Сервер недоступен: ${error.message}`);
    return false;
  }
  return true;
}

async function testWebSocketConnection() {
  logStep(2, 'Тестирование оптимизированного WebSocket соединения');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const ws = new WebSocket(WS_URL);
    
    let connectionTime = null;
    let pingReceived = false;
    let pongReceived = false;
    
    ws.on('open', () => {
      connectionTime = Date.now() - startTime;
      assert(connectionTime < 1000, `WebSocket подключение быстрое (${connectionTime}ms < 1000ms)`);
      
      // Тестируем heartbeat
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'pong') {
          pongReceived = true;
          assert(true, 'Получен ответ pong на ping');
        } else if (message.type === 'ping') {
          pingReceived = true;
          assert(true, 'Получен ping от сервера');
          // Отвечаем pong
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        assert(false, `Ошибка парсинга WebSocket сообщения: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      assert(false, `Ошибка WebSocket: ${error.message}`);
      resolve();
    });
    
    ws.on('close', () => {
      logInfo('WebSocket соединение закрыто');
      resolve();
    });
    
    // Закрываем соединение через 5 секунд
    setTimeout(() => {
      assert(pongReceived || pingReceived, 'Heartbeat функционирует', true);
      ws.close();
    }, 5000);
  });
}

async function testCoordinateSync() {
  logStep(3, 'Тестирование мгновенной синхронизации координат');
  
  try {
    // Получаем список игроков
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    assert(playersResponse.status === 200, 'Получен список игроков');
    
    const players = playersResponse.data.players;
    assert(players && players.length > 0, 'Список игроков не пустой');
    
    if (players.length > 0) {
      const testPlayer = players[0];
      const originalX = testPlayer.x || 0;
      const originalY = testPlayer.y || 0;
      
      // Создаем WebSocket для мониторинга обновлений
      const ws = new WebSocket(WS_URL);
      
      return new Promise((resolve) => {
        let updateReceived = false;
        const startTime = Date.now();
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'coordinates' && message.data.id === testPlayer.id) {
              const responseTime = Date.now() - startTime;
              updateReceived = true;
              assert(responseTime < 500, `Координаты синхронизированы быстро (${responseTime}ms < 500ms)`);
              assert(message.data.x === 999 && message.data.y === 999, 'Координаты синхронизированы правильно');
              ws.close();
              resolve();
            }
          } catch (error) {
            logError(`Ошибка парсинга сообщения координат: ${error.message}`);
          }
        });
        
        ws.on('open', async () => {
          // Обновляем координаты игрока
          try {
            await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
              x: 999,
              y: 999
            });
            logInfo('Координаты отправлены на сервер');
          } catch (error) {
            assert(false, `Ошибка обновления координат: ${error.message}`);
            ws.close();
            resolve();
          }
        });
        
        // Таймаут теста
        setTimeout(() => {
          if (!updateReceived) {
            assert(false, 'Координаты НЕ синхронизированы в течение 10 секунд');
          }
          ws.close();
          resolve();
        }, 10000);
      });
    }
  } catch (error) {
    assert(false, `Ошибка тестирования координат: ${error.message}`);
  }
}

async function testProfileSync() {
  logStep(4, 'Тестирование синхронизации профиля');
  
  try {
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    
    if (players.length > 0) {
      const testPlayer = players[0];
      const originalName = testPlayer.name;
      
      const ws = new WebSocket(WS_URL);
      
      return new Promise((resolve) => {
        let profileUpdateReceived = false;
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'profile' && message.data.id === testPlayer.id) {
              profileUpdateReceived = true;
              assert(message.data.player.name === 'Test Profile Sync', 'Профиль синхронизирован правильно');
              ws.close();
              resolve();
            }
          } catch (error) {
            logError(`Ошибка парсинга сообщения профиля: ${error.message}`);
          }
        });
        
        ws.on('open', async () => {
          try {
            await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
              name: 'Test Profile Sync'
            });
            logInfo('Обновление профиля отправлено');
          } catch (error) {
            assert(false, `Ошибка обновления профиля: ${error.message}`);
            ws.close();
            resolve();
          }
        });
        
        setTimeout(() => {
          if (!profileUpdateReceived) {
            assert(false, 'Профиль НЕ синхронизирован в течение 5 секунд');
          }
          ws.close();
          resolve();
        }, 5000);
      });
    }
  } catch (error) {
    assert(false, `Ошибка тестирования профиля: ${error.message}`);
  }
}

async function testReconnectionSpeed() {
  logStep(5, 'Тестирование скорости переподключения');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let connectionCount = 0;
    let reconnectionTimes = [];
    
    ws.on('open', () => {
      connectionCount++;
      if (connectionCount === 1) {
        logInfo('Первое соединение установлено');
        // Принудительно закрываем соединение
        ws.close(1000, 'Test reconnection');
      } else {
        const reconnectionTime = Date.now() - lastCloseTime;
        reconnectionTimes.push(reconnectionTime);
        assert(reconnectionTime < 1000, `Быстрое переподключение (${reconnectionTime}ms < 1000ms)`);
        ws.close();
        resolve();
      }
    });
    
    let lastCloseTime;
    ws.on('close', () => {
      lastCloseTime = Date.now();
      if (connectionCount === 1) {
        logInfo('Соединение закрыто, пытаемся переподключиться...');
        // Создаем новое соединение для имитации переподключения
        setTimeout(() => {
          const newWs = new WebSocket(WS_URL);
          newWs.on('open', () => {
            connectionCount++;
            const reconnectionTime = Date.now() - lastCloseTime;
            assert(reconnectionTime < 1000, `Быстрое переподключение (${reconnectionTime}ms < 1000ms)`);
            newWs.close();
            resolve();
          });
          newWs.on('error', () => {
            assert(false, 'Ошибка переподключения');
            resolve();
          });
        }, 100);
      }
    });
    
    ws.on('error', (error) => {
      assert(false, `Ошибка при тестировании переподключения: ${error.message}`);
      resolve();
    });
    
    // Таймаут теста
    setTimeout(() => {
      assert(false, 'Переподключение заняло более 10 секунд');
      resolve();
    }, 10000);
  });
}

async function testDebouncingOptimization() {
  logStep(6, 'Тестирование оптимизированного debouncing');
  
  try {
    const playersResponse = await axios.get(`${API_BASE}/api/players`);
    const players = playersResponse.data.players;
    
    if (players.length > 0) {
      const testPlayer = players[0];
      
      // Тестируем быструю последовательность обновлений
      const updates = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        const updateStart = Date.now();
        try {
          await axios.put(`${API_BASE}/api/players/${testPlayer.id}`, {
            x: 100 + i,
            y: 100 + i
          });
          const updateTime = Date.now() - updateStart;
          updates.push(updateTime);
          logInfo(`Обновление ${i + 1}: ${updateTime}ms`);
        } catch (error) {
          assert(false, `Ошибка обновления ${i + 1}: ${error.message}`);
        }
        
        await delay(50); // Небольшая задержка между обновлениями
      }
      
      const avgUpdateTime = updates.reduce((a, b) => a + b, 0) / updates.length;
      assert(avgUpdateTime < 100, `Среднее время обновления быстрое (${avgUpdateTime.toFixed(2)}ms < 100ms)`);
      
      // Проверяем что debouncing работает правильно
      await delay(200); // Ждем чтобы debouncing сработал
      
      const finalState = await axios.get(`${API_BASE}/api/players/${testPlayer.id}`);
      assert(finalState.data.x === 104 && finalState.data.y === 104, 'Финальное состояние корректное после debouncing');
    }
  } catch (error) {
    assert(false, `Ошибка тестирования debouncing: ${error.message}`);
  }
}

async function runAllTests() {
  log('\n🚀 ТЕСТИРОВАНИЕ ОПТИМИЗИРОВАННОЙ СИНХРОНИЗАЦИИ', 'magenta');
  log('=========================================================', 'magenta');
  
  const serverOk = await testServerHealth();
  if (!serverOk) {
    log('\n❌ Сервер недоступен, тесты прерваны', 'red');
    return;
  }
  
  await testWebSocketConnection();
  await delay(1000);
  
  await testCoordinateSync();
  await delay(1000);
  
  await testProfileSync();
  await delay(1000);
  
  await testReconnectionSpeed();
  await delay(1000);
  
  await testDebouncingOptimization();
  
  // Результаты
  log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ', 'magenta');
  log('========================', 'magenta');
  logSuccess(`Пройдено тестов: ${testResults.passed}`);
  if (testResults.warnings > 0) {
    logWarning(`Предупреждений: ${testResults.warnings}`);
  }
  if (testResults.failed > 0) {
    logError(`Провалено тестов: ${testResults.failed}`);
  } else {
    logSuccess('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  }
  
  log('\n💡 УЛУЧШЕНИЯ ПРОИЗВОДИТЕЛЬНОСТИ:', 'cyan');
  log('• Heartbeat WebSocket: 30s → 10s', 'white');
  log('• Ping интервал: 60s → 20s', 'white');
  log('• Debouncing координат: 500ms → 150ms', 'white');
  log('• Переподключение: 500ms → 250ms', 'white');
  log('• Мгновенная синхронизация критичных операций', 'white');
  log('• Надежный механизм через ref вместо window', 'white');
  log('• Разделение координат и профильных данных', 'white');
  log('• Агрессивное переподключение: 60s → 20s', 'white');
}

// Запуск тестов
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests };
