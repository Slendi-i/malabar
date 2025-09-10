import { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser, onPlayerPositionUpdate }) {
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
  
  // Debouncing для сохранения координат  
  const saveTimeoutRef = useRef(null);
  const dragTimeoutRef = useRef(null); // Защита от зависших dragState
  const SAVE_DELAY = 500; // Задержка перед сохранением в БД
  const DRAG_TIMEOUT = 10000; // 10 секунд - максимальное время перетаскивания

  // Функция для установки позиции фишки напрямую в DOM
  const setPlayerPosition = (playerId, x, y) => {
    const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
    if (playerElement) {
      console.log(`🎨 DOM: Устанавливаем позицию игрока ${playerId} в (${x}, ${y})`);
      playerElement.style.left = `${x}px`;
      playerElement.style.top = `${y}px`;
      positions.current[playerId] = { x, y };
    } else {
      console.warn(`❌ DOM: Элемент игрока ${playerId} не найден в DOM`);
    }
  };

  // Получить текущую позицию фишки
  const getPlayerPosition = (playerId) => {
    return positions.current[playerId] || { x: 0, y: 0 };
  };
  
  // 🚀 УПРОЩЕННОЕ сохранение с debouncing
  const debouncedSavePosition = useCallback((playerId, x, y) => {
    // Очищаем предыдущий timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Ставим новый timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`💾 Сохранение координат игрока ${playerId}: (${x}, ${y})`);
        
        // Используем проверенный метод через PUT endpoint
        await apiService.updatePlayerCoordinates(playerId, x, y);
        
        console.log(`✅ Координаты игрока ${playerId} сохранены`);
      } catch (error) {
        console.error(`❌ Ошибка сохранения координат игрока ${playerId}:`, error);
      }
    }, SAVE_DELAY);
  }, []);
  
  // Прямая загрузка координат из API минуя React state
  const loadPlayerCoordinatesFromAPI = async () => {
    try {
      const response = await apiService.getPlayers();
      if (response && response.players && Array.isArray(response.players)) {
        response.players.forEach(player => {
          if (player.x !== undefined && player.y !== undefined && player.x !== null && player.y !== null) {
            setPlayerPosition(player.id, player.x, player.y);
          }
        });
      }
    } catch (error) {
      console.error('❌ API: Ошибка загрузки координат:', error);
    }
  };

  // Инициализация позиций только через DOM и API
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      // Небольшая задержка чтобы DOM элементы успели создаться
      setTimeout(() => {
        // Сначала пробуем загрузить из API
        loadPlayerCoordinatesFromAPI().then(() => {
          // Для игроков без координат в БД устанавливаем сетку
          safePlayers.forEach((player, index) => {
            const currentPos = getPlayerPosition(player.id);
            if (currentPos.x === 0 && currentPos.y === 0) {
              // Начальная сетка
              const spacing = 150;
              const columns = 4;
              const startX = 470; // Начинаем после сайдбара (420 + 50)
              const startY = 100;
              
              const col = index % columns;
              const row = Math.floor(index / columns);
              
              const x = startX + col * spacing;
              const y = startY + row * spacing;
              
              setPlayerPosition(player.id, x, y);
            }
          });
        });
      }, 50);
    }
  }, [safePlayers.length]);
  
  // 🚀 УБРАЛИ постоянные запросы к API!
  // Теперь координаты обновляются только через WebSocket уведомления
  
  // Функция для обновления координат от WebSocket
  const updatePlayerPositionFromSync = useCallback((playerId, x, y) => {
    console.log(`🔗 PlayerIcons: updatePlayerPositionFromSync вызвана для игрока ${playerId}: (${x}, ${y})`);
    
    // Обновляем позицию только если не перетаскиваем этого игрока
    const isDraggingThisPlayer = dragState.current.isDragging && 
                                safePlayers[dragState.current.draggedIndex]?.id === playerId;
    
    if (isDraggingThisPlayer) {
      console.log(`⏸️ PlayerIcons: Пропускаем обновление - игрок ${playerId} перетаскивается`);
    } else {
      console.log(`✅ PlayerIcons: Обновляем позицию игрока ${playerId} в DOM`);
      setPlayerPosition(playerId, x, y);
    }
  }, [safePlayers]);
  
  // Добавляем внешний доступ к функции обновления
  useEffect(() => {
    if (onPlayerPositionUpdate && typeof onPlayerPositionUpdate === 'function') {
      // Передаем функцию обновления в родительский компонент
      console.log('🔗 PlayerIcons: Устанавливаем window.updatePlayerPosition');
      window.updatePlayerPosition = updatePlayerPositionFromSync;
    } else {
      console.warn('❌ PlayerIcons: onPlayerPositionUpdate не передан или не функция');
    }
    
    return () => {
      // Cleanup
      if (window.updatePlayerPosition) {
        console.log('🧹 PlayerIcons: Очищаем window.updatePlayerPosition');
        delete window.updatePlayerPosition;
      }
    };
  }, [updatePlayerPositionFromSync, onPlayerPositionUpdate]);
  
  // 🧹 ПОЛНЫЙ cleanup всех timeouts при размонтировании
  useEffect(() => {
    return () => {
      console.log('🧹 PlayerIcons: Cleanup timeouts при размонтировании');
      
      // Cleanup save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Cleanup drag timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
  }, []); 
  
  // Пересчет позиций при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      // При изменении размера окна ничего не делаем
      // Фишки остаются на своих позициях без ограничений
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleMouseMove = useCallback((e) => {
    const { isDragging, draggedIndex, dragOffset } = dragState.current;
    
    if (!isDragging || draggedIndex === null) return;
    
    e.preventDefault();
    
    // Прямое позиционирование без ограничений
    const newX = e.pageX - dragOffset.x;
    const newY = e.pageY - dragOffset.y;
    
    // Напрямую обновляем позицию в DOM
    const player = safePlayers[draggedIndex];
    if (player) {
      setPlayerPosition(player.id, newX, newY);
    }
  }, [safePlayers]);

  // 🛡️ ЗАЩИЩЕННЫЙ cleanup dragState
  const forceCleanupDragState = useCallback(() => {
    console.log('🧹 ПРИНУДИТЕЛЬНЫЙ cleanup dragState');
    
    // Очищаем timeout защиты
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // Clean up drag state
    dragState.current = {
      isDragging: false,
      draggedIndex: null,
      dragOffset: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 }
    };
    
    // Remove event listeners (безопасно)
    try {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    } catch (error) {
      console.warn('❌ Ошибка при удалении event listeners:', error);
    }
  }, []);

  const handleMouseUp = useCallback((e) => {
    console.log('🖱️ Mouse UP - начинаем завершение перетаскивания');
    const { isDragging, draggedIndex } = dragState.current;
    
    if (!isDragging || draggedIndex === null) {
      console.log('⏭️ Перетаскивание уже завершено или не начиналось');
      forceCleanupDragState(); // На всякий случай
      return;
    }
    
    const currentPlayer = safePlayers[draggedIndex];
    if (!currentPlayer) {
      console.warn('❌ Игрок не найден при завершении перетаскивания');
      forceCleanupDragState();
      return;
    }
    
    // Получаем текущую позицию из ref
    const currentPos = getPlayerPosition(currentPlayer.id);
    
    // Финальная позиция без ограничений
    let finalX = currentPos.x;
    let finalY = currentPos.y;
    
    console.log(`🎯 Завершение перетаскивания игрока ${currentPlayer.id}: (${finalX}, ${finalY})`);
    
    // Устанавливаем финальную позицию в DOM
    setPlayerPosition(currentPlayer.id, finalX, finalY);
    
    // СНАЧАЛА cleanup, ПОТОМ сохранение (чтобы не блокировать новые перетаскивания)
    forceCleanupDragState();
    
    // 🚀 Сохраняем координаты ПОСЛЕ cleanup
    debouncedSavePosition(currentPlayer.id, finalX, finalY);
    
  }, [safePlayers, forceCleanupDragState]);

  const handleMouseDown = useCallback((e, index) => {
    const player = safePlayers[index];
    const canDragThis = canDrag(player?.id);
    
    console.log(`🖱️ Mouse DOWN на игроке ${player?.id}:`, {
      canDrag: canDragThis,
      isDragging: dragState.current.isDragging,
      draggedIndex: dragState.current.draggedIndex
    });
    
    // Если уже перетаскиваем - принудительно очищаем состояние и начинаем заново
    if (dragState.current.isDragging) {
      console.warn('⚠️ Обнаружено зависшее состояние перетаскивания - принудительно очищаем');
      forceCleanupDragState();
    }
    
    if (!canDragThis) {
      console.log('🚫 Нет прав на перетаскивание этого игрока');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`✅ Начинаем перетаскивание игрока ${player.id}`);
    
    // Используем текущую позицию элемента напрямую из DOM
    const currentPosition = getPlayerPosition(player.id);
    
    // Вычисляем offset относительно текущей позиции элемента в DOM
    const offsetX = e.pageX - currentPosition.x;
    const offsetY = e.pageY - currentPosition.y;
    
    // Set drag state
    dragState.current = {
      isDragging: true,
      draggedIndex: index,
      dragOffset: { x: offsetX, y: offsetY },
      initialPosition: getPlayerPosition(player.id)
    };
    
    // Устанавливаем timeout защиту от зависания
    dragTimeoutRef.current = setTimeout(() => {
      console.warn('⏰ TIMEOUT: Принудительно завершаем перетаскивание через 10 секунд');
      forceCleanupDragState();
    }, DRAG_TIMEOUT);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [safePlayers, handleMouseMove, handleMouseUp, forceCleanupDragState]);

  // 🧹 ПОЛНЫЙ cleanup event listeners при размонтировании
  useEffect(() => {
    return () => {
      console.log('🧹 PlayerIcons: Cleanup event listeners при размонтировании');
      
      // Cleanup event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Force cleanup drag state
      dragState.current = {
        isDragging: false,
        draggedIndex: null,
        dragOffset: { x: 0, y: 0 },
        initialPosition: { x: 0, y: 0 }
      };
    };
  }, [handleMouseMove, handleMouseUp]);

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
              transition: isDragging ? 'none' : 'all 0.2s ease',
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
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