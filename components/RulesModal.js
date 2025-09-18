import { Modal, Box, Typography, Button } from '@mui/material';

export default function RulesModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', md: '80%' },
          maxWidth: '900px',
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: '10px',
          overflowY: 'auto',
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

        {/* Основной контент */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Пункт 1 - Скачивание пакета */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #1A992E',
            borderRadius: '8px',
            bgcolor: 'rgba(26, 153, 46, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#1A992E'
            }}>
              1. Скачивание пакета игр
            </Typography>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#151515'
            }}>
              Необходимо скачать пак со всеми играми –{' '}
              <a 
                href="https://utorrentgames.ru/engine/download.php?id=328568" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#1A992E', 
                  textDecoration: 'underline',
                  fontWeight: 700
                }}
              >
                ТУТ
              </a>
            </Typography>
          </Box>

          {/* Пункт 2 - Стартовая позиция */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #1F19C3',
            borderRadius: '8px',
            bgcolor: 'rgba(31, 25, 195, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#1F19C3'
            }}>
              2. Стартовая позиция
            </Typography>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#151515'
            }}>
              Все игроки стартуют с нулевой позиции
            </Typography>
          </Box>

          {/* Пункт 3 - Механика хода */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #C32519',
            borderRadius: '8px',
            bgcolor: 'rgba(195, 37, 25, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#C32519'
            }}>
              3. Механика хода
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ 
                fontFamily: 'Raleway, sans-serif',
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#151515'
              }}>
                Ход производится следующим образом:
              </Typography>
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <Typography sx={{ 
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#151515'
                  }}>
                    Бросаем кубики
                  </Typography>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Typography sx={{ 
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#151515'
                  }}>
                    Передвигаем фишку на то количество, сколько выпало в кубиках
                  </Typography>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Typography sx={{ 
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#151515'
                  }}>
                    Определяем пулл игр, который необходимо роллить
                  </Typography>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Typography sx={{ 
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: '#151515'
                  }}>
                    Проходим игру
                  </Typography>
                </li>
              </Box>
            </Box>
          </Box>

          {/* Пуллы игр */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #666666',
            borderRadius: '8px',
            bgcolor: 'rgba(102, 102, 102, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#666666'
            }}>
              Пуллы игр по цветам:
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2
            }}>
              {[
                { color: '#1A992E', name: 'Бегалки', bg: 'rgba(26, 153, 46, 0.1)' },
                { color: '#1F19C3', name: 'Бизнес', bg: 'rgba(31, 25, 195, 0.1)' },
                { color: '#FFD700', name: 'Головоломки', bg: 'rgba(255, 215, 0, 0.1)' },
                { color: '#8B4513', name: 'Поиск предметов', bg: 'rgba(139, 69, 19, 0.1)' },
                { color: '#C32519', name: 'Стрелялки', bg: 'rgba(195, 37, 25, 0.1)' },
                { color: '#87CEEB', name: 'Шарики', bg: 'rgba(135, 206, 235, 0.1)' },
                { color: '#FFFFFF', name: 'Белые и Стрелки', bg: 'rgba(255, 255, 255, 0.3)', textColor: '#151515' }
              ].map((pool, index) => (
                <Box key={index} sx={{
                  p: 2,
                  border: `2px solid ${pool.color}`,
                  borderRadius: '6px',
                  bgcolor: pool.bg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    bgcolor: pool.color,
                    borderRadius: '4px',
                    flexShrink: 0
                  }} />
                  <Typography sx={{
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: pool.textColor || pool.color
                  }}>
                    {pool.name}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontSize: '14px',
              mt: 2,
              fontStyle: 'italic',
              color: '#666666'
            }}>
              Белые и Стрелки - Общий пулл игр
            </Typography>
          </Box>

          {/* Пункт 4 - Обработка проблем */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #FF8C00',
            borderRadius: '8px',
            bgcolor: 'rgba(255, 140, 0, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#FF8C00'
            }}>
              4. Обработка проблем с играми
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              <li style={{ marginBottom: '12px' }}>
                <Typography sx={{ 
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  color: '#151515'
                }}>
                  <strong>Если игра не запускается/постоянные краши/не проходима:</strong><br />
                  Собирается консилиум из онлайн участников и решается, можно ли решить проблему. 
                  В случае если проблему решить не удается, игрок ставит статус игры «Реролл» 
                  и перевыбирает игру из того же пулла, где стоял
                </Typography>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <Typography sx={{ 
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  color: '#151515'
                }}>
                  <strong>Если игрок не терпит игру:</strong><br />
                  Ее можно дропнуть, отодвинув свою фишку на 12 клеток назад. 
                  Если у игрока нет 12 клеток позади него, дропнуть игру НЕЛЬЗЯ. 
                  Чтобы дропнуть игру, в профиле игрока проставляется статус игры «Дроп» 
                  и игрок перемещает свою фишку на 12 клеток назад.
                </Typography>
              </li>
              <li>
                <Typography sx={{ 
                  fontFamily: 'Raleway, sans-serif',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  color: '#151515'
                }}>
                  <strong>Важно:</strong> На маршрутах без цвета, дропнуть игру НЕЛЬЗЯ
                </Typography>
              </li>
            </Box>
          </Box>

          {/* Пункт 5 - Завершение игры */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #1A992E',
            borderRadius: '8px',
            bgcolor: 'rgba(26, 153, 46, 0.05)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#1A992E'
            }}>
              5. Завершение игры
            </Typography>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#151515'
            }}>
              После прохождения игры, игрок ставит статус игры «Пройдено», 
              по желанию может отписать комментарий к игре, которую прошел. 
              Далее повторяется пункт 3.
            </Typography>
          </Box>

          {/* Пункт 6 - Победа */}
          <Box sx={{ 
            p: 3,
            border: '2px solid #FFD700',
            borderRadius: '8px',
            bgcolor: 'rgba(255, 215, 0, 0.1)'
          }}>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              mb: 2,
              color: '#B8860B'
            }}>
              6. Условие победы
            </Typography>
            <Typography sx={{ 
              fontFamily: 'Raleway, sans-serif',
              fontSize: '18px',
              lineHeight: 1.6,
              color: '#151515',
              fontWeight: 600
            }}>
              Побеждает тот, кто быстрее коснется финиша на 151 ячейке
            </Typography>
          </Box>
        </Box>

        {/* Кнопка закрытия */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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
            Понятно
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
