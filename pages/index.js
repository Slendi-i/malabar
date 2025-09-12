import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@mui/material';
import Sidebar from '../components/Sidebar';
import PlayerIcons from '../components/PlayerIcons';
import AuthModal from '../components/AuthModal';
import apiService from '../services/apiService';
import { useRealTimeSync } from '../services/useRealTimeSync';
import { usePeriodicSync } from '../services/usePeriodicSync';

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ 
    width: 800, 
    height: 600,
    ratio: 0.75
  });
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const dataLoadedRef = useRef(false); // Флаг что данные уже загружены
  
  // 🚀 ОПТИМИЗАЦИЯ: Убрали автоматическое сохранение
  // Теперь данные сохраняются только при явных действиях пользователя

  // 🚀 Ссылка на функцию обновления координат
  const updatePlayerPositionRef = useRef(null);

  // 🚀 ОПТИМИЗИРОВАННЫЕ обработчики для real-time синхронизации  
  const handlePlayersUpdate = useCallback((type, data, playerId) => {
    console.log('🔄 WebSocket уведомление:', type, playerId, data);
    
    if ((type === 'coordinates' || type === 'player_position_update') && playerId && data) {
      console.log('🎯 Получены координаты через WebSocket:', { type, playerId, x: data.x, y: data.y });
      
      // Используем надежный ref вместо window объекта
      if (updatePlayerPositionRef.current) {
        console.log('📡 Вызываем updatePlayerPositionRef.current');
        updatePlayerPositionRef.current(playerId, data.x, data.y);
      } else {
        console.warn('❌ updatePlayerPositionRef.current не найдена');
        
        // Fallback - обновляем только React state
        setPlayers(prev => prev.map(player => 
          player.id === playerId 
            ? { ...player, x: data.x, y: data.y }
            : player
        ));
      }
      
    } else if (type === 'profile' && playerId && data) {
      // 🚀 ОПТИМИЗИРОВАННОЕ обновление профиля игрока
      console.log('📝 Обновление профиля игрока:', playerId, data);
      setPlayers(prev => prev.map(player => {
        if (player.id !== playerId) return player;
        
        // Умное обновление - только изменённые поля
        const updatedPlayer = { ...player };
        
        if (data.name !== undefined && data.name !== player.name) {
          updatedPlayer.name = data.name;
          console.log(`📝 Имя игрока ${playerId} изменено: ${player.name} → ${data.name}`);
        }
        
        if (data.avatar !== undefined && data.avatar !== player.avatar) {
          updatedPlayer.avatar = data.avatar;
          console.log(`📝 Аватар игрока ${playerId} изменён`);
        }
        
        if (data.games !== undefined && JSON.stringify(data.games) !== JSON.stringify(player.games)) {
          updatedPlayer.games = data.games;
          console.log(`📝 Игры игрока ${playerId} обновлены`);
        }
        
        if (data.stats !== undefined && JSON.stringify(data.stats) !== JSON.stringify(player.stats)) {
          updatedPlayer.stats = data.stats;
          console.log(`📝 Статистика игрока ${playerId} обновлена`);
        }
        
        if (data.socialLinks !== undefined && JSON.stringify(data.socialLinks) !== JSON.stringify(player.socialLinks)) {
          updatedPlayer.socialLinks = data.socialLinks;
          console.log(`📝 Социальные ссылки игрока ${playerId} обновлены`);
        }
        
        if (data.isOnline !== undefined && data.isOnline !== player.isOnline) {
          updatedPlayer.isOnline = data.isOnline;
          console.log(`📝 Статус онлайн игрока ${playerId}: ${data.isOnline ? 'онлайн' : 'офлайн'}`);
        }
        
        // x и y НЕ обновляем - координаты управляются только через coordinates тип
        return updatedPlayer;
      }));
      
    } else if (type === 'initial_load' && Array.isArray(data)) {
      // ТОЛЬКО при первой загрузке - полное обновление
      console.log('📥 Первичная загрузка данных:', data.length, 'игроков');
      if (!dataLoadedRef.current) {
        const normalizedPlayers = data.map(player => ({
          ...player,
          avatar: player.avatar || '',
          games: Array.isArray(player.games) ? player.games : [],
          stats: player.stats || { wins: 0, rerolls: 0, drops: 0 },
          socialLinks: player.socialLinks || { twitch: '', telegram: '', discord: '' },
          position: player.position || player.id,
          x: player.x !== undefined ? player.x : ((player.position - 1) % 3) * 200 + 100,
          y: player.y !== undefined ? player.y : Math.floor((player.position - 1) / 3) * 200 + 100
        }));
        
        setPlayers(normalizedPlayers);
        dataLoadedRef.current = true;
        setSyncStatus('synchronized');
      }
    }
  }, []);
  
  // Функция для обработки обновления позиций игроков
  const handlePlayerPositionUpdate = useCallback((playerId, x, y) => {
    console.log(`🔄 Уведомление о изменении позиции игрока ${playerId}: (${x}, ${y})`);
    // Это вызывается когда PlayerIcons сохранил позицию в БД
    // Здесь мы можем отправить WebSocket уведомление другим пользователям
    // (Будет реализовано в сервере)
  }, []);

  const handleUserUpdate = useCallback((type, data) => {
    if (type === 'login' && data) {
      // Можно добавить логику для отображения уведомлений о входе других пользователей
    }
  }, []);

  // Убрали функцию debouncedSave - теперь сохранение происходит только через компоненты
  // Это избегает конфликтов с real-time синхронизацией

  // Initialize WebSocket connection
  const { isConnected, connectionStatus, reconnect } = useRealTimeSync(handlePlayersUpdate, handleUserUpdate);
  
  // 🚀 АВТОМАТИЧЕСКАЯ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ каждые 10 секунд
  const { 
    syncStatus: periodicSyncStatus, 
    lastSyncTime, 
    syncOnChange, 
    isSyncing 
  } = usePeriodicSync(players, setPlayers, currentUser, setCurrentUser);

  // 🚀 ОТЛАДКА: Проверяем что хук монтируется
  console.log('🔧 Periodic sync hook mounted, isSyncing:', isSyncing);

  // 🚀 ОБНОВЛЕННЫЙ СТАТУС СИНХРОНИЗАЦИИ с учётом периодической синхронизации
  useEffect(() => {
    if (isSyncing) {
      setSyncStatus('syncing');
    } else if (isConnected) {
      setSyncStatus('synchronized');
    } else {
      switch (connectionStatus) {
        case 'connecting':
          setSyncStatus('connecting');
          break;
        case 'reconnecting':
          setSyncStatus('reconnecting');
          break;
        case 'failed':
          setSyncStatus('fallback');
          break;
        case 'error':
          setSyncStatus('error');
          break;
        default:
          setSyncStatus('disconnected');
      }
    }
  }, [isConnected, connectionStatus, isSyncing]);

  // Инициализация компонента
  useEffect(() => {
    setIsMounted(true);

    // Восстанавливаем пользователя из localStorage
    const restoreUserFromStorage = () => {
      // Проверяем, что мы в браузере
      if (typeof window === 'undefined') return null;
      
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setCurrentUser(userData);
          return userData;
        }
      } catch (error) {
        console.error('Ошибка восстановления пользователя из localStorage:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('currentUser'); // Очищаем поврежденные данные
        }
      }
      return null;
    };

    const loadData = async () => {
      // 🚀 ОПТИМИЗАЦИЯ: Защита от повторных загрузок
      if (dataLoadedRef.current) {
        console.log('📋 Данные уже загружены, пропускаем повторную загрузку');
        return;
      }
      
      try {
        console.log('🔄 ЕДИНОРАЗОВАЯ загрузка данных...');
        setSyncStatus('connecting');
        
        // Сначала восстанавливаем пользователя
        const restoredUser = restoreUserFromStorage();
        
        // Load players from API ОДИН раз
        const response = await apiService.getPlayers();
        
        // Проверяем что получили корректный ответ с данными игроков
        if (response && response.players && Array.isArray(response.players)) {
          const normalizedPlayers = response.players.map(player => ({
            ...player,
            // Нормализуем аватар - убираем дублирование полей image/avatar
            avatar: player.avatar || '',
            games: Array.isArray(player.games) ? player.games : [],
            stats: player.stats || {
              wins: 0,
              rerolls: 0,
              drops: 0,
              position: player.id
            },
            // 🚨 РАДИКАЛЬНО: НЕ ЗАГРУЖАЕМ КООРДИНАТЫ В REACT STATE
            // Позиции будут загружены напрямую в DOM через API в PlayerIcons
          }));
          
          setPlayers(normalizedPlayers);
          dataLoadedRef.current = true; // 🔒 Блокируем повторные загрузки
          
          console.log('✅ Данные загружены ОДИН раз:', normalizedPlayers?.length, 'игроков');
          setSyncStatus('synchronized');
        } else {
          console.error('❌ Некорректный ответ от API:', response);
          setSyncStatus('error');
          // НЕ создаем дефолтных игроков - это может перезаписать БД!
        }
        
        // Пытаемся загрузить пользователя из API только если не восстановили из localStorage
        if (!restoredUser) {
          try {
            const apiUser = await apiService.getCurrentUser();
            // Если API вернул null (не авторизован) или Guest - очищаем состояние
            if (apiUser && apiUser.username && apiUser.username !== 'Guest' && apiUser.isLoggedIn) {
              setCurrentUser(apiUser);
              // Сохраняем в localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('currentUser', JSON.stringify(apiUser));
              }
            } else {
              // Очищаем состояние если пользователь не авторизован
              setCurrentUser(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('currentUser');
              }
            }
          } catch (e) {
            console.warn('Failed to load user from API:', e);
            // При ошибке API тоже очищаем состояние
            setCurrentUser(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('currentUser');
            }
          }
        }
      } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        setSyncStatus('error');
      }
    };

    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);

  // Обновление размеров при изменении окна
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imageDimensions.ratio) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedHeight = containerWidth * imageDimensions.ratio;
        
        setImageDimensions(prev => ({
          ...prev,
          width: containerWidth,
          height: calculatedHeight
        }));
      }
    };

    // Only add resize listener if we're in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize(); // Инициализация размеров

      return () => window.removeEventListener('resize', handleResize);
    }
  }, [imageDimensions.ratio]);

  // УБРАЛИ АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ - оно создавало бесконечные циклы!
  // Теперь сохранение происходит только явно через компоненты (PlayerProfileModal, PlayerIcons)
  // Real-time sync обновляет состояние из БД как источника истины

  // Обработчики авторизации
  const handleLogin = async (login, password) => {
    try {
      let userData;
      
      if (login === 'admin' && password === 'admin') {
        userData = { type: 'admin', id: 0, name: 'Администратор' };
      } else {
        const playerNumber = parseInt(login.replace('Player', ''));
        if (!isNaN(playerNumber) && login === `Player${playerNumber}` && password === `Player${playerNumber}`) {
          userData = {
            type: 'player',
            id: playerNumber,
            name: `Игрок ${playerNumber}`
          };
        } else {
          userData = { type: 'viewer', id: -1, name: 'Зритель' };
        }
      }
      
      // Save user to API (fix format for server)
      await apiService.setCurrentUser({
        username: userData.name,
        isLoggedIn: true
      });
      setCurrentUser(userData);
      
      // Сохраняем в localStorage для persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Fallback to local state if API fails
      let fallbackUserData;
      if (login === 'admin' && password === 'admin') {
        fallbackUserData = { type: 'admin', id: 0, name: 'Администратор' };
      } else {
        const playerNumber = parseInt(login.replace('Player', ''));
        if (!isNaN(playerNumber) && login === `Player${playerNumber}` && password === `Player${playerNumber}`) {
          fallbackUserData = {
            type: 'player',
            id: playerNumber,
            name: `Игрок ${playerNumber}`
          };
        } else {
          fallbackUserData = { type: 'viewer', id: -1, name: 'Зритель' };
        }
      }
      
      setCurrentUser(fallbackUserData);
      // Сохраняем fallback данные в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(fallbackUserData));
      }
      
      // Пытаемся сохранить в API тоже (для fallback случая)
      try {
        await apiService.setCurrentUser({
          username: fallbackUserData.name,
          isLoggedIn: true
        });
      } catch (apiError) {
        console.warn('Fallback API save failed, using localStorage only:', apiError);
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Используем новый метод logout
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    // Очищаем состояние и localStorage
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  };

  // 🚀 УБРАЛИ cleanup для saveTimeoutRef - теперь сохранение в дочерних компонентах

  if (!isMounted) return null;

  return (
    <div className="flex relative h-screen w-full bg-gray-100">
      {/* 🚀 УПРОЩЕННЫЙ ИНДИКАТОР СИНХРОНИЗАЦИИ - только цвет */}
      <div className="absolute bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg">
          <div 
            className={`w-3 h-3 rounded-full ${
              syncStatus === 'synchronized' ? 'bg-green-500' :
              syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
              syncStatus === 'saving' ? 'bg-yellow-500' :
              syncStatus === 'connecting' ? 'bg-blue-500 animate-pulse' :
              syncStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
              syncStatus === 'fallback' ? 'bg-purple-500' :
              syncStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={
              syncStatus === 'synchronized' ? 'Синхронизировано' :
              syncStatus === 'syncing' ? 'Синхронизация...' :
              syncStatus === 'saving' ? 'Сохранение...' :
              syncStatus === 'connecting' ? 'Подключение...' :
              syncStatus === 'reconnecting' ? 'Переподключение...' :
              syncStatus === 'fallback' ? 'HTTP режим' :
              syncStatus === 'error' ? 'Ошибка синхронизации' :
              'Не подключен'
            }
          />
          {/* Кнопка восстановления только при ошибках */}
          {(syncStatus === 'error' || syncStatus === 'fallback') && (
            <button 
              onClick={reconnect}
              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
              title="Восстановить соединение"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Кнопка авторизации */}
      <div className="absolute top-4 right-20 z-50">
        {currentUser && currentUser.name && currentUser.isLoggedIn ? (
          <Button 
            variant="contained" 
            onClick={handleLogout}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '14px 24px',
              gap: '10px',
              width: 'auto',
              height: '49px',
              background: '#151515',
              borderRadius: '6px',
              textTransform: 'none',
              fontFamily: 'Raleway',
              fontStyle: 'normal',
              fontWeight: 700,
              fontSize: '18px',
              lineHeight: '21px',
              color: '#FFFFFF',
              '&:hover': {
                background: '#333333',
              },
              boxShadow: 'none'
            }}
          >
            Выйти ({currentUser.name})
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={() => setAuthModalOpen(true)}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '14px 24px',
              gap: '10px',
              width: 'auto',
              height: '49px',
              background: '#151515',
              borderRadius: '6px',
              textTransform: 'none',
              fontFamily: 'Raleway',
              fontStyle: 'normal',
              fontWeight: 700,
              fontSize: '18px',
              lineHeight: '21px',
              color: '#FFFFFF',
              '&:hover': {
                background: '#333333',
              },
              boxShadow: 'none'
            }}
          >
            Войти
          </Button>
        )}
      </div>

      <Sidebar 
        players={players} 
        setPlayers={setPlayers}
        currentUser={currentUser}
      />

      {/* Игровое поле */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-y-auto overflow-x-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#151515 #EDEDED',
        }}
      >
        <div
          style={{
            width: '100%',
            height: `${imageDimensions.height}px`,
            minHeight: '100vh',
            position: 'relative'
          }}
        >
          {/* Hidden image for dimension detection */}
          <img
            ref={imageRef}
            src="/game-field.jpg"
            alt="Game field"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0
            }}
            onLoad={() => {
              if (imageRef.current) {
                const ratio = imageRef.current.naturalHeight / imageRef.current.naturalWidth;
                setImageDimensions({
                  width: imageRef.current.naturalWidth,
                  height: imageRef.current.naturalHeight,
                  ratio
                });
              }
            }}
            onError={() => {
              console.warn('Failed to load game-field.jpg, using default dimensions');
              // Keep default dimensions
            }}
          />
          
          {/* Player icons overlay */}
          <div style={{ position: 'relative', zIndex: 1 }}>
        <PlayerIcons 
          players={players} 
          setPlayers={setPlayers}
          currentUser={currentUser}
          onPlayerPositionUpdate={handlePlayerPositionUpdate}
          updatePlayerPositionRef={updatePlayerPositionRef}
          syncOnChange={syncOnChange}
        />
          </div>
        </div>
      </div>

      {/* Глобальные стили для скроллбара */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #EDEDED;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #151515;
          border-radius: 4px;
        }
      `}</style>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}