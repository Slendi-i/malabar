import { useState, useEffect, useRef } from 'react';
import { Modal, Box, Typography, Button, Switch, FormControlLabel } from '@mui/material';
import { 
  RUNNING_GAMES, 
  BUSINESS_GAMES, 
  PUZZLE_GAMES, 
  HIDDEN_OBJECT_GAMES,
  SHOOTER_GAMES,
  BALL_GAMES,
  ALL_GAMES
} from './gameConstants';

const GameRollModal = ({ open, onClose, currentUser, onGameSelect, playerProfile }) => {
  const [isTestRoll, setIsTestRoll] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [visibleGames, setVisibleGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [gamesPool, setGamesPool] = useState([]);
  const [canRollAgain, setCanRollAgain] = useState(true);
  
  const rollData = useRef({
    interval: null,
    timeout: null,
    speed: 50,
    elapsedTime: 0,
    currentIndex: 0,
    targetGame: null,
    totalDuration: 0
  });

  const getModalTitle = () => {
    if (!currentUser) return 'Гостевой ролл';
    if (currentUser.type === 'admin') return 'Ролл Администратора';
    return `Ролл игр игрока ${playerProfile?.name || currentUser.name}`;
  };

  const getGamesForPool = (pool) => {
    switch(pool) {
      case 'Бегалки': return RUNNING_GAMES;
      case 'Бизнес': return BUSINESS_GAMES;
      case 'Головоломки': return PUZZLE_GAMES;
      case 'Поиск предметов': return HIDDEN_OBJECT_GAMES;
      case 'Стрелялки': return SHOOTER_GAMES;
      case 'Шарики': return BALL_GAMES;
      case 'Общий': return ALL_GAMES;
      default: return [];
    }
  };

  const updateVisibleGames = (index) => {
    const visible = [];
    for (let i = 0; i < 7; i++) {
      const gameIndex = (index + i) % gamesPool.length;
      visible.push(gamesPool[gameIndex]);
    }
    setVisibleGames(visible);
    return visible[3];
  };

  const handlePoolSelect = (pool) => {
    setSelectedPool(pool);
    const poolGames = getGamesForPool(pool);
    setGamesPool(poolGames);
    const randomIndex = Math.floor(Math.random() * poolGames.length);
    rollData.current.currentIndex = randomIndex;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const centerGame = updateVisibleGames(randomIndex);
    setSelectedGame(null);
  };

  const canSelectGame = () => {
    if (!currentUser || currentUser.type !== 'player' || isTestRoll) {
      setCanRollAgain(true);
      return true;
    }

    const games = playerProfile?.games || [];
    
    // ИСПРАВЛЕННАЯ ЛОГИКА: КОГДА МОЖНО РОЛЛИТЬ ИГРУ
    
    // СЛУЧАЙ 1: Пустая таблица игр (стоит на нулевой клетке) - НЕЛЬЗЯ
    if (games.length === 0) {
      setErrorMessage('🎲 Сначала кинь кубик, потом выбирай игру! Дебил.');
      setCanRollAgain(false);
      return false;
    }
    
    const lastGame = games[games.length - 1];
    
    // СЛУЧАЙ 2: Последняя игра "Реролл" - МОЖНО (кубик известен)
    if (lastGame && lastGame.status === 'Реролл') {
      setErrorMessage('');
      setCanRollAgain(true);
      return true;
    }
    
    // СЛУЧАЙ 3: Последняя игра "Дроп" - МОЖНО (кубик = -12)
    if (lastGame && lastGame.status === 'Дроп') {
      setErrorMessage('');
      setCanRollAgain(true);
      return true;
    }
    
    // СЛУЧАЙ 4: Есть игра "В процессе" с кубиком, но без названия - МОЖНО (правильная последовательность)
    const hasGameWithDice = games.some(
      game => game.status === 'В процессе' && 
             game.dice > 0 && 
             (!game.name || game.name === '')
    );
    
    if (hasGameWithDice) {
      setErrorMessage('');
      setCanRollAgain(true);
      return true;
    }
    
    // ВСЕ ОСТАЛЬНЫЕ СЛУЧАИ: НЕЛЬЗЯ
    // - Последняя игра "Пройдено" 
    // - Последняя игра "В процессе" (без кубика или с названием)
    setErrorMessage('🎲 Сначала кинь кубик, потом выбирай игру! Дебил.');
    setCanRollAgain(false);
    return false;
  };

  const startRoll = () => {
    if (!selectedPool) {
      setErrorMessage('Выберите пул игр');
      return;
    }

    if (currentUser?.type === 'player' && !isTestRoll && !canSelectGame()) {
      setErrorMessage('Завершите текущие игры или бросьте кубик');
      return;
    }

    setIsRolling(true);
    setSelectedGame(null);
    setErrorMessage('');
    rollData.current.speed = 50;
    rollData.current.elapsedTime = 0;
    
    const targetIndex = Math.floor(Math.random() * gamesPool.length);
    rollData.current.targetGame = gamesPool[targetIndex];
    
    // Случайная длительность от 3 до 10 секунд
    const minDuration = 3000;
    const maxDuration = 10000;
    rollData.current.totalDuration = Math.random() * (maxDuration - minDuration) + minDuration;
    
    const animate = () => {
      rollData.current.elapsedTime += rollData.current.speed;
      rollData.current.currentIndex = (rollData.current.currentIndex + 1) % gamesPool.length;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const centerGame = updateVisibleGames(rollData.current.currentIndex);
      
      // Увеличиваем скорость в начале
      if (rollData.current.elapsedTime > 1000) {
        rollData.current.speed = Math.min(rollData.current.speed + 3, 150);
      }
      
      // Замедляемся при приближении к концу
      const progress = rollData.current.elapsedTime / rollData.current.totalDuration;
      if (progress > 0.8) {
        rollData.current.speed = Math.max(rollData.current.speed - 5, 80);
      }

      if (rollData.current.elapsedTime < rollData.current.totalDuration) {
        rollData.current.interval = setTimeout(animate, rollData.current.speed);
      } else {
        finishRoll();
      }
    };

    const finishRoll = () => {
      clearTimeout(rollData.current.interval);
      setIsRolling(false);
      
      // Вычисляем финальную позицию так, чтобы целевая игра была в центре
      const targetIndex = gamesPool.indexOf(rollData.current.targetGame);
      // Позиционируем так, чтобы целевая игра была в центре (индекс 3 из 7 видимых)
      rollData.current.currentIndex = (targetIndex - 3 + gamesPool.length) % gamesPool.length;
      const centerGame = updateVisibleGames(rollData.current.currentIndex);
      
      setSelectedGame(centerGame);
      
      if (currentUser?.type === 'player' && !isTestRoll) {
        onGameSelect(centerGame);
        
        // ВАЖНО: Проверяем условия после выбора игры для предотвращения повторных роллов
        // Используем setTimeout чтобы дать время обновиться профилю игрока
        setTimeout(() => {
          canSelectGame();
        }, 100);
      }
    };

    animate();
  };

  // Проверяем возможность выбора игры при открытии модала
  useEffect(() => {
    if (open) {
      canSelectGame(); // Это обновит errorMessage и canRollAgain если нужно
    } else {
      // Сбрасываем состояния при закрытии модала
      setErrorMessage('');
      setCanRollAgain(true);
      setSelectedGame(null);
    }
  }, [open, playerProfile]);

  // Проверяем условия при изменении режима тестового ролла
  useEffect(() => {
    if (open) {
      canSelectGame();
    }
  }, [isTestRoll]);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
      clearTimeout(rollData.current.interval);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
      clearTimeout(rollData.current.timeout);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
    };
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, []);

  const getGameStyle = (index) => {
    const baseSize = 16;
    const sizeDiff = Math.abs(3 - index) * 2;
    const fontSize = baseSize - sizeDiff;
    const opacity = 1 - (Math.abs(3 - index) * 0.2);
    
    return {
      fontSize: `${fontSize}px`,
      opacity,
      fontWeight: index === 3 ? 'bold' : 'normal',
      color: index === 3 ? '#151515' : 'inherit',
      transition: 'all 0.1s ease',
      textAlign: 'center',
      padding: '8px 0',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Raleway, sans-serif'
    };
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 850,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: '8px',
        textAlign: 'center',
        fontFamily: 'Raleway, sans-serif'
      }}>
        <Typography variant="h5" sx={{ 
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          mb: 3,
          color: '#151515'
        }}>
          {getModalTitle()}
        </Typography>
        
        {errorMessage && (
          <Typography sx={{ 
            color: '#C32519',
            mb: 2,
            fontFamily: 'Raleway, sans-serif'
          }}>
            {errorMessage}
          </Typography>
        )}
        
        {selectedGame && (
          <Typography variant="h6" sx={{ 
            mb: 2,
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 700,
            color: '#151515'
          }}>
            Выпала игра: {selectedGame}
          </Typography>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          margin: '20px 0',
          flexWrap: 'wrap'
        }}>
          {['Бегалки', 'Бизнес', 'Головоломки', 'Поиск предметов', 'Стрелялки', 'Шарики', 'Общий'].map(pool => {
            // Цвета категорий из правил
            const getCategoryColors = (category) => {
              switch(category) {
                case 'Бегалки': return { bg: '#1e3955', text: '#FFFFFF' };
                case 'Бизнес': return { bg: '#873127', text: '#FFFFFF' };
                case 'Головоломки': return { bg: '#32675b', text: '#FFFFFF' };
                case 'Поиск предметов': return { bg: '#c49b57', text: '#FFFFFF' };
                case 'Стрелялки': return { bg: '#681e68', text: '#FFFFFF' };
                case 'Шарики': return { bg: '#7fd1d4', text: '#151515' };
                case 'Общий': return { bg: '#151515', text: '#FFFFFF' };
                default: return { bg: '#151515', text: '#FFFFFF' };
              }
            };

            const colors = getCategoryColors(pool);
            const isSelected = selectedPool === pool;

            return (
              <Button
                key={pool}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => handlePoolSelect(pool)}
                disabled={isRolling}
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  minWidth: '110px',
                  color: isSelected ? colors.text : colors.bg,
                  bgcolor: isSelected ? colors.bg : 'transparent',
                  borderColor: colors.bg,
                  '&:hover': {
                    bgcolor: isSelected ? colors.bg : `${colors.bg}20`,
                    borderColor: colors.bg
                  },
                  borderRadius: '6px',
                  textTransform: 'none',
                  padding: '8px 16px'
                }}
              >
                {pool}
              </Button>
            );
          })}
        </div>

        {selectedPool && (
          <Typography variant="subtitle1" sx={{ 
            mb: 2,
            fontFamily: 'Raleway, sans-serif',
            color: '#151515'
          }}>
            Выбран пулл: {selectedPool} ({gamesPool.length} игр)
          </Typography>
        )}

        <div style={{ 
          height: '300px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #EDEDED',
          borderRadius: '8px',
          margin: '20px 0',
          backgroundColor: '#F5F5F5'
        }}>
          {visibleGames.map((game, index) => (
            <div key={`${game}-${index}`} style={getGameStyle(index)}>
              {game}
            </div>
          ))}
        </div>

        {currentUser?.type === 'player' && (
          <FormControlLabel
            control={
              <Switch
                checked={isTestRoll}
                onChange={(e) => setIsTestRoll(e.target.checked)}
                disabled={isRolling}
                color="primary"
              />
            }
            label="Тестовый ролл"
            sx={{ 
              mb: 2,
              fontFamily: 'Raleway, sans-serif'
            }}
          />
        )}

        <Button
          variant="contained"
          onClick={startRoll}
          disabled={isRolling || !selectedPool || !canRollAgain}
          sx={{
            bgcolor: '#151515',
            color: '#FFFFFF',
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            '&:hover': {
              bgcolor: '#333333'
            },
            padding: '10px 20px',
            borderRadius: '6px',
            textTransform: 'none',
            height: 'auto'
          }}
        >
          {isRolling ? 'Выбор игры...' : 'Выбор игры'}
        </Button>
      </Box>
    </Modal>
  );
};

export default GameRollModal;