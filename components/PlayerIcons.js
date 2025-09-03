import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';
import apiService from '../services/apiService';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [positions, setPositions] = useState(() => {
    // Initialize positions from player data or use defaults
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      return safePlayers.map((player, index) => {
        const pos = player.position || (index + 1);
        return {
          x: ((pos - 1) % 3) * 200 + 100,
          y: Math.floor((pos - 1) / 3) * 200 + 100
        };
      });
    }
    return Array(12).fill().map((_, i) => ({
      x: (i % 3) * 200 + 100,
      y: Math.floor(i / 3) * 200 + 100
    }));
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
        // Используем сохраненные x,y координаты или дефолтные для новых игроков
        return {
          x: player.x !== undefined ? player.x : (index * 80 + 50),
          y: player.y !== undefined ? player.y : 100
        };
      });
      
      // Only update if positions actually changed to avoid unnecessary re-renders
      const positionsChanged = JSON.stringify(newPositions) !== JSON.stringify(positions);
      if (positionsChanged) {
        console.log('Updating positions from server data');
        setPositions(newPositions);
      }
    }
  }, [safePlayers, draggedIndex, positions]);

  // Ensure positions array has the right length
  useEffect(() => {
    if (Array.isArray(positions) && positions.length !== safePlayers.length && safePlayers.length > 0) {
      setPositions(prev => {
        const newPos = Array.isArray(prev) ? [...prev] : [];
        while (newPos.length < safePlayers.length) {
          const index = newPos.length;
          const player = safePlayers[index];
          newPos.push({
            x: player?.x !== undefined ? player.x : (index * 80 + 50),
            y: player?.y !== undefined ? player.y : 100
          });
        }
        return newPos;
      });
    }
  }, [safePlayers.length, positions.length]);

  const canDrag = (playerId) => {
    if (!currentUser || !playerId) {
      console.log('canDrag: Missing currentUser or playerId', { currentUser, playerId });
      return false;
    }
    if (currentUser.type === 'admin') {
      console.log('canDrag: Admin access granted');
      return true;
    }
    // Приведение типов для сравнения
    const userIdStr = String(currentUser.id);
    const playerIdStr = String(playerId);
    const canDragResult = currentUser.type === 'player' && userIdStr === playerIdStr;
    console.log('canDrag check:', { 
      userType: currentUser.type, 
      userId: userIdStr, 
      playerId: playerIdStr, 
      result: canDragResult 
    });
    return canDragResult;
  };

  const handleMouseDown = (e, index) => {
    const player = safePlayers[index];
    const canDragThis = canDrag(player?.id);
    
    console.log(`Mouse down on player ${index}:`, {
      player: player?.name,
      playerId: player?.id,
      canDrag: canDragThis,
      currentUser: currentUser
    });
    
    if (!canDragThis) {
      console.log('Drag not allowed for this player');
      return;
    }
    
    // Если уже перетаскиваем, не начинаем новое перетаскивание
    if (isDragging) {
      console.log('Already dragging, ignoring mouse down');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`✅ Starting drag for player ${index}: ${player?.name}`);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedIndex(index);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (draggedIndex === null || !containerRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(containerRect.width - 64, e.clientX - containerRect.left - dragOffset.x));
    const y = Math.max(0, e.clientY - containerRect.top - dragOffset.y);
    
    console.log(`🖱️ Moving player ${draggedIndex} to (${x}, ${y})`);
    
    // Update position smoothly
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x, y };
      return newPos;
    });
  };

  const handleMouseUp = (e) => {
    if (draggedIndex === null || !isDragging) return;
    
    // Свободное перетаскивание - сохраняем точную позицию без привязки к сетке
    const currentPos = positions[draggedIndex];
    const finalX = Math.max(0, currentPos.x);
    const finalY = Math.max(0, currentPos.y);
    
    console.log(`✅ Dropping player ${draggedIndex} at free position (${finalX}, ${finalY})`);
    
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: finalX, y: finalY };
      return newPos;
    });
    
    // Сохраняем пиксельные координаты в базе данных
    const currentPlayer = safePlayers[draggedIndex];
    if (currentPlayer) {
      console.log(`📍 Сохранение позиции игрока ${currentPlayer.name} в БД: (${finalX}, ${finalY})`);
      
      // НЕ обновляем локальное состояние - отправляем сразу в БД
      // Real-time sync обновит состояние из БД
      // Отправляем координаты в БД через специальный API
      apiService.updatePlayerCoordinates(currentPlayer.id, finalX, finalY)
        .then(() => {
          console.log('✅ Позиция игрока сохранена в БД');
        })
        .catch(error => {
          console.error('❌ Ошибка сохранения позиции игрока:', error);
          alert('Ошибка сохранения позиции. Попробуйте еще раз.');
        });
    } else {
      console.log('Position unchanged, not updating');
    }
    
    // Clean up
    setDraggedIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-screen p-4"
      style={{
        minHeight: '120vh',
        paddingBottom: '100px'
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
              zIndex: isDragging ? 20 : 10,
              transition: isDragging ? 'none' : 'left 0.2s ease, top 0.2s ease',
              transform: isDragging ? 'scale(1.1)' : 'scale(1)',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              canDragPlayer 
                ? 'bg-blue-500 hover:bg-blue-600 shadow-lg' 
                : 'bg-gray-500 hover:bg-gray-600'
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