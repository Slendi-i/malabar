#!/usr/bin/env node

/**
 * 🚀 РАДИКАЛЬНАЯ ДИАГНОСТИКА И АВТОВОССТАНОВЛЕНИЕ БД
 * Анализирует и исправляет проблемы с базой данных
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = './server/malabar.db';
const BACKUP_PATH = './server/malabar_backup.db';

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

async function checkDatabaseFile() {
  logStep(1, 'Проверка файла базы данных');
  
  try {
    if (!fs.existsSync(DB_PATH)) {
      logError(`База данных не найдена: ${DB_PATH}`);
      return false;
    }
    
    const stats = fs.statSync(DB_PATH);
    logSuccess(`База данных найдена, размер: ${(stats.size / 1024).toFixed(2)} KB`);
    
    if (stats.size === 0) {
      logError('База данных пуста (0 байт)');
      return false;
    }
    
    if (stats.size < 1024) {
      logWarning('База данных очень маленькая, возможна корректность');
    }
    
    return true;
  } catch (error) {
    logError(`Ошибка проверки файла БД: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  logStep(2, 'Тестирование соединения с БД');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        logError(`Не удается подключиться к БД: ${err.message}`);
        resolve(false);
        return;
      }
      
      logSuccess('Соединение с БД установлено');
      
      // Тестируем простой запрос
      db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
          logError(`Ошибка выполнения запроса: ${err.message}`);
          db.close();
          resolve(false);
          return;
        }
        
        logSuccess(`Найдено таблиц в БД: ${row.count}`);
        db.close();
        resolve(true);
      });
    });
  });
}

async function checkPlayersTable() {
  logStep(3, 'Анализ таблицы players');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);
    
    // Проверяем существование таблицы
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='players'", (err, row) => {
      if (err) {
        logError(`Ошибка проверки таблицы: ${err.message}`);
        db.close();
        resolve(false);
        return;
      }
      
      if (!row) {
        logError('Таблица players не существует');
        db.close();
        resolve(false);
        return;
      }
      
      logSuccess('Таблица players найдена');
      
      // Проверяем структуру таблицы
      db.all("PRAGMA table_info(players)", (err, columns) => {
        if (err) {
          logError(`Ошибка получения структуры таблицы: ${err.message}`);
          db.close();
          resolve(false);
          return;
        }
        
        logInfo('Столбцы таблицы players:');
        columns.forEach(col => {
          log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`, 'white');
        });
        
        // Проверяем наличие критичных столбцов
        const hasX = columns.some(col => col.name === 'x');
        const hasY = columns.some(col => col.name === 'y');
        const hasId = columns.some(col => col.name === 'id');
        const hasName = columns.some(col => col.name === 'name');
        
        if (!hasId) {
          logError('Отсутствует столбец id');
          db.close();
          resolve(false);
          return;
        }
        
        if (!hasName) {
          logError('Отсутствует столбец name');
          db.close();
          resolve(false);
          return;
        }
        
        if (!hasX || !hasY) {
          logWarning('Отсутствуют столбцы координат x или y');
        } else {
          logSuccess('Столбцы координат найдены');
        }
        
        // Проверяем количество записей
        db.get("SELECT COUNT(*) as count FROM players", (err, countRow) => {
          if (err) {
            logError(`Ошибка подсчета записей: ${err.message}`);
            db.close();
            resolve(false);
            return;
          }
          
          logInfo(`Записей в таблице players: ${countRow.count}`);
          
          if (countRow.count === 0) {
            logWarning('Таблица players пуста');
          } else {
            logSuccess(`Найдено ${countRow.count} игроков`);
          }
          
          db.close();
          resolve(true);
        });
      });
    });
  });
}

async function fixCoordinateColumns() {
  logStep(4, 'Исправление столбцов координат');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);
    
    // Проверяем наличие столбцов x и y
    db.all("PRAGMA table_info(players)", (err, columns) => {
      if (err) {
        logError(`Ошибка проверки столбцов: ${err.message}`);
        db.close();
        resolve(false);
        return;
      }
      
      const hasX = columns.some(col => col.name === 'x');
      const hasY = columns.some(col => col.name === 'y');
      
      if (hasX && hasY) {
        logSuccess('Столбцы координат уже существуют');
        db.close();
        resolve(true);
        return;
      }
      
      logInfo('Добавляем отсутствующие столбцы координат...');
      
      const addColumns = [];
      if (!hasX) addColumns.push('ALTER TABLE players ADD COLUMN x REAL DEFAULT NULL');
      if (!hasY) addColumns.push('ALTER TABLE players ADD COLUMN y REAL DEFAULT NULL');
      
      let completed = 0;
      let hasError = false;
      
      addColumns.forEach(sql => {
        db.run(sql, (err) => {
          if (err) {
            logError(`Ошибка добавления столбца: ${err.message}`);
            hasError = true;
          } else {
            logSuccess(`Столбец добавлен: ${sql.includes(' x ') ? 'x' : 'y'}`);
          }
          
          completed++;
          if (completed === addColumns.length) {
            db.close();
            resolve(!hasError);
          }
        });
      });
      
      if (addColumns.length === 0) {
        db.close();
        resolve(true);
      }
    });
  });
}

async function testCoordinatesUpdate() {
  logStep(5, 'Тестирование обновления координат');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);
    
    // Ищем первого игрока для теста
    db.get("SELECT id FROM players LIMIT 1", (err, row) => {
      if (err) {
        logError(`Ошибка поиска игрока для теста: ${err.message}`);
        db.close();
        resolve(false);
        return;
      }
      
      if (!row) {
        logWarning('Нет игроков для тестирования');
        db.close();
        resolve(true);
        return;
      }
      
      const testPlayerId = row.id;
      const testX = 999.99;
      const testY = 888.88;
      
      logInfo(`Тестируем обновление координат игрока ${testPlayerId}...`);
      
      const sql = 'UPDATE players SET x = ?, y = ? WHERE id = ?';
      db.run(sql, [testX, testY, testPlayerId], function(err) {
        if (err) {
          logError(`Ошибка обновления координат: ${err.message}`);
          db.close();
          resolve(false);
          return;
        }
        
        if (this.changes === 0) {
          logError('Обновление не повлияло на записи');
          db.close();
          resolve(false);
          return;
        }
        
        // Проверяем что координаты обновились
        db.get("SELECT x, y FROM players WHERE id = ?", [testPlayerId], (err, checkRow) => {
          if (err) {
            logError(`Ошибка проверки обновленных координат: ${err.message}`);
            db.close();
            resolve(false);
            return;
          }
          
          if (checkRow.x === testX && checkRow.y === testY) {
            logSuccess(`Координаты успешно обновлены: (${checkRow.x}, ${checkRow.y})`);
          } else {
            logError(`Координаты не обновились правильно: ожидалось (${testX}, ${testY}), получено (${checkRow.x}, ${checkRow.y})`);
            db.close();
            resolve(false);
            return;
          }
          
          db.close();
          resolve(true);
        });
      });
    });
  });
}

async function createBackup() {
  logStep(6, 'Создание резервной копии БД');
  
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, BACKUP_PATH);
      logSuccess(`Резервная копия создана: ${BACKUP_PATH}`);
      return true;
    } else {
      logError('Исходная БД не найдена для создания копии');
      return false;
    }
  } catch (error) {
    logError(`Ошибка создания резервной копии: ${error.message}`);
    return false;
  }
}

async function runFullDiagnosis() {
  log('\n🚀 РАДИКАЛЬНАЯ ДИАГНОСТИКА БАЗЫ ДАННЫХ', 'magenta');
  log('==========================================', 'magenta');
  
  const results = {
    fileCheck: false,
    connectionTest: false,
    tableCheck: false,
    coordinatesFix: false,
    updateTest: false,
    backupCreated: false
  };
  
  // Создаем резервную копию в самом начале
  results.backupCreated = await createBackup();
  
  results.fileCheck = await checkDatabaseFile();
  if (!results.fileCheck) {
    log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Файл БД поврежден или отсутствует', 'red');
    return results;
  }
  
  results.connectionTest = await testDatabaseConnection();
  if (!results.connectionTest) {
    log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Невозможно подключиться к БД', 'red');
    return results;
  }
  
  results.tableCheck = await checkPlayersTable();
  if (!results.tableCheck) {
    log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Проблемы с таблицей players', 'red');
    return results;
  }
  
  results.coordinatesFix = await fixCoordinateColumns();
  if (!results.coordinatesFix) {
    log('\n⚠️  ПРЕДУПРЕЖДЕНИЕ: Не удалось исправить столбцы координат', 'yellow');
  }
  
  results.updateTest = await testCoordinatesUpdate();
  if (!results.updateTest) {
    log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Обновление координат не работает', 'red');
    return results;
  }
  
  // Итоговый отчет
  log('\n📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ', 'magenta');
  log('========================', 'magenta');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const testNames = {
      fileCheck: 'Проверка файла БД',
      connectionTest: 'Тест соединения',
      tableCheck: 'Анализ таблицы players',
      coordinatesFix: 'Исправление столбцов',
      updateTest: 'Тест обновления координат',
      backupCreated: 'Создание резервной копии'
    };
    log(`${status} ${testNames[test]}`, result ? 'green' : 'red');
  });
  
  const allCriticalPassed = results.fileCheck && results.connectionTest && 
                           results.tableCheck && results.updateTest;
  
  if (allCriticalPassed) {
    log('\n🎉 ВСЕ КРИТИЧЕСКИЕ ТЕСТЫ ПРОЙДЕНЫ!', 'green');
    log('База данных готова к работе.', 'green');
  } else {
    log('\n💥 НАЙДЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ!', 'red');
    log('Необходимо восстановление БД или создание новой.', 'red');
  }
  
  return results;
}

// Запуск диагностики
if (require.main === module) {
  runFullDiagnosis().catch(error => {
    logError(`Критическая ошибка диагностики: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runFullDiagnosis };
