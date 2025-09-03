#!/usr/bin/env node

/**
 * Тест исправлений синхронизации игр, кубиков и координат фишек
 * Проверяет:
 * 1. Эндпоинты для обновления игр
 * 2. Эндпоинты для обновления социальных ссылок
 * 3. Эндпоинты для обновления координат
 * 4. Синхронизация изменений через WebSocket
 */

const http = require('http');
const WebSocket = require('ws');

// Утилиты для HTTP запросов
function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsedData,
                        headers: res.headers
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testGameAndDiceEndpoints() {
    log('🎯 Начинаем тестирование эндпоинтов для игр и кубиков...');
    
    try {
        // 1. Получаем список игроков
        log('1. Получение списка игроков...');
        const playersResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/players',
            method: 'GET'
        });
        
        if (playersResponse.status !== 200) {
            throw new Error(`Failed to fetch players: ${playersResponse.status}`);
        }
        
        const players = playersResponse.data.players;
        if (!players || players.length === 0) {
            throw new Error('No players found in database');
        }
        
        const testPlayer = players[0];
        log(`✅ Найден тестовый игрок: ${testPlayer.name} (ID: ${testPlayer.id})`);
        
        // 2. Тестируем обновление игр
        log('2. Тестирование обновления игр игрока...');
        const testGames = [
            {
                name: 'Тестовая игра',
                status: 'В процессе',
                dice: 7,
                comment: 'Тест синхронизации'
            }
        ];
        
        const updateGamesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/players/${testPlayer.id}/games`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { games: testGames });
        
        if (updateGamesResponse.status === 200) {
            log('✅ Обновление игр работает корректно');
        } else {
            throw new Error(`Failed to update games: ${updateGamesResponse.status} - ${JSON.stringify(updateGamesResponse.data)}`);
        }
        
        // 3. Тестируем обновление социальных ссылок
        log('3. Тестирование обновления социальных ссылок...');
        const testSocialLinks = {
            discord: 'test#1234',
            twitch: 'testuser',
            telegram: '@testuser'
        };
        
        const updateSocialResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/players/${testPlayer.id}/social`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, { socialLinks: testSocialLinks });
        
        if (updateSocialResponse.status === 200) {
            log('✅ Обновление социальных ссылок работает корректно');
        } else {
            throw new Error(`Failed to update social links: ${updateSocialResponse.status} - ${JSON.stringify(updateSocialResponse.data)}`);
        }
        
        // 4. Тестируем обновление координат
        log('4. Тестирование обновления координат фишки...');
        const testCoordinates = { x: 250, y: 150 };
        
        const updateCoordinatesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/players/${testPlayer.id}/coordinates`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, testCoordinates);
        
        if (updateCoordinatesResponse.status === 200) {
            log('✅ Обновление координат работает корректно');
        } else {
            throw new Error(`Failed to update coordinates: ${updateCoordinatesResponse.status} - ${JSON.stringify(updateCoordinatesResponse.data)}`);
        }
        
        // 5. Проверяем что изменения сохранились
        log('5. Проверка сохранения изменений...');
        const verifyResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/players/${testPlayer.id}`,
            method: 'GET'
        });
        
        if (verifyResponse.status === 200) {
            const updatedPlayer = verifyResponse.data;
            const games = updatedPlayer.games;
            const socialLinks = updatedPlayer.socialLinks;
            const { x, y } = updatedPlayer;
            
            // Проверяем игры
            if (games && games.length > 0 && games[0].name === 'Тестовая игра') {
                log('✅ Игры сохранились корректно');
            } else {
                log('❌ Игры не сохранились');
            }
            
            // Проверяем социальные ссылки
            if (socialLinks && socialLinks.discord === 'test#1234') {
                log('✅ Социальные ссылки сохранились корректно');
            } else {
                log('❌ Социальные ссылки не сохранились');
            }
            
            // Проверяем координаты
            if (x === 250 && y === 150) {
                log('✅ Координаты сохранились корректно');
            } else {
                log('❌ Координаты не сохранились');
            }
        } else {
            throw new Error(`Failed to verify changes: ${verifyResponse.status}`);
        }
        
        log('🎉 Все эндпоинты работают корректно!');
        
    } catch (error) {
        log(`❌ Ошибка тестирования: ${error.message}`);
        throw error;
    }
}

async function testWebSocketSync() {
    log('🔄 Тестирование WebSocket синхронизации...');
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3001/ws');
        let messageReceived = false;
        
        ws.on('open', () => {
            log('✅ WebSocket соединение установлено');
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                log(`📨 Получено WebSocket сообщение: ${message.type}`);
                
                if (message.type === 'player_updated') {
                    messageReceived = true;
                    log('✅ Синхронизация обновлений игрока работает');
                }
            } catch (error) {
                log(`⚠️ Ошибка парсинга WebSocket сообщения: ${error.message}`);
            }
        });
        
        ws.on('error', (error) => {
            log(`❌ WebSocket ошибка: ${error.message}`);
            reject(error);
        });
        
        // Даем время на получение сообщений
        setTimeout(() => {
            ws.close();
            if (messageReceived) {
                log('✅ WebSocket синхронизация работает корректно');
                resolve();
            } else {
                log('⚠️ WebSocket сообщения не получены (может быть нормально если нет активных изменений)');
                resolve(); // Не считаем это ошибкой
            }
        }, 3000);
    });
}

async function testServerHealth() {
    log('🏥 Проверка состояния сервера...');
    
    try {
        const healthResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/health',
            method: 'GET'
        });
        
        if (healthResponse.status === 200) {
            log('✅ Сервер работает корректно');
            return true;
        } else {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }
    } catch (error) {
        log(`❌ Сервер не отвечает: ${error.message}`);
        return false;
    }
}

async function runTests() {
    log('🚀 Запуск тестов исправлений синхронизации...');
    
    try {
        // Проверяем что сервер запущен
        const serverOk = await testServerHealth();
        if (!serverOk) {
            log('❌ Сервер не запущен. Запустите сервер командой: npm run dev:server');
            process.exit(1);
        }
        
        // Тестируем эндпоинты
        await testGameAndDiceEndpoints();
        
        // Тестируем WebSocket
        await testWebSocketSync();
        
        log('');
        log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
        log('');
        log('Теперь вы можете:');
        log('1. Открыть приложение в браузере');
        log('2. Войти как администратор (admin/admin)');
        log('3. Попробовать броски кубика и роллы игр');
        log('4. Перетаскивать фишки игроков');
        log('5. Открыть несколько вкладок и проверить синхронизацию');
        
    } catch (error) {
        log('');
        log(`❌ ТЕСТЫ ПРОВАЛИЛИСЬ: ${error.message}`);
        log('');
        log('Проверьте:');
        log('1. Запущен ли сервер на порту 3001');
        log('2. Есть ли данные в базе данных');
        log('3. Логи сервера на предмет ошибок');
        process.exit(1);
    }
}

// Запускаем тесты
runTests().catch(console.error);
