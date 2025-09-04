import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [positions, setPositions] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const containerRef = useRef(null);
  const dragState = useRef({
    isDragging: false,
    draggedIndex: null,
    dragOffset: { x: 0, y: 0 },
    initialPosition: { x: 0, y: 0 }
  });
  // Инициализация позиций при первой загрузке и при изменении количества игроков
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      // Инициализируем или обновляем позиции только для новых игроков
      setPositions(prevPositions => {
        const newPositions = safePlayers.map((player, index) => {
          // Если уже есть позиция для этого индекса, оставляем её
          if (prevPositions[index]) {
            return prevPositions[index];
          }
          
          // Используем сохраненные координаты БД если они есть и валидны
          if (typeof player.x === 'number' && typeof player.y === 'number' && 
              player.x !== null && player.y !== null && 
              !isNaN(player.x) && !isNaN(player.y)) {
            console.log(`🗄️ Игрок ${player.name} - позиция из БД: (${player.x}, ${player.y})`);
            return { x: player.x, y: player.y };
          }
          
          // Для новых игроков используем фиксированные позиции в сетке
          const padding = 100;
          const spacing = 150;
          const columns = 4;
          
          const col = index % columns;
          const row = Math.floor(index / columns);
          
          const x = padding + col * spacing;
          const y = padding + row * spacing;
          
          console.log(`🆕 Игрок ${player.name} - новая позиция: (${x}, ${y})`);
          return { x, y };
        });
        
        return newPositions;
      });
      
      if (!isInitialized) {
        setIsInitialized(true);
        console.log('✅ Инициализация завершена');
      }
    }
  }, [safePlayers.length, isInitialized]); // Реагируем только на изменение количества игроков

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
    
    // Вычисляем новые координаты с учетом границ контейнера
    const newX = Math.max(padding, Math.min(containerRect.width - iconSize - padding, e.clientX - containerRect.left - dragOffset.x));
    const newY = Math.max(padding, Math.min(containerRect.height - iconSize - padding, e.clientY - containerRect.top - dragOffset.y));
    
    // Update position smoothly
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: newX, y: newY };
      return newPos;
    });
  };

  const handleMouseUp = (e) => {
    const { isDragging, draggedIndex } = dragState.current;
    
    if (!isDragging || draggedIndex === null) return;
    
    // Get current position
    const currentPos = positions[draggedIndex];
    if (!currentPos) return;
    
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
    
    // Update final position
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: finalX, y: finalY };
      console.log(`✅ ФИНАЛЬНАЯ позиция игрока ${draggedIndex}: (${finalX}, ${finalY})`);
      return newPos;
    });
    
    // Сохраняем пиксельные координаты в базе данных
    const currentPlayer = safePlayers[draggedIndex];
    if (currentPlayer) {
      console.log(`💾 Сохранение в БД: ${currentPlayer.name} -> (${finalX}, ${finalY})`);
      
      apiService.updatePlayerCoordinates(currentPlayer.id, finalX, finalY)
        .then(() => {
          console.log(`✅ Сохранено в БД: ${currentPlayer.name}`);
        })
        .catch(error => {
          console.error('❌ Ошибка сохранения позиции игрока:', error);
        });
    }
    
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
      initialPosition: positions[index] || { x: 0, y: 0 }
    };
    
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