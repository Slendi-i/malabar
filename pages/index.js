import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@mui/material';
import Sidebar from '../components/Sidebar';
import PlayerIcons from '../components/PlayerIcons';
import AuthModal from '../components/AuthModal';
import apiService from '../services/apiService';
import { useRealTimeSync } from '../services/useRealTimeSync';

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
  const lastSaveRef = useRef(Date.now());
  const saveTimeoutRef = useRef(null);

  // Обработчики для real-time синхронизации
  const handlePlayersUpdate = useCallback((type, data, playerId) => {
    console.log('🔄 Получено обновление из БД:', type, data);
    
    // БД является источником истины - применяем все обновления
    if (type === 'single' && playerId && data) {
      console.log('📝 Обновление одного игрока из БД:', playerId, data);
      setPlayers(prev => prev.map(player => 
        player.id === playerId ? { 
          ...player, 
          ...data,
          // Нормализуем данные
          avatar: data.avatar || player.avatar || '',
          games: Array.isArray(data.games) ? data.games : player.games || [],
          stats: data.stats || player.stats || { wins: 0, rerolls: 0, drops: 0 },
          socialLinks: data.socialLinks || player.socialLinks || { twitch: '', telegram: '', discord: '' },
          position: data.position !== undefined ? data.position : player.position,
          x: data.x !== undefined ? data.x : player.x,
          y: data.y !== undefined ? data.y : player.y
        } : player
      ));
    } else if (type === 'batch' && Array.isArray(data)) {
      console.log('📝 Обновление всех игроков из БД:', data.length);
      setPlayers(data.map(player => ({
        ...player,
        // Нормализуем аватар 
        avatar: player.avatar || '',
        games: Array.isArray(player.games) ? player.games : [],
        stats: player.stats || { wins: 0, rerolls: 0, drops: 0 },
        socialLinks: player.socialLinks || { twitch: '', telegram: '', discord: '' },
        position: player.position || player.id,
        x: player.x !== undefined ? player.x : ((player.position - 1) % 3) * 200 + 100,
        y: player.y !== undefined ? player.y : Math.floor((player.position - 1) / 3) * 200 + 100
      })));
    }
    
    setSyncStatus('synchronized');
  }, []);

  const handleUserUpdate = useCallback((type, data) => {
    console.log('Received user update:', type, data);
    if (type === 'login' && data) {
      // Можно добавить логику для отображения уведомлений о входе других пользователей
    }
  }, []);

  // Убрали функцию debouncedSave - теперь сохранение происходит только через компоненты
  // Это избегает конфликтов с real-time синхронизацией

  // Initialize WebSocket connection
  const { isConnected, connectionStatus, reconnect } = useRealTimeSync(handlePlayersUpdate, handleUserUpdate);

  // Update sync status based on WebSocket connection
  useEffect(() => {
    if (isConnected) {
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
  }, [isConnected, connectionStatus]);

  // Инициализация компонента
  useEffect(() => {
    setIsMounted(true);

    const loadData = async () => {
      try {
        console.log('🔄 Загрузка данных игроков...');
        // Load players from API
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
            // Сохраняем x,y координаты если они есть
            x: player.x !== undefined ? player.x : ((player.position - 1) % 3) * 200 + 100,
            y: player.y !== undefined ? player.y : Math.floor((player.position - 1) / 3) * 200 + 100
          }));
          
          setPlayers(normalizedPlayers);
          console.log('✅ Данные игроков загружены из БД:', normalizedPlayers?.length || 0);
          setSyncStatus('synchronized');
        } else {
          console.error('❌ Некорректный ответ от API:', response);
          setSyncStatus('error');
          // НЕ создаем дефолтных игроков - это может перезаписать БД!
          console.log('🚫 Ожидаем восстановления связи с БД, НЕ создаем дефолтные данные');
        }
        
        // Load current user from API
        try {
          const apiUser = await apiService.getCurrentUser();
          if (apiUser) {
            setCurrentUser(apiUser);
          }
        } catch (e) {
          console.warn('Failed to load user from API:', e);
        }
      } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        setSyncStatus('error');
        console.log('🚫 Ошибка подключения к БД, НЕ перезаписываем данные');
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
      
      // Save user to API
      await apiService.setCurrentUser(userData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      // Fallback to local state if API fails
      if (login === 'admin' && password === 'admin') {
        setCurrentUser({ type: 'admin', id: 0, name: 'Администратор' });
      } else {
        const playerNumber = parseInt(login.replace('Player', ''));
        if (!isNaN(playerNumber) && login === `Player${playerNumber}` && password === `Player${playerNumber}`) {
          setCurrentUser({
            type: 'player',
            id: playerNumber,
            name: `Игрок ${playerNumber}`
          });
        } else {
          setCurrentUser({ type: 'viewer', id: -1, name: 'Зритель' });
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setCurrentUser(null);
  };

  // Cleanup function for timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex relative h-screen w-full bg-gray-100">
      {/* Индикатор состояния синхронизации */}
      <div className="absolute bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg">
          <div 
            className={`w-3 h-3 rounded-full ${
              syncStatus === 'synchronized' ? 'bg-green-500' :
              syncStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              syncStatus === 'connecting' ? 'bg-blue-500 animate-pulse' :
              syncStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
              syncStatus === 'fallback' ? 'bg-purple-500' :
              syncStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {syncStatus === 'synchronized' ? 'Синхронизировано' :
             syncStatus === 'saving' ? 'Сохранение...' :
             syncStatus === 'connecting' ? 'Подключение...' :
             syncStatus === 'reconnecting' ? 'Переподключение...' :
             syncStatus === 'fallback' ? 'HTTP режим' :
             syncStatus === 'error' ? 'Ошибка синхронизации' :
             'Не подключен'}
          </span>
          {(syncStatus === 'error' || syncStatus === 'fallback') && (
            <button 
              onClick={reconnect}
              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
            >
              {syncStatus === 'fallback' ? 'Восстановить WS' : 'Повторить'}
            </button>
          )}
        </div>
      </div>

      {/* Кнопка авторизации */}
      <div className="absolute top-4 right-20 z-50">
        {currentUser ? (
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