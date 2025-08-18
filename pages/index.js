import { useState, useEffect, useRef } from 'react';
import { Button } from '@mui/material';
import Sidebar from '../components/Sidebar';
import PlayerIcons from '../components/PlayerIcons';
import AuthModal from '../components/AuthModal';

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
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Инициализация компонента
  useEffect(() => {
    setIsMounted(true);

    const loadData = () => {
      if (typeof localStorage === 'undefined') {
        createDefaultPlayers();
        return;
      }
      
      try {
        const savedPlayers = localStorage.getItem('players');
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedPlayers) {
          try {
            const parsedPlayers = JSON.parse(savedPlayers);
            const normalizedPlayers = parsedPlayers.map(player => ({
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
          } catch (e) {
            console.error("Failed to parse players data", e);
            createDefaultPlayers();
          }
        } else {
          createDefaultPlayers();
        }
        
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (e) {
            console.error("Failed to parse user data", e);
          }
        }
      } catch (error) {
        console.warn('Failed to access localStorage:', error);
        createDefaultPlayers();
      }
    };

    const createDefaultPlayers = () => {
      const defaultPlayers = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Игрок ${i + 1}`,
        image: '',
        socialLinks: { twitch: '', telegram: '', discord: '' },
        stats: { wins: 0, rerolls: 0, drops: 0, position: i + 1 },
        games: []
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

  // Сохранение данных
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('players', JSON.stringify(players));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }, [players, currentUser, isMounted]);

  // Обработчики авторизации
  const handleLogin = (login, password) => {
    if (login === 'admin' && password === 'admin') {
      setCurrentUser({ type: 'admin', id: 0, name: 'Администратор' });
      return;
    }

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
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!isMounted) return null;

  return (
    <div className="flex relative h-screen w-full bg-gray-100">
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