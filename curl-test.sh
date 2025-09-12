#!/bin/bash

# 🎯 CURL ТЕСТ для VPS сервера
# Не требует Node.js или npm

echo "🎯 CURL ТЕСТ КООРДИНАТ"
echo "====================="

API_BASE="http://localhost:3001"

# 1. Проверяем сервер
echo ""
echo "1. Проверка сервера..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/health")
echo "✅ Сервер: $HEALTH_RESPONSE"

if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "❌ Сервер не отвечает! Запустите: cd server && node server.js"
    exit 1
fi

# 2. Получаем игроков
echo ""
echo "2. Получение игроков..."
PLAYERS_RESPONSE=$(curl -s "$API_BASE/api/players")
echo "✅ Игроки получены"

# Извлекаем ID первого игрока
PLAYER_ID=$(echo "$PLAYERS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ -z "$PLAYER_ID" ]; then
    echo "❌ Нет игроков для тестирования"
    exit 1
fi

echo "📍 Тестируем игрока ID: $PLAYER_ID"

# 3. Тестируем PUT запрос
echo ""
echo "3. Тест PUT запроса..."
TEST_X=$((RANDOM % 800))
TEST_Y=$((RANDOM % 600))

echo "📤 PUT $API_BASE/api/players/$PLAYER_ID"
echo "📤 Данные: {x: $TEST_X, y: $TEST_Y}"

PUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -d "{\"x\":$TEST_X,\"y\":$TEST_Y}" \
  "$API_BASE/api/players/$PLAYER_ID")

# Разделяем ответ и статус код
PUT_BODY=$(echo "$PUT_RESPONSE" | head -n -1)
PUT_STATUS=$(echo "$PUT_RESPONSE" | tail -n 1)

echo "✅ PUT статус: $PUT_STATUS"

if [ "$PUT_STATUS" != "200" ]; then
    echo "❌ PUT ошибка: $PUT_STATUS"
    echo "Ответ: $PUT_BODY"
    exit 1
fi

echo "📋 PUT ответ: $PUT_BODY"

# 4. Проверяем результат
echo ""
echo "4. Проверка результата..."
CHECK_RESPONSE=$(curl -s "$API_BASE/api/players")

# Извлекаем координаты обновленного игрока
UPDATED_X=$(echo "$CHECK_RESPONSE" | grep -o "\"id\":$PLAYER_ID[^}]*\"x\":[0-9.]*" | grep -o '"x":[0-9.]*' | grep -o '[0-9.]*')
UPDATED_Y=$(echo "$CHECK_RESPONSE" | grep -o "\"id\":$PLAYER_ID[^}]*\"y\":[0-9.]*" | grep -o '"y":[0-9.]*' | grep -o '[0-9.]*')

echo "📍 Обновленные координаты: x=$UPDATED_X, y=$UPDATED_Y"

if [ "$UPDATED_X" = "$TEST_X" ] && [ "$UPDATED_Y" = "$TEST_Y" ]; then
    echo ""
    echo "🎉 ТЕСТ ПРОЙДЕН! Координаты работают!"
    echo "🔥 Теперь в браузере должно работать без HTTP 500!"
    echo ""
    echo "📱 Следующие шаги:"
    echo "1. Откройте http://localhost:3000"
    echo "2. Войдите как admin/admin"
    echo "3. Перетащите любую фишку"
    echo "4. HTTP 500 должен исчезнуть!"
else
    echo ""
    echo "❌ ТЕСТ ПРОВАЛЕН! Координаты не обновились!"
    echo "Ожидалось: x=$TEST_X, y=$TEST_Y"
    echo "Получено: x=$UPDATED_X, y=$UPDATED_Y"
    exit 1
fi
