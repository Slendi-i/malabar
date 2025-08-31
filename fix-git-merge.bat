@echo off
echo 🔧 Исправление Git merge конфликтов...
echo.

echo 📁 Проверка статуса Git...
git status

echo.
echo 📋 Варианты решения:
echo 1. Добавить все файлы и продолжить merge
echo 2. Сбросить к удаленной версии
echo 3. Сохранить изменения в stash и обновить
echo 4. Показать конфликтующие файлы
echo.

set /p choice="Выберите вариант (1-4): "

if "%choice%"=="1" goto add_files
if "%choice%"=="2" goto reset_hard
if "%choice%"=="3" goto stash_pull
if "%choice%"=="4" goto show_conflicts

:add_files
echo 📦 Добавление всех файлов...
git add .
echo 🔄 Продолжение merge...
git commit -m "Resolve merge conflicts - add all changes"
git pull --rebase
goto end

:reset_hard
echo ⚠️  ВНИМАНИЕ: Это удалит все локальные изменения!
set /p confirm="Продолжить? (y/N): "
if /i "%confirm%"=="y" (
    echo 🔄 Сброс к удаленной версии...
    git reset --hard HEAD
    git clean -fd
    git pull origin main
) else (
    echo Операция отменена.
)
goto end

:stash_pull
echo 💾 Сохранение изменений в stash...
git stash push -m "Auto stash before merge fix"
echo 🔄 Обновление с удаленного репозитория...
git pull origin main
echo 📤 Восстановление изменений...
git stash pop
goto end

:show_conflicts
echo 📋 Конфликтующие файлы:
git diff --name-only --diff-filter=U
echo.
echo 📋 Неотслеживаемые файлы:
git ls-files --others --exclude-standard
goto end

:end
echo.
echo ✅ Операция завершена!
echo 📊 Текущий статус:
git status
pause
