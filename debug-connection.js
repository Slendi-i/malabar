#!/usr/bin/env node

/**
 * 🔍 ДИАГНОСТИКА СОЕДИНЕНИЯ
 * 
 * Простая утилита для проверки доступности API сервера
 * Запуск: node debug-connection.js
 */

const http = require('http');

// Конфигурация для тестирования
const TEST_CONFIG = {
  VPS_IP: '46.173.17.229',
  VPS_DOMAIN: 'vet-klinika-moscow.ru',
  LOCAL_HOST: 'localhost',
  API_PORT: 3001,
  FRONTEND_PORT: 3000,
  TIMEOUT: 5000
};

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Функция для проверки доступности порта
function checkPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const request = http.request({
      hostname: host,
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: timeout
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: true,
            status: response.statusCode,
            data: parsed,
            time: Date.now()
          });
        } catch (e) {
          resolve({
            success: false,
            error: 'Invalid JSON response',
            status: response.statusCode,
            data: data
          });
        }
      });
    });

    request.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        success: false,
        error: 'Connection timeout',
        timeout: true
      });
    });

    request.end();
  });
}

// Основная функция диагностики
async function runDiagnostics() {
  log('🔍 ДИАГНОСТИКА СОЕДИНЕНИЯ API СЕРВЕРА', 'bold');
  log('=' * 50, 'blue');
  
  const tests = [
    { name: 'VPS IP', host: TEST_CONFIG.VPS_IP, port: TEST_CONFIG.API_PORT },
    { name: 'VPS Domain', host: TEST_CONFIG.VPS_DOMAIN, port: TEST_CONFIG.API_PORT },
    { name: 'Localhost', host: TEST_CONFIG.LOCAL_HOST, port: TEST_CONFIG.API_PORT }
  ];

  for (const test of tests) {
    log(`\n📡 Тестируем ${test.name}: ${test.host}:${test.port}`, 'blue');
    
    const startTime = Date.now();
    const result = await checkPort(test.host, test.port, TEST_CONFIG.TIMEOUT);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      log(`✅ УСПЕХ (${duration}ms)`, 'green');
      log(`   Status: ${result.status}`, 'green');
      if (result.data) {
        log(`   Response: ${JSON.stringify(result.data)}`, 'green');
      }
    } else {
      log(`❌ ОШИБКА (${duration}ms)`, 'red');
      log(`   Error: ${result.error}`, 'red');
      if (result.code) {
        log(`   Code: ${result.code}`, 'red');
      }
      if (result.status) {
        log(`   HTTP Status: ${result.status}`, 'red');
      }
    }
  }

  log('\n🔧 РЕКОМЕНДАЦИИ:', 'yellow');
  log('1. Убедитесь что сервер запущен: node server/server.js', 'yellow');
  log('2. Проверьте что порт 3001 открыт на VPS', 'yellow');
  log('3. Проверьте файрвол настройки', 'yellow');
  log('4. Убедитесь что нет конфликтов портов', 'yellow');
  
  log('\n📋 ПОЛЕЗНЫЕ КОМАНДЫ:', 'blue');
  log('  - Проверить процессы на порту: lsof -i :3001', 'blue');
  log('  - Проверить доступность: curl http://46.173.17.229:3001/api/health', 'blue');
  log('  - Логи сервера: journalctl -u malabar-server -f', 'blue');
}

// Запуск диагностики
if (require.main === module) {
  runDiagnostics().catch(error => {
    log(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { checkPort, runDiagnostics };
