import { Modal, Box, Typography, Button } from '@mui/material';

export default function RulesModal({ open, onClose }) {
  console.log('RulesModal render, open:', open);
  
  if (!open) {
    console.log('RulesModal: modal is closed, not rendering');
    return null;
  }
  
  console.log('RulesModal: modal is open, rendering');
  return (
    <Modal open={open} onClose={onClose}>
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 300,
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

        {/* Простой тест */}
        <Typography sx={{ 
          fontFamily: 'Raleway, sans-serif',
          fontSize: '16px',
          textAlign: 'center',
          color: '#151515',
          mb: 4
        }}>
          Модальное окно работает!
        </Typography>

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
