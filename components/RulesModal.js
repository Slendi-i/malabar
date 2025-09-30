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
          width: 'min(820px, 92vw)',
          height: 'min(760px, 90vh)',
          bgcolor: 'white',
          boxShadow: 24,
          p: 4,
          borderRadius: '10px',
          fontFamily: 'Raleway, sans-serif',
          overflow: 'hidden'
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
          fontSize: '13px',
          color: '#151515',
          lineHeight: 1.45,
          maxHeight: 'calc(100% - 100px)',
          overflowY: 'auto',
          pr: 1
        }}>
          {/* Пункт 1 - Скачивание */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              1. Скачивание игр
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Необходимо скачать пак со всеми играми – 
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
                  bgcolor: '#1e3955', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🏃 Бегалки
                </Box>
                <Box sx={{ 
                  bgcolor: '#873127', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  💼 Бизнес
                </Box>
                <Box sx={{ 
                  bgcolor: '#32675b', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🧩 Головоломки
                </Box>
                <Box sx={{ 
                  bgcolor: '#c49b57', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🔍 Поиск предметов
                </Box>
                <Box sx={{ 
                  bgcolor: '#681e68', 
                  color: 'white', 
                  p: 1, 
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  🔫 Стрелялки
                </Box>
                <Box sx={{ 
                  bgcolor: '#7fd1d4', 
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
            p: 2, 
            mb: 3 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#155724' }}>
              🏆 Победа
            </Typography>
            <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
              Побеждает тот, кто быстрее коснется финиша на 151 ячейке
            </Typography>
          </Box>

          {/* Примечания */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#151515' }}>
              📝 Примечания
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography sx={{ mb: 2 }}>
                • Маршруты со стрелочками не делают мгновенный перенос из точки А в точку В, это альтернативный маршрут, где выбирается общий пулл игр, игры которого дропнуть НЕЛЬЗЯ.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Если в игре есть внутриигровые подсказки, ими пользоваться можно, но если в игре есть функционал пропуска головоломки/уровня подобным пользоваться нельзя.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Игры где есть выбор уровня, проходить нужно строго сначала и до конца, нельзя выбрать последний уровень и считать что игра пройдена, должны быть пройдены все уровни.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Играем, роллим кубики, игры, строго на стримах, любые действия должны быть зафиксированы.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Каждая игра проходится на среднем уровне сложности. Если в игре 2 уровня сложности, или 4, смотрим на слово "СРЕДНИЙ" или "НОРМАЛЬНАЯ" в любом из склонений и выбираем ее.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Каждую игру строго проверяйте на прохождение. Проверить самому все 1000+ игр нет возможности. Ваша задача увидеть что игра проходима, а не является бесконечной или сессионкой по типу "Пасьянса".
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Как и на ретро-ивенте пользоваться интернетом, чтобы помочь себе в прохождении очередной головоломки - ЗАПРЕЩЕНО. Только с помощью чата. Помогать друг другу можно.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                • Перемещаем свою фишку самостоятельно, на сайте синхронизация происходит каждые 10 секунд, если вы взяли свою фишку, начали перетаскивать и ее откинуло на старое место, значит вы попали в момент синхронизации, просто подвиньте фишку снова.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Кнопка закрыть */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          pt: 2 
        }}>
          <Button 
            variant="contained" 
            onClick={onClose}
            sx={{
              bgcolor: '#151515',
              color: '#FFFFFF',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              '&:hover': {
                bgcolor: '#333333'
              },
              padding: '10px 30px',
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
