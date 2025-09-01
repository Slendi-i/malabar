#!/bin/bash

echo "🧪 ТЕСТИРОВАНИЕ ВСЕХ ИСПРАВЛЕНИЙ"
echo "==============================="

# Флаги для отслеживания результатов
TESTS_PASSED=0
TESTS_FAILED=0

# Функция для тестирования
test_check() {
    local test_name="$1"
    local test_command="$2"
    local expected="$3"
    
    echo -n "🔍 $test_name: "
    
    result=$(eval "$test_command" 2>/dev/null)
    
    if [[ $result == *"$expected"* ]]; then
        echo "✅ PASSED"
        ((TESTS_PASSED++))
    else
        echo "❌ FAILED"
        echo "   Expected: $expected"
        echo "   Got: $result"
        ((TESTS_FAILED++))
    fi
}

echo "1️⃣ ТЕСТИРОВАНИЕ ФАЙЛОВ И КОНФИГУРАЦИИ"
echo "======================================"

# Проверка существования файлов
test_check "server.js существует" "[ -f server/server.js ] && echo 'exists'" "exists"
test_check "next.config.js корректен" "grep -q 'poweredByHeader: false' next.config.js && echo 'correct'" "correct"
test_check "ecosystem.config.js обновлен" "grep -q 'restart_delay' ecosystem.config.js && echo 'updated'" "updated"
test_check "api.js улучшен" "grep -q 'getApiBaseUrl' config/api.js && echo 'improved'" "improved"

echo ""
echo "2️⃣ ТЕСТИРОВАНИЕ СИНТАКСИСА JAVASCRIPT"
echo "====================================="

# Проверка синтаксиса server.js
if node -c server/server.js 2>/dev/null; then
    echo "✅ server.js: Синтаксис корректен"
    ((TESTS_PASSED++))
else
    echo "❌ server.js: Ошибки синтаксиса"
    ((TESTS_FAILED++))
fi

# Проверка API конфигурации
if node -e "require('./config/api.js')" 2>/dev/null; then
    echo "✅ config/api.js: Модуль загружается"
    ((TESTS_PASSED++))
else
    echo "❌ config/api.js: Ошибки модуля"
    ((TESTS_FAILED++))
fi

echo ""
echo "3️⃣ ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ КОДА"
echo "================================"

# Проверка исправления lastUpdate
if ! grep -q "lastUpdate" server/server.js; then
    echo "✅ Исправление lastUpdate: Переменная удалена"
    ((TESTS_PASSED++))
else
    echo "❌ Исправление lastUpdate: Переменная все еще присутствует"
    ((TESTS_FAILED++))
fi

# Проверка отсутствия дублированных маршрутов
duplicate_routes=$(grep -c "app.get('/api/players/:id'" server/server.js || echo "0")
if [ "$duplicate_routes" = "1" ]; then
    echo "✅ Дублированные маршруты: Исправлено"
    ((TESTS_PASSED++))
else
    echo "❌ Дублированные маршруты: Проблема остается ($duplicate_routes найдено)"
    ((TESTS_FAILED++))
fi

# Проверка отсутствия output: export в next.config.js
if ! grep -q "output.*export" next.config.js; then
    echo "✅ Next.js конфигурация: Конфликт устранен"
    ((TESTS_PASSED++))
else
    echo "❌ Next.js конфигурация: Конфликт остается"
    ((TESTS_FAILED++))
fi

# Проверка что swcMinify убран (устаревший в Next.js 15+)
if ! grep -q "swcMinify.*true" next.config.js; then
    echo "✅ Next.js swcMinify: Устаревший параметр убран"
    ((TESTS_PASSED++))
else
    echo "❌ Next.js swcMinify: Устаревший параметр все еще есть"
    ((TESTS_FAILED++))
fi

echo ""
echo "4️⃣ ТЕСТИРОВАНИЕ ЗАВИСИМОСТЕЙ"
echo "============================"

# Проверка зависимостей сервера
if [ -d "server/node_modules" ]; then
    echo "✅ Backend зависимости: Установлены"
    ((TESTS_PASSED++))
else
    echo "⚠️ Backend зависимости: Требуется npm install в server/"
    ((TESTS_FAILED++))
fi

