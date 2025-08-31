import { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';

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
  const containerRef = useRef(null);

  // Update positions when players data changes
  useEffect(() => {
    if (Array.isArray(safePlayers) && safePlayers.length > 0 && draggedIndex === null) {
      // Only update positions if not currently dragging
      const newPositions = safePlayers.map((player, index) => {
        const pos = player.position || (index + 1);
        return {
          x: ((pos - 1) % 3) * 200 + 100,
          y: Math.floor((pos - 1) / 3) * 200 + 100
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
          newPos.push({
            x: (index % 3) * 200 + 100,
            y: Math.floor(index / 3) * 200 + 100
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
    e.stopPropagation();
    
    console.log(`Starting drag for player ${index}:`, safePlayers[index]?.name);
    
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
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(containerRect.width - 64, e.clientX - containerRect.left - dragOffset.x));
    const y = Math.max(0, e.clientY - containerRect.top - dragOffset.y);
    
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
    const gridX = Math.max(0, Math.min(2, Math.floor((finalPos.x - 100) / 200)));
    const gridY = Math.max(0, Math.floor((finalPos.y - 100) / 200));
    const newPosition = gridY * 3 + gridX + 1;
    
    // Snap to grid
    const snappedX = gridX * 200 + 100;
    const snappedY = gridY * 200 + 100;
    
    setPositions(prev => {
      const newPos = [...prev];
      newPos[draggedIndex] = { x: snappedX, y: snappedY };
      return newPos;
    });
    
    // Update player data with new position only if it actually changed
    const currentPlayer = safePlayers[draggedIndex];
    if (currentPlayer && currentPlayer.position !== newPosition) {
      const updatedPlayers = [...safePlayers];
      updatedPlayers[draggedIndex] = {
        ...updatedPlayers[draggedIndex],
        position: newPosition
      };
      
      console.log(`Moving player ${currentPlayer.name} from position ${currentPlayer.position} to position ${newPosition}`);
      
      // Update players state which will trigger API save
      setPlayers(updatedPlayers);
    } else {
      console.log('Position unchanged, not updating');
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