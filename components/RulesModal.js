import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

export default function RulesModal({ open, onClose }) {
  return (
    <Modal 
      open={open} 
      onClose={onClose}
    >
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 600,
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
          fontSize: '16px',
          color: '#151515',
          mb: 4,
          lineHeight: 1.6
        }}>
          {/* Пункт 1 - Скачивание */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              1. Скачивание игр
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Необходимо скажать пак со всеми играми – 
              <a 
                href="https://utorrentgames.ru/engine/download.php?id=328568" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#1F19C3', 
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                ТУТ
              </a>
            </Typography>
          </Box>

          {/* Пункт 2 - Старт */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              2. Начало игры
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Все стартуют с нулевой позиции
            </Typography>
          </Box>

          {/* Пункт 3 - Ход */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              3. Механика хода
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography sx={{ mb: 1 }}>• Бросаем кубики</Typography>
              <Typography sx={{ mb: 1 }}>• Передвигаем фишку на то количество, сколько выпало в кубиках</Typography>
              <Typography sx={{ mb: 2 }}>• Определяем пулл игр, который необходимо роллить:</Typography>
              
              {/* Цветные блоки категорий */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                <Box sx={{ 
                  bgcolor: '#1A992E', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🏃 Бегалки
                </Box>
                <Box sx={{ 
                  bgcolor: '#1F19C3', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  💼 Бизнес
                </Box>
                <Box sx={{ 
                  bgcolor: '#FFD700', 
                  color: '#151515', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🧩 Головоломки
                </Box>
                <Box sx={{ 
                  bgcolor: '#8B4513', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🔍 Поиск предметов
                </Box>
                <Box sx={{ 
                  bgcolor: '#C32519', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🔫 Стрелялки
                </Box>
                <Box sx={{ 
                  bgcolor: '#87CEEB', 
                  color: '#151515', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🎯 Шарики
                </Box>
              </Box>
              
              <Typography sx={{ mb: 2, fontStyle: 'italic' }}>
                Белые и Стрелки - Общий пулл игр
              </Typography>
              
              <Typography sx={{ mb: 1 }}>• Проходим игру</Typography>
              
              {/* Реролл */}
              <Box sx={{ 
                bgcolor: '#FFF3CD', 
                border: '1px solid #FFEAA7', 
                borderRadius: '6px', 
                p: 2, 
                mb: 2 
              }}>
                <Typography sx={{ fontWeight: 600, mb: 1, color: '#856404' }}>
                  🔄 Реролл
                </Typography>
                <Typography sx={{ fontSize: '14px' }}>
                  В случае если игра не запускается/постоянные краши/не проходима. Собирается консилиум из онлайн участников и решается, можно ли решить проблему. Если проблему решить не удается, игрок ставит статус игры «Реролл» и перевыбирает игру из того же пулла.
                </Typography>
              </Box>
              
              {/* Дроп */}
              <Box sx={{ 
                bgcolor: '#F8D7DA', 
                border: '1px solid #F5C6CB', 
                borderRadius: '6px', 
                p: 2, 
                mb: 2 
              }}>
                <Typography sx={{ fontWeight: 600, mb: 1, color: '#721C24' }}>
                  ❌ Дроп
                </Typography>
                <Typography sx={{ fontSize: '14px' }}>
                  Если игрок не терпит игру, ее можно дропнуть, отодвинув свою фишку на 12 клеток назад. Если у игрока нет 12 клеток позади него, дропнуть игру НЕЛЬЗЯ. На маршрутах без цвета дропнуть игру НЕЛЬЗЯ.
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Пункт 4 - Завершение */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              4. Завершение игры
            </Typography>
            <Typography sx={{ mb: 2 }}>
              После прохождения игры, игрок ставит статус игры «Пройдено», по желанию может отписать комментарий к игре. Далее повторяется пункт 3.
            </Typography>
          </Box>

          {/* Пункт 5 - Победа */}
          <Box sx={{ 
            bgcolor: '#D4EDDA', 
            border: '1px solid #C3E6CB', 
            borderRadius: '6px', 
            p: 2 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#155724' }}>
              🏆 Победа
            </Typography>
            <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
              Побеждает тот, кто быстрее коснется финиша на 151 ячейке
            </Typography>
          </Box>
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
