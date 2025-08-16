import { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, Switch, FormControlLabel } from '@mui/material';

const DiceModal = ({ open, onClose, currentUser, onRollComplete, playerProfile }) => {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [isTestRoll, setIsTestRoll] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [total, setTotal] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [canRoll, setCanRoll] = useState(true);

  const renderDice = (value) => {
    const dotPositions = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [25, 75], [75, 25], [75, 75]],
      5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
      6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
    };

    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <rect x="10" y="10" width="80" height="80" rx="10" fill="white" stroke="#151515" strokeWidth="2" />
        {dotPositions[value]?.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r="5" fill="#151515" />
        ))}
        <polygon points="10,10 20,20 20,90 10,80" fill="#EDEDED" />
        <polygon points="10,80 20,90 90,90 80,80" fill="#CCCCCC" />
      </svg>
    );
  };

  useEffect(() => {
    if (open && currentUser?.type === 'player') {
      const hasUnfinishedGame = playerProfile?.games?.some(
        game => game.status === 'В процессе' && game.dice > 0
      );
      
      if (hasUnfinishedGame) {
        setErrorMessage('Завершите текущую игру перед новым броском');
        setCanRoll(false);
      } else {
        setCanRoll(true);
        setErrorMessage('');
      }
    }
  }, [open, currentUser, playerProfile]);

  const getModalTitle = () => {
    if (!currentUser) return 'Гостевой ролл';
    if (currentUser.type === 'admin') return 'Ролл Администратора';
    return `Ролл игрока ${playerProfile?.name || currentUser.name}`;
  };

  const rollDice = () => {
    if (currentUser?.type === 'player' && !isTestRoll && !canRoll) {
      setErrorMessage('Вы не можете сделать бросок. Завершите текущую игру.');
      return;
    }

    setIsRolling(true);
    setTotal(null);
    setErrorMessage('');
    
    const rollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval);
      const finalDice1 = Math.floor(Math.random() * 6) + 1;
      const finalDice2 = Math.floor(Math.random() * 6) + 1;
      setDice1(finalDice1);
      setDice2(finalDice2);
      const sum = finalDice1 + finalDice2;
      setTotal(sum);
      setIsRolling(false);

      if (currentUser?.type === 'player' && !isTestRoll) {
        onRollComplete(sum);
      }
    }, 4000);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
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
        
        {total !== null && (
          <Typography variant="h4" sx={{ 
            mb: 2,
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            color: '#151515'
          }}>
            Результат: {total}
          </Typography>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          margin: '20px 0' 
        }}>
          {renderDice(dice1)}
          {renderDice(dice2)}
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
          onClick={rollDice}
          disabled={isRolling || (currentUser?.type === 'player' && !isTestRoll && !canRoll)}
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
          {isRolling ? 'Бросок...' : 'Ролл'}
        </Button>
      </Box>
    </Modal>
  );
};

export default DiceModal;