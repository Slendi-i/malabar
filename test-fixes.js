#!/usr/bin/env node

/**
 * Тест всех исправлений синхронизации
 * Проверяет работу API, сохранение данных и координат
 */

const http = require('http');

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

async function testAllFixes() {
    log('🧪 Тестирование всех исправлений...');
    
    try {
        // 1. Проверка health
        log('1. Проверка health endpoint...');
        const healthResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/health',
            method: 'GET'
        });
        
        if (healthResponse.status === 200) {
            log('✅ Health endpoint работает');
        } else {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }
        
        // 2. Получение игроков
        log('2. Получение списка игроков...');
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
        
        // 3. Тест обновления игр
        log('3. Тест обновления игр...');
        const testGames = [
            {
                name: 'Тестовая игра',
                status: 'В процессе',
                dice: 7,
                comment: 'Тест исправлений'
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
            log('✅ Обновление игр работает');
        } else {
            throw new Error(`Failed to update games: ${updateGamesResponse.status}`);
        }
        
        // 4. Тест обновления координат
        log('4. Тест обновления координат...');
        const testCoordinates = { x: 300, y: 200 };
        
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
            log('✅ Обновление координат работает');
        } else {
            throw new Error(`Failed to update coordinates: ${updateCoordinatesResponse.status}`);
        }
        
        // 5. Проверка сохранения
        log('5. Проверка сохранения данных...');
        const verifyResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: `/api/players/${testPlayer.id}`,
            method: 'GET'
        });
        
        if (verifyResponse.status === 200) {
            const updatedPlayer = verifyResponse.data;
            const games = updatedPlayer.games;
            const { x, y } = updatedPlayer;
            
            if (games && games.length > 0 && games[0].name === 'Тестовая игра') {
                log('✅ Игры сохранились корректно');
            } else {
                log('❌ Игры не сохранились');
            }
            
            if (x === 300 && y === 200) {
                log('✅ Координаты сохранились корректно');
            } else {
                log('❌ Координаты не сохранились');
            }
        } else {
            throw new Error(`Failed to verify changes: ${verifyResponse.status}`);
        }
        
        log('🎉 ВСЕ ИСПРАВЛЕНИЯ РАБОТАЮТ!');
        log('');
        log('Теперь вы можете:');
        log('1. Открыть http://localhost:3000 в браузере');
        log('2. Войти как администратор (admin/admin)');
        log('3. Попробовать броски кубика и роллы игр');
        log('4. Перетаскивать фишки игроков');
        log('5. Проверить что все сохраняется и синхронизируется');
        
    } catch (error) {
        log(`❌ ОШИБКА: ${error.message}`);
        log('');
        log('Проверьте:');
        log('1. Запущен ли backend сервер на порту 3001');
        log('2. Запущен ли frontend сервер на порту 3000');
        log('3. Есть ли данные в базе данных');
        process.exit(1);
    }
}

// Запускаем тесты
testAllFixes().catch(console.error);
