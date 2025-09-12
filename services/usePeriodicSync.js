import { useEffect, useRef, useCallback, useState } from 'react';
import apiService from './apiService';

/**
 * 🚀 ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ
 * Синхронизирует все данные каждые 10 секунд вместо постоянных подключений к БД
 */
export function usePeriodicSync(players, setPlayers, currentUser, setCurrentUser) {
  const syncIntervalRef = useRef(null);
  const lastSyncRef = useRef(Date.now());
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const isInitializedRef = useRef(false);

  // 🚀 ПОЛНАЯ СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ
  const performFullSync = useCallback(async () => {
    console.log('🔄 ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Начинаем полную синхронизацию...');
    setSyncStatus('syncing');
    
    try {
      // 1. Синхронизируем игроков
      console.log('📥 Синхронизация игроков...');
      const playersResponse = await apiService.getPlayers();
      const playersData = playersResponse.players || [];
      
      console.log(`📥 Получено ${playersData.length} игроков из БД`);
      
      // Обновляем состояние игроков
      setPlayers(playersData);
      
      // 2. Синхронизируем текущего пользователя
      if (currentUser && currentUser.id) {
        console.log('👤 Синхронизация текущего пользователя...');
        const userResponse = await apiService.getCurrentUser();
        if (userResponse) {
          setCurrentUser(userResponse);
          console.log('👤 Пользователь синхронизирован:', userResponse.name);
        }
      }
      
      // 3. Обновляем время последней синхронизации
      const now = Date.now();
      lastSyncRef.current = now;
      setLastSyncTime(new Date(now));
      
      console.log('✅ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Завершена успешно');
      setSyncStatus('success');
      
      // Сбрасываем статус через 2 секунды
      setTimeout(() => setSyncStatus('idle'), 2000);
      
    } catch (error) {
      console.error('❌ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Ошибка:', error);
      setSyncStatus('error');
      
      // Сбрасываем статус ошибки через 5 секунд
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [players, setPlayers, currentUser, setCurrentUser]);

  // 🚀 ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ (при изменениях)
  const forceSync = useCallback(async () => {
    console.log('⚡ ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ: Запускаем немедленно...');
    await performFullSync();
  }, [performFullSync]);

  // 🚀 ИНИЦИАЛИЗАЦИЯ ПЕРИОДИЧЕСКОЙ СИНХРОНИЗАЦИИ
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🚀 ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Инициализация...');
      
      // Первая синхронизация сразу
      performFullSync();
      isInitializedRef.current = true;
      
      // Устанавливаем интервал на 10 секунд
      syncIntervalRef.current = setInterval(() => {
        console.log('⏰ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Время синхронизации (10 сек)');
        performFullSync();
      }, 10000); // 10 секунд
      
      console.log('✅ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Интервал установлен на 10 секунд');
    }

    // Cleanup при размонтировании
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        console.log('🧹 ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Интервал очищен');
      }
    };
  }, [performFullSync]);

  // 🚀 СИНХРОНИЗАЦИЯ ПРИ ИЗМЕНЕНИЯХ (debounced)
  const syncOnChange = useCallback(() => {
    console.log('🔄 СИНХРОНИЗАЦИЯ ПРИ ИЗМЕНЕНИЯХ: Запускаем через 2 секунды...');
    
    // Очищаем предыдущий timeout
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    // Запускаем синхронизацию через 2 секунды
    setTimeout(() => {
      performFullSync();
      
      // Восстанавливаем периодическую синхронизацию
      syncIntervalRef.current = setInterval(() => {
        console.log('⏰ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Время синхронизации (10 сек)');
        performFullSync();
      }, 10000);
    }, 2000);
  }, [performFullSync]);

  return {
    syncStatus,
    lastSyncTime,
    forceSync,
    syncOnChange,
    isSyncing: syncStatus === 'syncing'
  };
}
