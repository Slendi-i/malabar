import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
  // 🎯 КОНСТАНТЫ ДЛЯ ГРАНИЦ
  const SIDEBAR_WIDTH = 420; // Ширина сайдбара из Sidebar.js
  const ICON_SIZE = 64; // Размер фишки
  const PADDING = 10; // Отступ от границ
  
  const containerRef = useRef(null);
  const playerRefs = useRef([]); // Ссылки на DOM элементы фишек
  const positions = useRef({}); // Позиции храним в ref по player.id
  const dragState = useRef({
    isDragging: false,
    draggedIndex: null,
    dragOffset: { x: 0, y: 0 },
    initialPosition: { x: 0, y: 0 }
  });

  // Функция для установки позиции фишки напрямую в DOM
  const setPlayerPosition = (playerId, x, y) => {
    const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
    if (playerElement) {
      playerElement.style.left = `${x}px`;
      playerElement.style.top = `${y}px`;
      positions.current[playerId] = { x, y };
      // console.log(`🎯 DOM: Установлена позиция для игрока ${playerId}: (${x}, ${y})`);
    }
  };

  // Получить текущую позицию фишки
  const getPlayerPosition = (playerId) => {
    return positions.current[playerId] || { x: 0, y: 0 };
  };
  
  // 🚨 РАДИКАЛЬНО: Прямая загрузка координат из API минуя React state
  const loadPlayerCoordinatesFromAPI = async () => {
    try {
      const response = await apiService.getPlayers();
      if (response && response.players && Array.isArray(response.players)) {
        console.log('🌐 API: Загружаем координаты напрямую из БД');
        response.players.forEach(player => {
          if (player.x !== undefined && player.y !== undefined && player.x !== null && player.y !== null) {
            // console.log(`📍 API: Координаты игрока ${player.name}: (${player.x}, ${player.y})`);
            setPlayerPosition(player.id, player.x, player.y);
          }
        });
      }
    } catch (error) {
      console.error('❌ API: Ошибка загрузки координат:', error);
    }
  };

  // 🚨 РАДИКАЛЬНО НОВАЯ ИНИЦИАЛИЗАЦИЯ: Только DOM + API, никакого React state для координат
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      console.log('🚀 РАДИКАЛЬНО НОВЫЙ ПОДХОД: Инициализация позиций только через DOM и API');
      
      // Небольшая задержка чтобы DOM элементы успели создаться
      setTimeout(() => {
        // Сначала пробуем загрузить из API
        loadPlayerCoordinatesFromAPI().then(() => {
          // Для игроков без координат в БД устанавливаем сетку
          safePlayers.forEach((player, index) => {
            const currentPos = getPlayerPosition(player.id);
            if (currentPos.x === 0 && currentPos.y === 0) {
              // 🎯 НАЧАЛЬНАЯ СЕТКА С УЧЕТОМ ГРАНИЦ
              const spacing = 150;
              const columns = 4;
              const startX = 470; // Начинаем после сайдбара (420 + 50)
              const startY = 100;
              
              const col = index % columns;
              const row = Math.floor(index / columns);
              
              const x = startX + col * spacing;
              const y = startY + row * spacing;
              
              // console.log(`🆕 DOM: Игрок ${player.name} - новая позиция в сетке: (${x}, ${y})`);
              setPlayerPosition(player.id, x, y);
            }
          });
        });
      }, 50);
    }
  }, [safePlayers.length]); // Зависимость только от количества игроков, не от их данных
  
  // 🚨 РАДИКАЛЬНО: Прямая синхронизация координат между клиентами через polling
  useEffect(() => {
    const interval = setInterval(() => {
      // Загружаем обновления координат каждые 3 секунды для синхронизации
      if (!dragState.current.isDragging) {
        console.log('🔄 POLLING: Синхронизация координат с API');
        loadPlayerCoordinatesFromAPI();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // 🎯 АДАПТИВНОСТЬ: Пересчет позиций при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      const containerLeftInDocument = containerRect.left + scrollLeft;
      const containerTopInDocument = containerRect.top + scrollTop;
      const containerRightInDocument = containerRect.right + scrollLeft;
      const containerBottomInDocument = containerRect.bottom + scrollTop;
      
      const minX = containerLeftInDocument + PADDING;
      const maxX = containerRightInDocument - ICON_SIZE - PADDING;
      const minY = containerTopInDocument + PADDING;
      const maxY = containerBottomInDocument - ICON_SIZE - PADDING;
      
      // Пересчитываем позиции всех фишек, чтобы они остались в новых boundaries
      safePlayers.forEach(player => {
        const currentPos = getPlayerPosition(player.id);
        if (currentPos.x !== 0 || currentPos.y !== 0) {
          const newX = Math.max(minX, Math.min(maxX, currentPos.x));
          const newY = Math.max(minY, Math.min(maxY, currentPos.y));
          
          if (newX !== currentPos.x || newY !== currentPos.y) {
            // console.log(`📐 RESIZE: Корректировка позиции ${player.name}: (${currentPos.x}, ${currentPos.y}) -> (${newX}, ${newY})`);
            setPlayerPosition(player.id, newX, newY);
          }
        }
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [safePlayers]);

  const canDrag = (playerId) => {
    if (!currentUser || !playerId) return false;
    
    // Администратор может перетаскивать все фишки
    if (currentUser.type === 'admin') return true;
    
    // Игрок может перетаскивать только свою фишку
    if (currentUser.type === 'player') {
      return String(currentUser.id) === String(playerId);
    }
    
    // Зрители не могут перетаскивать фишки
    return false;
  };

  const handleMouseMove = (e) => {
    const { isDragging, draggedIndex, dragOffset } = dragState.current;
    
    if (!isDragging || draggedIndex === null) return;
    
    e.preventDefault();
    
    // 🎯 ИСПРАВЛЕННЫЕ ГРАНИЦЫ: Относительно игрового контейнера
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Конвертируем границы контейнера в координаты документа
    const containerLeftInDocument = containerRect.left + scrollLeft;
    const containerTopInDocument = containerRect.top + scrollTop;
    const containerRightInDocument = containerRect.right + scrollLeft;
    const containerBottomInDocument = containerRect.bottom + scrollTop;
    
    // Границы относительно контейнера
    const minX = containerLeftInDocument + PADDING; // Слева - начало контейнера
    const maxX = containerRightInDocument - ICON_SIZE - PADDING; // Справа - конец контейнера
    const minY = containerTopInDocument + PADDING; // Сверху - начало контейнера
    const maxY = containerBottomInDocument - ICON_SIZE - PADDING; // Снизу - конец контейнера
    
    // Применяем границы
    const newX = Math.max(minX, Math.min(maxX, e.pageX - dragOffset.x));
    const newY = Math.max(minY, Math.min(maxY, e.pageY - dragOffset.y));
    
    console.log(`🎯 ИСПРАВЛЕННЫЕ ГРАНИЦЫ: pageX=${e.pageX}, pageY=${e.pageY}, newX=${newX}, newY=${newY}, границы: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
    
    // Напрямую обновляем позицию в DOM
    const player = safePlayers[draggedIndex];
    if (player) {
      setPlayerPosition(player.id, newX, newY);
    }
  };

  const handleMouseUp = (e) => {
    const { isDragging, draggedIndex } = dragState.current;
    
    if (!isDragging || draggedIndex === null) return;
    
    const currentPlayer = safePlayers[draggedIndex];
    if (!currentPlayer) return;
    
    // Получаем текущую позицию из ref
    const currentPos = getPlayerPosition(currentPlayer.id);
    
    // 🎯 ИСПРАВЛЕННЫЕ ГРАНИЦЫ: Финальная проверка позиции
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Конвертируем границы контейнера в координаты документа
    const containerLeftInDocument = containerRect.left + scrollLeft;
    const containerTopInDocument = containerRect.top + scrollTop;
    const containerRightInDocument = containerRect.right + scrollLeft;
    const containerBottomInDocument = containerRect.bottom + scrollTop;
    
    // Границы относительно контейнера
    const minX = containerLeftInDocument + PADDING;
    const maxX = containerRightInDocument - ICON_SIZE - PADDING;
    const minY = containerTopInDocument + PADDING;
    const maxY = containerBottomInDocument - ICON_SIZE - PADDING;
    
    // Применяем границы к финальной позиции
    let finalX = Math.max(minX, Math.min(maxX, currentPos.x));
    let finalY = Math.max(minY, Math.min(maxY, currentPos.y));
    
    console.log(`🚀 ФИНАЛЬНОЕ ПОЗИЦИОНИРОВАНИЕ: (${finalX}, ${finalY}), границы: X(${minX}-${maxX}), Y(${minY}-${maxY})`);
    
    // Устанавливаем финальную позицию в DOM
    setPlayerPosition(currentPlayer.id, finalX, finalY);
    console.log(`✅ DOM: ФИНАЛЬНАЯ позиция игрока ${currentPlayer.name}: (${finalX}, ${finalY})`);
    
    // Сохраняем пиксельные координаты в базе данных
    console.log(`💾 DOM: Сохранение в БД: ${currentPlayer.name} -> (${finalX}, ${finalY})`);
    
    apiService.updatePlayerCoordinates(currentPlayer.id, finalX, finalY)
      .then(() => {
        console.log(`✅ DOM: Сохранено в БД: ${currentPlayer.name}`);
      })
      .catch(error => {
        console.error('❌ DOM: Ошибка сохранения позиции игрока:', error);
      });
    
    // Clean up drag state
    dragState.current = {
      isDragging: false,
      draggedIndex: null,
      dragOffset: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 }
    };
    
    // 🚨 РАДИКАЛЬНО: Убрали уведомления родительского компонента - координаты полностью изолированы
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e, index) => {
    const player = safePlayers[index];
    const canDragThis = canDrag(player?.id);
    
    if (!canDragThis || dragState.current.isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 🚨 РАДИКАЛЬНО УПРОЩАЕМ: Используем текущую позицию элемента напрямую из DOM
    const currentPosition = getPlayerPosition(player.id);
    
    // Вычисляем offset относительно текущей позиции элемента в DOM
    const offsetX = e.pageX - currentPosition.x;
    const offsetY = e.pageY - currentPosition.y;
    
    // console.log(`🚀 НАЧАЛО БЕЗ ГРАНИЦ: pageX=${e.pageX}, pageY=${e.pageY}, currentPos=(${currentPosition.x}, ${currentPosition.y}), offset=(${offsetX}, ${offsetY})`);
    
    // Set drag state
    dragState.current = {
      isDragging: true,
      draggedIndex: index,
      dragOffset: { x: offsetX, y: offsetY },
      initialPosition: getPlayerPosition(player.id)
    };
    
    // 🚨 РАДИКАЛЬНО: Убрали уведомления родительского компонента - координаты полностью изолированы
    
    console.log(`🖱️ DOM: Начало перетаскивания игрока ${player.name}`);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      style={{
        minHeight: '100vh',
        height: 'auto', // Позволяем контейнеру расширяться
        backgroundColor: 'transparent', // убираем белый фон
        paddingBottom: '100px',
        boxSizing: 'border-box'
      }}
    >
      {safePlayers.map((player, index) => {
        // Ensure player has required properties
        if (!player || !player.id || !player.name) {
          return null;
        }
        
        const isDragging = dragState.current.draggedIndex === index && dragState.current.isDragging;
        const canDragPlayer = canDrag(player.id);
        
        
        return (
        <Tooltip key={player.id} title={player.name} arrow>
          <div
            data-player-id={player.id} // Важно! Для поиска элемента в DOM
            onMouseDown={canDragPlayer ? (e) => handleMouseDown(e, index) : undefined}
            style={{
              position: 'absolute',
              left: '0px', // Начальная позиция, будет установлена через setPlayerPosition
              top: '0px',
              cursor: canDragPlayer ? (isDragging ? 'grabbing' : 'grab') : 'default',
              zIndex: isDragging ? 9999 : 100, // Еще выше для гарантии поверх всего
              transition: isDragging ? 'none' : 'all 0.3s ease',
              transform: isDragging ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
              userSelect: 'none',
              pointerEvents: 'auto',
              filter: isDragging ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
              canDragPlayer 
                ? 'bg-blue-500 hover:bg-blue-600 shadow-lg border-2 border-blue-300' 
                : 'bg-gray-500 hover:bg-gray-600 opacity-75'
            }`}
          >
            {player.avatar && typeof player.avatar === 'string' && player.avatar.trim() !== '' ? (
              <>
                <img 
                  src={player.avatar} 
                  alt={player.name} 
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <span className="text-white text-xl hidden">👤</span>
              </>
            ) : (
              <span className="text-white text-xl">👤</span>
            )}
          </div>
        </Tooltip>
        );
      })}
    </div>
  );
}