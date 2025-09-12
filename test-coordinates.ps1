# 🎯 PowerShell ТЕСТ для VPS сервера
# Работает на Windows и Linux

Write-Host "🎯 PowerShell ТЕСТ КООРДИНАТ" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green

$API_BASE = "http://localhost:3001"

try {
    # 1. Проверяем сервер
    Write-Host "`n1. Проверка сервера..." -ForegroundColor Yellow
    $healthResponse = Invoke-RestMethod -Uri "$API_BASE/api/health" -Method Get
    Write-Host "✅ Сервер работает: $($healthResponse.status)" -ForegroundColor Green
    
    # 2. Получаем игроков
    Write-Host "`n2. Получение игроков..." -ForegroundColor Yellow
    $playersResponse = Invoke-RestMethod -Uri "$API_BASE/api/players" -Method Get
    $players = $playersResponse.players
    Write-Host "✅ Игроков получено: $($players.Count)" -ForegroundColor Green
    
    if ($players.Count -eq 0) {
        Write-Host "❌ Нет игроков для тестирования" -ForegroundColor Red
        exit 1
    }
    
    $testPlayer = $players[0]
    Write-Host "📍 Тестируем игрока $($testPlayer.id): $($testPlayer.name)" -ForegroundColor Cyan
    Write-Host "📍 Текущие координаты: x=$($testPlayer.x), y=$($testPlayer.y)" -ForegroundColor Cyan
    
    # 3. Тестируем PUT запрос
    Write-Host "`n3. Тест PUT запроса..." -ForegroundColor Yellow
    $testX = [math]::Round((Get-Random) * 800)
    $testY = [math]::Round((Get-Random) * 600)
    
    Write-Host "📤 PUT $API_BASE/api/players/$($testPlayer.id)" -ForegroundColor Cyan
    Write-Host "📤 Данные: {x: $testX, y: $testY}" -ForegroundColor Cyan
    
    $putData = @{
        x = $testX
        y = $testY
    } | ConvertTo-Json
    
    $putResponse = Invoke-RestMethod -Uri "$API_BASE/api/players/$($testPlayer.id)" -Method Put -Body $putData -ContentType "application/json"
    
    Write-Host "✅ PUT успешен" -ForegroundColor Green
    Write-Host "📋 Ответ: $($putResponse | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    
    # 4. Проверяем результат
    Write-Host "`n4. Проверка результата..." -ForegroundColor Yellow
    $checkResponse = Invoke-RestMethod -Uri "$API_BASE/api/players" -Method Get
    $updatedPlayer = $checkResponse.players | Where-Object { $_.id -eq $testPlayer.id }
    
    Write-Host "📍 Обновленные координаты: x=$($updatedPlayer.x), y=$($updatedPlayer.y)" -ForegroundColor Cyan
    
    if ($updatedPlayer.x -eq $testX -and $updatedPlayer.y -eq $testY) {
        Write-Host "`n🎉 ТЕСТ ПРОЙДЕН! Координаты работают!" -ForegroundColor Green
        Write-Host "🔥 Теперь в браузере должно работать без HTTP 500!" -ForegroundColor Green
        Write-Host "`n📱 Следующие шаги:" -ForegroundColor Yellow
        Write-Host "1. Откройте http://localhost:3000" -ForegroundColor White
        Write-Host "2. Войдите как admin/admin" -ForegroundColor White
        Write-Host "3. Перетащите любую фишку" -ForegroundColor White
        Write-Host "4. HTTP 500 должен исчезнуть!" -ForegroundColor White
    } else {
        Write-Host "`n❌ ТЕСТ ПРОВАЛЕН! Координаты не обновились!" -ForegroundColor Red
        Write-Host "Ожидалось: x=$testX, y=$testY" -ForegroundColor Red
        Write-Host "Получено: x=$($updatedPlayer.x), y=$($updatedPlayer.y)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ ОШИБКА PowerShell ТЕСТА:" -ForegroundColor Red
    Write-Host "Сообщение: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*connection*") {
        Write-Host "`n💡 РЕШЕНИЯ:" -ForegroundColor Yellow
        Write-Host "1. Запустите сервер: cd server && node server.js" -ForegroundColor White
        Write-Host "2. Проверьте что сервер запущен на порту 3001" -ForegroundColor White
        Write-Host "3. Проверьте что нет ошибок запуска сервера" -ForegroundColor White
    } else {
        Write-Host "`n💡 РЕШЕНИЯ:" -ForegroundColor Yellow
        Write-Host "1. Проверьте подключение к серверу" -ForegroundColor White
        Write-Host "2. Проверьте логи сервера" -ForegroundColor White
        Write-Host "3. Запустите диагностику: node diagnose-and-fix-db.js" -ForegroundColor White
    }
}
