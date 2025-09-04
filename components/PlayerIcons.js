import { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [positions, setPositions] = useState(() => {
    // Initialize positions from player data or use fixed grid layout
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      return safePlayers.map((player, index) => {
        // Используем сохраненные координаты БД если они есть и валидны
        if (typeof player.x === 'number' && typeof player.y === 'number' && 
            player.x !== null && player.y !== null && 
            !isNaN(player.x) && !isNaN(player.y)) {
          return { x: player.x, y: player.y };
        }
        
        // Для новых игроков используем фиксированные позиции в сетке (НЕ случайные!)
        const padding = 100;
        const spacing = 150; // расстояние между фишками
        const columns = 4; // количество колонок
        
        const col = index % columns;
        const row = Math.floor(index / columns);
        
        const x = padding + col * spacing;
        const y = padding + row * spacing;
        
        return { x, y };
      });
    }
    return [];
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Update positions when players data changes
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0 && draggedIndex === null) {
      // Only update positions if not currently dragging
      const newPositions = safePlayers.map((player, index) => {
        // Используем сохраненные x,y координаты из БД если они есть и валидны
        if (typeof player.x === 'number' && typeof player.y === 'number' && 
            player.x !== null && player.y !== null && 
            !isNaN(player.x) && !isNaN(player.y)) {
          return { x: player.x, y: player.y };
        }
        
        // Для новых игроков используем фиксированные позиции в сетке (НЕ случайные!)
        const padding = 100;
        const spacing = 150;
        const columns = 4;
        
        const col = index % columns;
        const row = Math.floor(index / columns);
        
        const x = padding + col * spacing;
        const y = padding + row * spacing;
        
        return { x, y };
      });
      
      // Only update if positions actually changed to avoid unnecessary re-renders
      const positionsChanged = JSON.stringify(newPositions) !== JSON.stringify(positions);
      if (positionsChanged) {
        setPositions(newPositions);
      }
    }
  }, [safePlayers, draggedIndex]); // Убрали positions из зависимостей

  // Ensure positions array has the right length
  useEffect(() => {
    if (Array.isArray(positions) && positions.length !== safePlayers.length && safePlayers.length > 0) {
      setPositions(prev => {
        const newPos = Array.isArray(prev) ? [...prev] : [];
        while (newPos.length < safePlayers.length) {
          const index = newPos.length;
          const player = safePlayers[index];
          
          // Используем сохраненные координаты или фиксированные позиции для новых игроков
          if (typeof player?.x === 'number' && typeof player?.y === 'number' && 
              player.x !== null && player.y !== null && 
              !isNaN(player.x) && !isNaN(player.y)) {
            newPos.push({ x: player.x, y: player.y });
          } else {
            // Фиксированные позиции в сетке
            const padding = 100;
            const spacing = 150;
            const columns = 4;
            
            const col = index % columns;
            const row = Math.floor(index / columns);
            
            const x = padding + col * spacing;
            const y = padding + row * spacing;
            
            newPos.push({ x, y });
          }
        }
        return newPos;
      });
    }
  }, [safePlayers.length]); // Убрали positions.length из зависимостей

  const canDrag = useCallback((playerId) => {
    if (!currentUser || !playerId) return false;
    
    // Администратор может перетаскивать все фишки
    if (currentUser.type === 'admin') return true;
    
    // Игрок может перетаскивать только свою фишку
    if (currentUser.type === 'player') {
      return String(currentUser.id) === String(playerId);
    }
    
    // Зрители не могут перетаскивать фишки
    return false;
  }, [currentUser]);

  const handleMouseMove = useCallback((e) => {
    if (draggedIndex === null || !containerRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const iconSize = 64;
    const padding = 10;
    
    // Вычисляем новые координаты с учетом границ контейнера
    const newX = Math.max(padding, Math.min(containerRect.width - iconSize - padding, e.clientX - containerRect.left - dragOffset.x));
    const newY = Math.max(padding, Math.min(containerRect.height - iconSize - padding, e.clientY - containerRect.top - dragOffset.y));
    
    // Update position smoothly
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: newX, y: newY };
      return newPos;
    });
  }, [draggedIndex, dragOffset]);

  const handleMouseUp = useCallback((e) => {
    if (draggedIndex === null || !isDragging) return;
    
    // Свободное перетаскивание - сохраняем точную позицию без привязки к сетке
    const currentPos = positions[draggedIndex];
    const iconSize = 64;
    const padding = 10;
    
    // Убеждаемся, что позиция находится в пределах контейнера
    let finalX = Math.max(padding, currentPos.x);
    let finalY = Math.max(padding, currentPos.y);
    
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      finalX = Math.min(containerRect.width - iconSize - padding, finalX);
      finalY = Math.min(containerRect.height - iconSize - padding, finalY);
    }
    
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: finalX, y: finalY };
      return newPos;
    });
    
    // Сохраняем пиксельные координаты в базе данных
    const currentPlayer = safePlayers[draggedIndex];
    if (currentPlayer) {
      apiService.updatePlayerCoordinates(currentPlayer.id, finalX, finalY)
        .catch(error => {
          console.error('Ошибка сохранения позиции игрока:', error);
        });
    }
    
    // Clean up
    setDraggedIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [draggedIndex, isDragging, positions, safePlayers]);

  const handleMouseDown = useCallback((e, index) => {
    const player = safePlayers[index];
    const canDragThis = canDrag(player?.id);
    
    if (!canDragThis || isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedIndex(index);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [safePlayers, canDrag, isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      style={{
        minHeight: '100vh',
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
        
        const isDragging = draggedIndex === index;
        const canDragPlayer = canDrag(player.id);
        
        
        return (
        <Tooltip key={player.id} title={player.name} arrow>
          <div
            onMouseDown={canDragPlayer ? (e) => handleMouseDown(e, index) : undefined}
            style={{
              position: 'absolute',
              left: `${positions[index]?.x || 0}px`,
              top: `${positions[index]?.y || 0}px`,
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