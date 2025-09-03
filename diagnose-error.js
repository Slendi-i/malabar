#!/usr/bin/env node

/**
 * Диагностика ошибки "missing required error components"
 * Проверяет структуру проекта и возможные проблемы
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Диагностика ошибки Next.js...\n');

// Проверяем структуру проекта
const requiredFiles = [
  'pages/_app.js',
  'pages/_error.js', 
  'pages/404.js',
  'pages/500.js',
  'pages/index.js',
  'next.config.js',
  'package.json'
];

console.log('📁 Проверка обязательных файлов:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ОТСУТСТВУЕТ!`);
  }
});

// Проверяем package.json
console.log('\n📦 Проверка package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Next.js версия: ${packageJson.dependencies?.next || 'не указана'}`);
  console.log(`✅ React версия: ${packageJson.dependencies?.react || 'не указана'}`);
  
  if (packageJson.dependencies?.next && packageJson.dependencies.next.startsWith('15')) {
    console.log('⚠️ Обнаружена Next.js 15 - может требовать дополнительных компонентов');
  }
} catch (error) {
  console.log(`❌ Ошибка чтения package.json: ${error.message}`);
}

// Проверяем next.config.js
console.log('\n⚙️ Проверка next.config.js:');
try {
  const nextConfig = fs.readFileSync('next.config.js', 'utf8');
  if (nextConfig.includes('output: export')) {
    console.log('⚠️ Обнаружен export режим - может вызывать проблемы с error components');
  }
  if (nextConfig.includes('trailingSlash: true')) {
    console.log('✅ trailingSlash включен');
  }
  console.log('✅ next.config.js найден и читается');
} catch (error) {
  console.log(`❌ Ошибка чтения next.config.js: ${error.message}`);
}

// Проверяем компоненты
console.log('\n🧩 Проверка компонентов:');
const componentsDir = 'components';
if (fs.existsSync(componentsDir)) {
  const components = fs.readdirSync(componentsDir);
  console.log(`✅ Директория components найдена (${components.length} файлов)`);
  
  const requiredComponents = ['Sidebar.js', 'PlayerIcons.js', 'AuthModal.js'];
  requiredComponents.forEach(comp => {
    if (components.includes(comp)) {
      console.log(`✅ ${comp}`);
    } else {
      console.log(`❌ ${comp} - ОТСУТСТВУЕТ!`);
    }
  });
} else {
  console.log('❌ Директория components не найдена!');
}

// Проверяем services
console.log('\n🔧 Проверка services:');
const servicesDir = 'services';
if (fs.existsSync(servicesDir)) {
  const services = fs.readdirSync(servicesDir);
  console.log(`✅ Директория services найдена (${services.length} файлов)`);
  
  const requiredServices = ['apiService.js', 'useRealTimeSync.js'];
  requiredServices.forEach(service => {
    if (services.includes(service)) {
      console.log(`✅ ${service}`);
    } else {
      console.log(`❌ ${service} - ОТСУТСТВУЕТ!`);
    }
  });
} else {
  console.log('❌ Директория services не найдена!');
}

// Проверяем server
console.log('\n🚀 Проверка server:');
const serverDir = 'server';
if (fs.existsSync(serverDir)) {
  const serverFiles = fs.readdirSync(serverDir);
  console.log(`✅ Директория server найдена (${serverFiles.length} файлов)`);
  
  if (serverFiles.includes('server.js')) {
    console.log('✅ server.js найден');
  } else {
    console.log('❌ server.js не найден!');
  }
  
  if (serverFiles.includes('package.json')) {
    console.log('✅ package.json в server найден');
  } else {
    console.log('❌ package.json в server не найден!');
  }
} else {
  console.log('❌ Директория server не найдена!');
}

// Рекомендации
console.log('\n💡 РЕКОМЕНДАЦИИ:');
console.log('1. Убедитесь что все файлы созданы корректно');
console.log('2. Перезапустите серверы: npm run dev и node server/server.js');
console.log('3. Очистите кэш браузера');
console.log('4. Проверьте консоль браузера на наличие JavaScript ошибок');
console.log('5. Убедитесь что backend сервер работает на порту 3001');

console.log('\n🔧 Команды для исправления:');
console.log('# Остановить все процессы');
console.log('pkill -f "next dev" && pkill -f "node.*server"');
console.log('');
console.log('# Запустить backend');
console.log('cd server && node server.js');
console.log('');
console.log('# В другом терминале запустить frontend');
console.log('npm run dev');

console.log('\n📝 Если проблема остается:');
console.log('- Проверьте логи в консоли браузера');
console.log('- Проверьте логи сервера');
console.log('- Убедитесь что все импорты корректны');
console.log('- Проверьте что база данных доступна');
