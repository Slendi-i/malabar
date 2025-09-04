import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
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
      console.log(`🎯 DOM: Установлена позиция для игрока ${playerId}: (${x}, ${y})`);
    }
  };

  // Получить текущую позицию фишки
  const getPlayerPosition = (playerId) => {
    return positions.current[playerId] || { x: 0, y: 0 };
  };

  // Инициализация позиций только один раз при загрузке игроков
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      console.log('🎯 НОВЫЙ ПОДХОД: Инициализация позиций через DOM для', safePlayers.length, 'игроков');
      
      // Ждем, пока DOM элементы будут созданы
      setTimeout(() => {
        safePlayers.forEach((player, index) => {
          // Пропускаем если позиция уже установлена
          if (positions.current[player.id]) {
            return;
          }
          
          let x, y;
          
          // Используем сохраненные координаты БД если они есть и валидны
          if (typeof player.x === 'number' && typeof player.y === 'number' && 
              player.x !== null && player.y !== null && 
              !isNaN(player.x) && !isNaN(player.y)) {
            x = player.x;
            y = player.y;
            console.log(`🗄️ DOM: Игрок ${player.name} - позиция из БД: (${x}, ${y})`);
          } else {
            // Для новых игроков используем фиксированные позиции в сетке
            const padding = 100;
            const spacing = 150;
            const columns = 4;
            
            const col = index % columns;
            const row = Math.floor(index / columns);
            
            x = padding + col * spacing;
            y = padding + row * spacing;
            
            console.log(`🆕 DOM: Игрок ${player.name} - новая позиция: (${x}, ${y})`);
          }
          
          setPlayerPosition(player.id, x, y);
        });
      }, 50); // Минимальная задержка для создания DOM
    }
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
    
    if (!isDragging || draggedIndex === null || !containerRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const iconSize = 64;
    const padding = 10;
    
    // Используем максимальную доступную высоту (viewport или документ)
    const maxHeight = Math.max(
      containerRect.height, 
      window.innerHeight, 
      document.documentElement.scrollHeight
    );
    
    // Вычисляем новые координаты с учетом границ (по X - контейнер, по Y - полная высота документа)
    const newX = Math.max(padding, Math.min(containerRect.width - iconSize - padding, e.clientX - containerRect.left - dragOffset.x));
    const newY = Math.max(padding, Math.min(maxHeight - iconSize - padding, e.clientY - containerRect.top - dragOffset.y));
    
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
    
    const iconSize = 64;
    const padding = 10;
    
    // Убеждаемся, что позиция находится в пределах (по X - контейнер, по Y - полная высота)
    let finalX = Math.max(padding, currentPos.x);
    let finalY = Math.max(padding, currentPos.y);
    
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxHeight = Math.max(
        containerRect.height, 
        window.innerHeight, 
        document.documentElement.scrollHeight
      );
      
      finalX = Math.min(containerRect.width - iconSize - padding, finalX);
      finalY = Math.min(maxHeight - iconSize - padding, finalY);
      
      console.log(`📏 DOM: Границы перетаскивания - ширина: ${containerRect.width}, высота: ${maxHeight}`);
    }
    
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
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Set drag state
    dragState.current = {
      isDragging: true,
      draggedIndex: index,
      dragOffset: { x: offsetX, y: offsetY },
      initialPosition: getPlayerPosition(player.id)
    };
    
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
              zIndex: isDragging ? 1000 : 10,
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