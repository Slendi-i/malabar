import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  // Ensure players is an array and has the expected structure
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [positions, setPositions] = useState(() => {
    // Initialize positions from player data or use defaults
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      return safePlayers.map((player, index) => ({
        x: player.position ? ((player.position - 1) % 3) * 100 + 50 : (index % 3) * 100 + 50,
        y: player.position ? Math.floor((player.position - 1) / 3) * 100 + 50 : Math.floor(index / 3) * 100 + 50
      }));
    }
    return Array(12).fill().map((_, i) => ({
      x: (i % 3) * 100 + 50,
      y: Math.floor(i / 3) * 100 + 50
    }));
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Update positions when players data changes
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0) {
      setPositions(safePlayers.map((player, index) => ({
        x: player.position ? ((player.position - 1) % 3) * 100 + 50 : (index % 3) * 100 + 50,
        y: player.position ? Math.floor((player.position - 1) / 3) * 100 + 50 : Math.floor(index / 3) * 100 + 50
      })));
    }
  }, [safePlayers]);

  // Ensure positions array has the right length
  useEffect(() => {
    if (Array.isArray(positions) && positions.length !== safePlayers.length && safePlayers.length > 0) {
      setPositions(prev => {
        const newPos = Array.isArray(prev) ? [...prev] : [];
        while (newPos.length < safePlayers.length) {
          const index = newPos.length;
          newPos.push({
            x: (index % 3) * 100 + 50,
            y: Math.floor(index / 3) * 100 + 50
          });
        }
        return newPos;
      });
    }
  }, [safePlayers.length, positions.length]);

  const canDrag = (playerId) => {
    if (!currentUser || !playerId) return false;
    if (currentUser.type === 'admin') return true;
    return currentUser.type === 'player' && currentUser.id === playerId;
  };

  const handleMouseDown = (e, index) => {
    if (!canDrag(safePlayers[index]?.id)) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedIndex(index);
    setDragOffset({ x: offsetX, y: offsetY });
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (draggedIndex === null || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;
    
    // Update position smoothly
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x, y };
      return newPos;
    });
  };

  const handleMouseUp = (e) => {
    if (draggedIndex === null) return;
    
    // Calculate final grid position
    const finalPos = positions[draggedIndex];
    const gridX = Math.floor((finalPos.x - 50) / 100);
    const gridY = Math.floor((finalPos.y - 50) / 100);
    const newPosition = gridY * 3 + gridX + 1;
    
    // Snap to grid
    const snappedX = gridX * 100 + 50;
    const snappedY = gridY * 100 + 50;
    
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: snappedX, y: snappedY };
      return newPos;
    });
    
    // Update player data with new position
    const updatedPlayers = [...safePlayers];
    if (updatedPlayers[draggedIndex]) {
      updatedPlayers[draggedIndex] = {
        ...updatedPlayers[draggedIndex],
        position: newPosition
      };
      
      // Update players state which will trigger API save
      setPlayers(updatedPlayers);
    }
    
    // Clean up
    setDraggedIndex(null);
    setDragOffset({ x: 0, y: 0 });
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
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              transform: isDragging ? 'scale(1.1)' : 'scale(1)',
              userSelect: 'none'
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