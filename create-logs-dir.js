#!/usr/bin/env node

/**
 * 📁 СОЗДАНИЕ ДИРЕКТОРИИ ЛОГОВ
 * 
 * Создает директорию logs для PM2 если её нет
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

console.log('📁 Создание директории логов...');
console.log('📍 Путь:', logsDir);

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Директория logs создана успешно');
  } else {
    console.log('✅ Директория logs уже существует');
  }
  
  // Проверяем права доступа
  fs.accessSync(logsDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log('✅ Права доступа к директории logs: OK');
  
} catch (error) {
  console.error('❌ Ошибка создания директории logs:', error.message);
  process.exit(1);
}
