import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

export default function RulesModal({ open, onClose }) {
  console.log('RulesModal render, open:', open);
  console.log('RulesModal: onClose function type:', typeof onClose);
  
  React.useEffect(() => {
    console.log('RulesModal: useEffect triggered, open changed to:', open);
  }, [open]);
  
  return (
    <Modal 
      open={open} 
      onClose={onClose}
      disableEscapeKeyDown={false}
    >
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 400,
          bgcolor: 'white',
          boxShadow: 24,
          p: 4,
          borderRadius: '10px',
          fontFamily: 'Raleway, sans-serif'
        }}
      >
        {/* Заголовок */}
        <Typography variant="h4" sx={{ 
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 800,
          mb: 4,
          textAlign: 'center',
          color: '#151515'
        }}>
          ПРАВИЛА
        </Typography>

        {/* Правила игры */}
        <Box sx={{ 
          fontFamily: 'Raleway, sans-serif',
          fontSize: '14px',
          color: '#151515',
          mb: 4,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Как играть:
          </Typography>
          <Typography sx={{ mb: 1 }}>
            1. Нажмите "Кинуть кубик" для броска
          </Typography>
          <Typography sx={{ mb: 1 }}>
            2. Выберите игру в "Ролл игры"
          </Typography>
          <Typography sx={{ mb: 1 }}>
            3. Следите за статистикой других игроков
          </Typography>
          <Typography sx={{ mb: 1 }}>
            4. П - пройденные игры
          </Typography>
          <Typography sx={{ mb: 1 }}>
            5. Р - рероллы (повторы)
          </Typography>
          <Typography sx={{ mb: 1 }}>
            6. Д - дропы (пропуски)
          </Typography>
        </Box>

        {/* Кнопка закрытия */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: '#151515',
              color: '#FFFFFF',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              '&:hover': {
                bgcolor: '#333333'
              },
              padding: '14px 32px',
              borderRadius: '6px',
              textTransform: 'none'
            }}
          >
            Закрыть
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
