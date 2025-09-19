import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Box, Typography, TextField, Select, MenuItem, Button } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerProfileModal({ player, open, onClose, setPlayers, players, currentUser }) {
  const [image, setImage] = useState(player.avatar || '');
  const [playerName, setPlayerName] = useState(player.name || '');
  const [socialLinks, setSocialLinks] = useState(player.socialLinks || {
    twitch: '', telegram: '', discord: ''
  });
  const [games, setGames] = useState(player.games || []);
  
  // Refs for debouncing
  const saveTimeoutRef = useRef(null);
  const socialTimeoutRef = useRef(null);

  // Рассчитываем статистику на основе игр
  const calculateStats = () => {
    const stats = {
      wins: 0,
      rerolls: 0,
      drops: 0,
      position: 0
    };

    games.forEach(game => {
      if (game.status === 'Пройдено') stats.wins++;
      else if (game.status === 'Реролл') stats.rerolls++;
      else if (game.status === 'Дроп') stats.drops++;

      if (game.status === 'Пройдено' && game.dice) {
        stats.position += game.dice;
      }
    });

    return stats;
  };

  const stats = calculateStats();

  useEffect(() => {
    if (open) {
      setImage(player.avatar || '');
      setPlayerName(player.name || '');
      setSocialLinks(player.socialLinks || { twitch: '', telegram: '', discord: '' });
      setGames(player.games || []);
    }
    
    // Cleanup timers when modal closes
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (socialTimeoutRef.current) {
        clearTimeout(socialTimeoutRef.current);
      }
    };
  }, [open, player]);

  // Debounced save function
  const debouncedSave = useCallback((updatedData, delay = 1000) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const updatedPlayer = { 
        ...player, 
        ...updatedData,
        // Ensure avatar field is used consistently
        avatar: updatedData.avatar || player.avatar
      };
      
      
      try {
        await apiService.updatePlayerDetailed(player.id, updatedPlayer);
        // Обновляем локальное состояние для немедленного отображения
        setPlayers(prev => prev.map(p => 
          p.id === player.id ? updatedPlayer : p
        ));
      } catch (error) {
        console.error('❌ Ошибка сохранения данных игрока в БД:', error);
        alert('Ошибка сохранения данных. Попробуйте еще раз.');
      }
    }, delay);
  }, [player, setPlayers]);

  // Immediate save for critical data (games, images)
  const updatePlayerData = async (updatedData) => {
    const updatedPlayer = { 
      ...player, 
      ...updatedData,
      avatar: updatedData.avatar || player.avatar
    };
    
    
    try {
      await apiService.updatePlayerDetailed(player.id, updatedPlayer);
      // Обновляем локальное состояние для немедленного отображения
      setPlayers(prev => prev.map(p => 
        p.id === player.id ? updatedPlayer : p
      ));
    } catch (error) {
      console.error('❌ Ошибка сохранения данных игрока в БД:', error);
      alert('Ошибка сохранения данных. Попробуйте еще раз.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = reader.result;
        setImage(newImage);
        updatePlayerData({ avatar: newImage });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setPlayerName(newName);
    // Debounced save for name changes
    debouncedSave({ name: newName });
  };

  const handleSocialChange = (platform, value) => {
    const newSocialLinks = { ...socialLinks, [platform]: value };
    setSocialLinks(newSocialLinks);
    
    // Debounced save for social links
    if (socialTimeoutRef.current) {
      clearTimeout(socialTimeoutRef.current);
    }
    
    socialTimeoutRef.current = setTimeout(() => {
      debouncedSave({ socialLinks: newSocialLinks }, 500);
    }, 500);
  };

  const handleAddGame = () => {
    const newGame = {
      name: '',
      status: 'В процессе',
      comment: '',
      dice: 0
    };
    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    updatePlayerData({ games: updatedGames });
  };

  const handleDeleteGame = (index) => {
    const updatedGames = games.filter((_, i) => i !== index);
    setGames(updatedGames);
    updatePlayerData({ games: updatedGames });
  };

  const handleGameFieldChange = (index, field, value) => {
    const updatedGames = [...games];
    updatedGames[index][field] = value;
    setGames(updatedGames);
    updatePlayerData({ games: updatedGames });
  };

  const handleGameStatusChange = (index, status) => {
    const updatedGames = [...games];
    updatedGames[index].status = status;
    setGames(updatedGames);
    updatePlayerData({ games: updatedGames });
  };

  const renderDiceValue = (value) => {
    if (!value || value <= 0) return '-';
    
    return (
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        bgcolor: 'white',
        border: '2px solid',
        borderColor: 'grey.300',
        borderRadius: '4px',
        mr: 1,
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        {value}
      </Box>
    );
  };

  const isAdmin = currentUser?.type === 'admin';
  const isCurrentPlayer = currentUser?.type === 'player' && currentUser.id === player.id;
  
  const canEditImage = isAdmin;
  const canEditName = isAdmin;
  const canEditSocial = isAdmin || isCurrentPlayer;
  const canEditGames = isAdmin;
  const canEditStatus = isAdmin || isCurrentPlayer;
  const canEditComments = isAdmin || isCurrentPlayer;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: { xs: '90%', md: '80%' },
        maxWidth: '1150px',
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: '10px',
        overflowY: 'auto'
      }}>
        {/* Заголовок профиля */}
        <Typography variant="h4" sx={{ 
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 800,
          mb: 4,
          textAlign: 'center'
        }}>
          Профиль игрока
        </Typography>

        {/* Основной контент */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Блок с изображением */}
          <Box sx={{ 
            width: { xs: '100%', md: '340px' }, 
            height: '340px',
            position: 'relative',
            flexShrink: 0
          }}>
            <img
              src={image || '/default-avatar.png'}
              alt="Аватар"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '4px solid white'
              }}
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
            {canEditImage && (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            )}
          </Box>

          {/* Блок с информацией */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Имя игрока */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ 
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                minWidth: '60px'
              }}>
                Имя:
              </Typography>
              {canEditName ? (
                <TextField
                  value={playerName}
                  onChange={handleNameChange}
                  fullWidth
                  variant="standard"
                />
              ) : (
                <Typography sx={{ fontFamily: 'Raleway, sans-serif' }}>
                  {playerName}
                </Typography>
              )}
            </Box>

            {/* Социальные сети */}
            <Box>
              <Typography sx={{ 
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                mb: 2
              }}>
                Социальные сети:
              </Typography>
              
              {/* Twitch */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: 'transparent', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img
                    src="https://static.vecteezy.com/system/resources/previews/023/986/749/large_2x/twitch-logo-twitch-logo-transparent-twitch-icon-transparent-free-free-png.png"
                    alt="Twitch"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '4px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
                <TextField
                  value={socialLinks.twitch}
                  onChange={(e) => handleSocialChange('twitch', e.target.value)}
                  placeholder="Twitch"
                  disabled={!canEditSocial}
                  fullWidth
                  size="small"
                />
              </Box>

              {/* Telegram */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: 'transparent', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Telegram_Messenger.png/500px-Telegram_Messenger.png"
                    alt="Telegram"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '4px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
                <TextField
                  value={socialLinks.telegram}
                  onChange={(e) => handleSocialChange('telegram', e.target.value)}
                  placeholder="Telegram"
                  disabled={!canEditSocial}
                  fullWidth
                  size="small"
                />
              </Box>

              {/* Discord */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: 'transparent', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img
                    src="https://static.vecteezy.com/system/resources/previews/023/741/066/non_2x/discord-logo-icon-social-media-icon-free-png.png"
                    alt="Discord"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '4px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
                <TextField
                  value={socialLinks.discord}
                  onChange={(e) => handleSocialChange('discord', e.target.value)}
                  placeholder="Discord"
                  disabled={!canEditSocial}
                  fullWidth
                  size="small"
                />
              </Box>
            </Box>

            {/* Статистика */}
            <Box>
              <Typography sx={{ 
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 700,
                mb: 2
              }}>
                Статистика:
              </Typography>
              
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 2
              }}>
                {/* Пройдено */}
                <Box sx={{ 
                  p: 1.5,
                  border: '2px solid #1A992E',
                  borderRadius: '4px',
                  bgcolor: 'rgba(26, 153, 46, 0.1)'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 1,
                    bgcolor: 'rgba(26, 153, 46, 0.2)',
                    p: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    <Typography sx={{ 
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '15px',
                      fontWeight: 500
                    }}>
                      Пройдено
                    </Typography>
                  </Box>
                  <Typography sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.75rem',
                    textAlign: 'center',
                    color: '#1A992E'
                  }}>
                    {stats.wins}
                  </Typography>
                </Box>

                {/* Реролл */}
                <Box sx={{ 
                  p: 1.5,
                  border: '2px solid #1F19C3',
                  borderRadius: '4px',
                  bgcolor: 'rgba(31, 25, 195, 0.1)'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 1,
                    bgcolor: 'rgba(31, 25, 195, 0.2)',
                    p: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    <Typography sx={{ 
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '15px',
                      fontWeight: 500
                    }}>
                      Реролл
                    </Typography>
                  </Box>
                  <Typography sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.75rem',
                    textAlign: 'center',
                    color: '#1F19C3'
                  }}>
                    {stats.rerolls}
                  </Typography>
                </Box>

                {/* Дропнуто */}
                <Box sx={{ 
                  p: 1.5,
                  border: '2px solid #C32519',
                  borderRadius: '4px',
                  bgcolor: 'rgba(195, 37, 25, 0.1)'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 1,
                    bgcolor: 'rgba(195, 37, 25, 0.2)',
                    p: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    <Typography sx={{ 
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '15px',
                      fontWeight: 500
                    }}>
                      Дропнуто
                    </Typography>
                  </Box>
                  <Typography sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.75rem',
                    textAlign: 'center',
                    color: '#C32519'
                  }}>
                    {stats.drops}
                  </Typography>
                </Box>

                {/* Сумма кубиков */}
                <Box sx={{ 
                  p: 1.5,
                  border: '2px solid #666666',
                  borderRadius: '4px',
                  bgcolor: 'rgba(102, 102, 102, 0.1)'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 1,
                    bgcolor: 'rgba(102, 102, 102, 0.2)',
                    p: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    <Typography sx={{ 
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '15px',
                      fontWeight: 500
                    }}>
                      Сумма кубиков
                    </Typography>
                  </Box>
                  <Typography sx={{ 
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.75rem',
                    textAlign: 'center',
                    color: '#666666'
                  }}>
                    {stats.position}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* История прохождения */}
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ 
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 700,
            mb: 2,
          }}>
            История прохождения:
          </Typography>
          
          {canEditGames && (
            <Button 
              variant="contained" 
              onClick={handleAddGame}
              sx={{ mb: 2 }}
            >
              Добавить игру
            </Button>
          )}
          
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontFamily: 'Raleway, sans-serif'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Название игры</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Статус</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Комментарий</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>Кубик</th>
                  {canEditGames && <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Действия</th>}
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>
                      {canEditGames ? (
                        <TextField
                          value={game.name}
                          onChange={(e) => handleGameFieldChange(index, 'name', e.target.value)}
                          fullWidth
                          variant="standard"
                        />
                      ) : (
                        <Typography sx={{ fontFamily: 'Raleway, sans-serif' }}>
                          {game.name}
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Select
                        value={game.status}
                        onChange={(e) => handleGameStatusChange(index, e.target.value)}
                        disabled={!canEditStatus}
                        variant="standard"
                        sx={{ minWidth: '120px' }}
                      >
                        {['В процессе', 'Пройдено', 'Реролл', 'Дроп'].map(option => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </Select>
                    </td>
                    <td style={{ 
                      padding: '12px',
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      verticalAlign: 'top'
                    }}>
                      {canEditComments ? (
                        <TextField
                          value={game.comment}
                          onChange={(e) => handleGameFieldChange(index, 'comment', e.target.value)}
                          fullWidth
                          variant="standard"
                          multiline
                          sx={{
                            '& .MuiInputBase-input': {
                              wordWrap: 'break-word',
                              whiteSpace: 'pre-wrap',
                              overflow: 'visible'
                            },
                            '& .MuiInputBase-root': {
                              overflow: 'visible'
                            }
                          }}
                        />
                      ) : (
                        <Typography sx={{ 
                          fontFamily: 'Raleway, sans-serif',
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {game.comment}
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {canEditGames ? (
                        <TextField
                          type="number"
                          value={game.dice}
                          onChange={(e) => handleGameFieldChange(index, 'dice', parseInt(e.target.value) || 0)}
                          variant="standard"
                          sx={{ width: '80px' }}
                        />
                      ) : (
                        renderDiceValue(game.dice)
                      )}
                    </td>
                    {canEditGames && (
                      <td style={{ padding: '12px' }}>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => handleDeleteGame(index)}
                          size="small"
                        >
                          Удалить
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}