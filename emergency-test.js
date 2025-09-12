#!/usr/bin/env node

/**
 * 🚨 ЭКСТРЕННЫЙ ТЕСТ HTTP 500
 * Точная диагностика проблемы с координатами
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const API_BASE = 'http://localhost:3001';
const DB_PATH = './server/malabar.db';

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
  log(`\n🚨 Тест ${step}: ${description}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testServerHealth() {
  logStep(1, 'Проверка сервера');
  
  try {
    const response = await axios.get(`${API_BASE}/api/health`);
    logSuccess(`Сервер доступен: ${response.status}`);
    return true;
  } catch (error) {
    logError(`Сервер недоступен: ${error.message}`);
    return false;
  }
}

async function testDatabaseDirect() {
  logStep(2, 'Прямая проверка базы данных');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        logError(`Не удается открыть БД: ${err.message}`);
        resolve(false);
        return;
      }
      
      logSuccess('БД открыта');
      
      // Проверяем структуру таблицы
      db.all("PRAGMA table_info(players)", (err, columns) => {
        if (err) {
          logError(`Ошибка получения структуры: ${err.message}`);
          db.close();
          resolve(false);
          return;
        }
        
        logInfo('Столбцы таблицы players:');
        columns.forEach(col => {
          log(`  ${col.name}: ${col.type}`, 'white');
        });
        
        const hasX = columns.some(col => col.name === 'x');
        const hasY = columns.some(col => col.name === 'y');
        
        if (!hasX || !hasY) {
          logError('Отсутствуют столбцы x или y!');
          db.close();
          resolve(false);
          return;
        }
        
        logSuccess('Столбцы x, y найдены');
        
        // Проверяем количество игроков
        db.get("SELECT COUNT(*) as count FROM players", (err, row) => {
          if (err) {
            logError(`Ошибка подсчета игроков: ${err.message}`);
            db.close();
            resolve(false);
            return;
          }
          
          logInfo(`Игроков в БД: ${row.count}`);
          
          if (row.count === 0) {
            logError('В БД нет игроков!');
            db.close();
            resolve(false);
            return;
          }
          
          // Тестируем простой UPDATE
          logInfo('Тестируем простой UPDATE...');
          const sql = 'UPDATE players SET x = ?, y = ? WHERE id = 1';
          const params = [999.99, 888.88];
          
          db.run(sql, params, function(err) {
            if (err) {
              logError(`UPDATE провалился: ${err.message}`);
              logError(`Код ошибки: ${err.code}`);
              logError(`Errno: ${err.errno}`);
              db.close();
              resolve(false);
              return;
            }
            
            logSuccess(`UPDATE успешен, обновлено строк: ${this.changes}`);
            
            // Проверяем что обновилось
            db.get("SELECT x, y FROM players WHERE id = 1", (err, checkRow) => {
              if (err) {
                logError(`Ошибка проверки: ${err.message}`);
                db.close();
                resolve(false);
                return;
              }
              
              if (checkRow.x === 999.99 && checkRow.y === 888.88) {
                logSuccess('Координаты обновились корректно!');
              } else {
                logError(`Координаты НЕ обновились: x=${checkRow.x}, y=${checkRow.y}`);
              }
              
              db.close();
              resolve(true);
            });
          });
        });
      });
    });
  });
}

async function testNewEndpoint() {
  logStep(3, 'Тест нового PATCH endpoint');
  
  try {
    const testData = { x: 555.55, y: 666.66 };
    const url = `${API_BASE}/api/coordinates/1`;
    
    logInfo(`Отправляем PATCH на: ${url}`);
    logInfo(`Данные:`, testData);
    
    const response = await axios.patch(url, testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    logSuccess(`Ответ: ${response.status}`);
    logInfo('Данные ответа:', response.data);
    
    if (response.data.success) {
      logSuccess('Новый endpoint работает!');
      return true;
    } else {
      logError('Endpoint вернул success=false');
      return false;
    }
    
  } catch (error) {
    logError(`Ошибка нового endpoint: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      logError('Детали ошибки:', error.response.data);
    }
    return false;
  }
}

async function testOldEndpoint() {
  logStep(4, 'Тест старого PUT endpoint');
  
  try {
    const testData = { x: 333.33, y: 444.44 };
    const url = `${API_BASE}/api/players/1`;
    
    logInfo(`Отправляем PUT на: ${url}`);
    logInfo(`Данные:`, testData);
    
    const response = await axios.put(url, testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    logSuccess(`Ответ: ${response.status}`);
    logInfo('Данные ответа:', response.data);
    
    logSuccess('Старый endpoint работает!');
    return true;
    
  } catch (error) {
    logError(`Ошибка старого endpoint: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      logError('Детали ошибки:', error.response.data);
    }
    return false;
  }
}

async function testGetPlayers() {
  logStep(5, 'Тест получения списка игроков');
  
  try {
    const response = await axios.get(`${API_BASE}/api/players`);
    logSuccess(`Получен список: ${response.status}`);
    
    if (response.data.players && response.data.players.length > 0) {
      logInfo(`Игроков получено: ${response.data.players.length}`);
      
      const player1 = response.data.players.find(p => p.id === 1);
      if (player1) {
        logInfo(`Игрок 1: x=${player1.x}, y=${player1.y}`);
        logSuccess('Данные игрока получены');
      } else {
        logError('Игрок с ID=1 не найден');
      }
      
      return true;
    } else {
      logError('Список игроков пуст');
      return false;
    }
    
  } catch (error) {
    logError(`Ошибка получения игроков: ${error.message}`);
    return false;
  }
}

async function runEmergencyDiagnosis() {
  log('\n🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА HTTP 500', 'magenta');
  log('=======================================', 'magenta');
  
  const results = {
    server: false,
    database: false,
    newEndpoint: false,
    oldEndpoint: false,
    getPlayers: false
  };
  
  results.server = await testServerHealth();
  if (!results.server) {
    log('\n💥 СЕРВЕР НЕДОСТУПЕН! Запустите сервер и повторите тест.', 'red');
    return results;
  }
  
  results.database = await testDatabaseDirect();
  if (!results.database) {
    log('\n💥 ПРОБЛЕМА С БАЗОЙ ДАННЫХ!', 'red');
  }
  
  results.getPlayers = await testGetPlayers();
  results.newEndpoint = await testNewEndpoint();
  results.oldEndpoint = await testOldEndpoint();
  
  // Итоговый отчет
  log('\n📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ', 'magenta');
  log('==========================', 'magenta');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const names = {
      server: 'Сервер доступен',
      database: 'База данных работает',
      newEndpoint: 'Новый PATCH endpoint',
      oldEndpoint: 'Старый PUT endpoint', 
      getPlayers: 'Получение игроков'
    };
    log(`${status} ${names[test]}`, result ? 'green' : 'red');
  });
  
  // Рекомендации
  log('\n💡 РЕКОМЕНДАЦИИ:', 'cyan');
  
  if (!results.database) {
    log('1. Проблема в базе данных - проверьте столбцы x, y', 'yellow');
    log('2. Запустите: node diagnose-and-fix-db.js', 'yellow');
  }
  
  if (!results.newEndpoint && !results.oldEndpoint) {
    log('3. Все endpoint\'ы падают - проверьте логи сервера', 'yellow');
    log('4. Возможна проблема с SQL запросами', 'yellow');
  }
  
  if (results.newEndpoint && !results.oldEndpoint) {
    log('5. Используйте только новый endpoint', 'green');
  }
  
  if (!results.newEndpoint && results.oldEndpoint) {
    log('6. Новый endpoint сломан, используйте старый', 'yellow');
  }
  
  if (results.newEndpoint || results.oldEndpoint) {
    log('7. Хотя бы один endpoint работает - проблема в клиенте', 'green');
  }
  
  return results;
}

// Запуск диагностики
if (require.main === module) {
  runEmergencyDiagnosis().catch(error => {
    logError(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runEmergencyDiagnosis };
