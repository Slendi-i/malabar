import { useState } from 'react';
import { Modal, Box, TextField, Button, Typography } from '@mui/material';

export default function AuthModal({ open, onClose, onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(login, password);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: '8px',
          fontFamily: 'Raleway, sans-serif'
        }}
        component="form"
        onSubmit={handleSubmit}
      >
        <Typography variant="h6" sx={{ 
          mb: 3,
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          textAlign: 'center',
          color: '#151515'
        }}>
          Авторизация
        </Typography>
        <TextField
          label="Логин"
          fullWidth
          margin="normal"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          sx={{
            mb: 2,
            '& .MuiInputLabel-root': {
              fontFamily: 'Raleway, sans-serif'
            },
            '& .MuiInputBase-input': {
              fontFamily: 'Raleway, sans-serif'
            }
          }}
        />
        <TextField
          label="Пароль"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          sx={{
            mb: 3,
            '& .MuiInputLabel-root': {
              fontFamily: 'Raleway, sans-serif'
            },
            '& .MuiInputBase-input': {
              fontFamily: 'Raleway, sans-serif'
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#151515',
              color: '#FFFFFF',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              '&:hover': {
                bgcolor: '#333333'
              },
              padding: '14px 24px',
              borderRadius: '6px',
              textTransform: 'none'
            }}
          >
            Войти
          </Button>
        </div>
        <div style={{ 
          marginTop: '20px',
          fontSize: '14px',
          color: '#666666',
          fontFamily: 'Raleway, sans-serif',
          textAlign: 'center'
        }}>
          <p>Админ: admin/admin</p>
          <p>Игроки: Player1/Player1 ... Player12/Player12</p>
        </div>
      </Box>
    </Modal>
  );
}