# Проверка зависимостей фронтенда
if [ -d "node_modules" ]; then
    echo "✅ Frontend зависимости: Установлены"
    ((TESTS_PASSED++))
else
    echo "⚠️ Frontend зависимости: Требуется npm install"
    ((TESTS_FAILED++))
fi

echo ""
echo "5️⃣ ТЕСТИРОВАНИЕ РАБОТОСПОСОБНОСТИ (если запущено)"
echo "=============================================="

# Проверка backend
if curl -s --connect-timeout 3 http://localhost:3001/api/health >/dev/null 2>&1; then
    test_check "Backend Health API" "curl -s http://localhost:3001/api/health" "OK"
    test_check "Backend Players API" "curl -s http://localhost:3001/api/players | head -1" "["
else
    echo "⚠️ Backend не запущен - тесты API пропущены"
    ((TESTS_FAILED += 2))
fi

# Проверка frontend
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3000 2>/dev/null || echo "000")
if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend доступен (код: $frontend_status)"
    ((TESTS_PASSED++))
else
    echo "⚠️ Frontend недоступен (код: $frontend_status)"
    ((TESTS_FAILED++))
fi

echo ""
echo "6️⃣ ТЕСТИРОВАНИЕ PM2 КОНФИГУРАЦИИ"
echo "==============================="

# Проверка PM2 статуса
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q "malabar"; then
        backend_status=$(pm2 list | grep "malabar-backend" | grep -o "online\|stopped\|errored" || echo "not_found")
        frontend_status=$(pm2 list | grep "malabar-frontend" | grep -o "online\|stopped\|errored" || echo "not_found")
        
        if [ "$backend_status" = "online" ]; then
            echo "✅ PM2 Backend: Работает"
            ((TESTS_PASSED++))
        else
            echo "⚠️ PM2 Backend: $backend_status"
            ((TESTS_FAILED++))
        fi
        
        if [ "$frontend_status" = "online" ]; then
            echo "✅ PM2 Frontend: Работает"
            ((TESTS_PASSED++))
        else
            echo "⚠️ PM2 Frontend: $frontend_status"
            ((TESTS_FAILED++))
        fi
    else
        echo "⚠️ PM2: Процессы malabar не найдены"
        ((TESTS_FAILED += 2))
    fi
else
    echo "⚠️ PM2: Не установлен"
    ((TESTS_FAILED += 2))
fi

echo ""
echo "📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ"
echo "========================="
echo "✅ Тесты пройдены: $TESTS_PASSED"
echo "❌ Тесты провалены: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! ИСПРАВЛЕНИЯ РАБОТАЮТ КОРРЕКТНО!"
    echo ""
    echo "🚀 Готово к работе:"
    echo "   - Все критические ошибки исправлены"
    echo "   - Конфигурация оптимизирована" 
    echo "   - Код проверен на синтаксис"
    echo "   - Дублирования устранены"
    echo ""
    echo "🌐 Проверьте доступность:"
    echo "   http://localhost:3000"
    echo "   http://46.173.17.229:3000"
    echo "   http://vet-klinika-moscow.ru"
    
elif [ $TESTS_FAILED -le 3 ]; then
    echo ""
    echo "⚠️ БОЛЬШИНСТВО ИСПРАВЛЕНИЙ РАБОТАЮТ"
    echo "Некоторые проблемы требуют внимания (возможно, нужно запустить сервер)"
    echo ""
    echo "Рекомендации:"
    echo "1. Запустите: ./stable-deploy.sh"
    echo "2. Проверьте: ./stable-diagnose.sh"
    
else
    echo ""
    echo "❌ ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ РАБОТА"
    echo "Несколько критических проблем все еще присутствуют"
    echo ""
    echo "Рекомендации:"
    echo "1. Проверьте установку зависимостей: npm install"
    echo "2. Запустите полное развертывание: ./stable-deploy.sh"
    echo "3. Проверьте логи: pm2 logs"
fi

echo ""
echo "🔧 Полезные команды:"
echo "   ./stable-deploy.sh      # Полное развертывание"
echo "   ./stable-diagnose.sh    # Диагностика"
echo "   ./quick-restore.sh      # Быстрое восстановление"
echo "   pm2 status              # Статус процессов"
