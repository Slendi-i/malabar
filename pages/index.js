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
    console.log('Received real-time update:', type, data);
    
    // Avoid updating if the change came from this client (to prevent conflicts during drag)
    const timeSinceLastSave = Date.now() - lastSaveRef.current;
    if (timeSinceLastSave < 2000) {
      console.log('Skipping real-time update - recent save from this client');
      return;
    }
    
    if (type === 'single' && playerId && data) {
      setPlayers(prev => prev.map(player => 
        player.id === playerId ? { ...player, ...data } : player
      ));
    } else if (type === 'batch' && Array.isArray(data)) {
      setPlayers(data.map(player => ({
        ...player,
        games: Array.isArray(player.games) ? player.games : [],
        stats: player.stats || {
          wins: 0,
          rerolls: 0,
          drops: 0,
          position: player.position || player.id
        }
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

  // Optimized save function with debouncing
  const debouncedSave = useCallback(async (playersToSave, userToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSyncStatus('saving');
        
        if (playersToSave && playersToSave.length > 0) {
          await apiService.batchUpdatePlayers(playersToSave);
        }
        
        if (userToSave) {
          await apiService.setCurrentUser(userToSave);
        }
        
        lastSaveRef.current = Date.now();
        setSyncStatus('synchronized');
      } catch (error) {
        console.warn('Failed to save data to API:', error);
        setSyncStatus('error');
        
        // Retry after 5 seconds
        setTimeout(() => {
          if (playersToSave && playersToSave.length > 0) {
            debouncedSave(playersToSave, userToSave);
          }
        }, 5000);
      }
    }, 1000); // 1 second debounce
  }, []);

  // Initialize WebSocket connection
  const { isConnected, reconnect } = useRealTimeSync(handlePlayersUpdate, handleUserUpdate);

  // Update sync status based on WebSocket connection
  useEffect(() => {
    if (isConnected) {
      setSyncStatus(prevStatus => prevStatus === 'error' ? 'synchronized' : prevStatus);
    } else {
      setSyncStatus('disconnected');
    }
  }, [isConnected]);

  // Инициализация компонента
  useEffect(() => {
    setIsMounted(true);

    const loadData = async () => {
      try {
        // Load players from API
        const apiPlayers = await apiService.getPlayers();
        if (apiPlayers && Array.isArray(apiPlayers)) {
          const normalizedPlayers = apiPlayers.map(player => ({
            ...player,
            games: Array.isArray(player.games) ? player.games : [],
            stats: player.stats || {
              wins: 0,
              rerolls: 0,
              drops: 0,
              position: player.id
            }
          }));
          setPlayers(normalizedPlayers);
        } else {
          console.warn('No players data from API, using defaults');
          createDefaultPlayers();
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
        console.error('Failed to load data from API:', error);
        createDefaultPlayers();
      }
    };

    const createDefaultPlayers = () => {
      const defaultPlayers = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        avatar: '/avatars/player' + (i + 1) + '.jpg',
        socialLinks: { discord: '', twitter: '', instagram: '' },
        stats: { wins: 0, losses: 0, draws: 0 },
        games: [],
        isOnline: false
      }));
      setPlayers(defaultPlayers);
    };



    if (typeof window !== 'undefined') {
      loadData();
      // Image dimensions are now handled by the img element's onLoad event
    }

    // No cleanup needed for the new approach
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

  // Optimized data saving with debouncing
  useEffect(() => {
    if (isMounted && players.length > 0) {
      debouncedSave(players, currentUser);
    }
  }, [players, currentUser, isMounted, debouncedSave]);

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
      <div className="absolute top-4 left-4 z-50">
        <div className="flex items-center gap-2 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg">
          <div 
            className={`w-3 h-3 rounded-full ${
              syncStatus === 'synchronized' ? 'bg-green-500' :
              syncStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              syncStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {syncStatus === 'synchronized' ? 'Синхронизировано' :
             syncStatus === 'saving' ? 'Сохранение...' :
             syncStatus === 'error' ? 'Ошибка синхронизации' :
             'Не подключен'}
          </span>
          {syncStatus === 'error' && (
            <button 
              onClick={reconnect}
              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
            >
              Повторить
            </button>
          )}
        </div>
      </div>

      {/* Кнопка авторизации */}
      <div className="absolute top-4 right-4 z-50">
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