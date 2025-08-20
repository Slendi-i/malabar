import { useState, useEffect } from 'react';
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

  const handleDragStart = (e, index) => {
    if (!safePlayers[index] || !safePlayers[index].id || !canDrag(safePlayers[index].id)) {
      e.preventDefault();
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.setData('index', index);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    
    const index = parseInt(e.dataTransfer.getData('index'));
    if (isNaN(index) || !safePlayers[index] || !safePlayers[index].id || !canDrag(safePlayers[index].id)) return;
    
    if (!e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect || typeof rect.left !== 'number' || typeof rect.top !== 'number') return;
    
    const x = (e.clientX || 0) - rect.left - 32;
    const y = (e.clientY || 0) - rect.top - 32 + (typeof window !== 'undefined' ? window.scrollY : 0);

    // Update local positions
    setPositions(prev => {
      const newPos = Array.isArray(prev) ? [...prev] : [];
      newPos[index] = { x, y };
      return newPos;
    });

    // Calculate new position based on coordinates
    const newPosition = Math.floor(y / 100) * 3 + Math.floor(x / 100) + 1;
    
    // Update player data with new position
    const updatedPlayers = Array.isArray(safePlayers) ? [...safePlayers] : [];
    if (updatedPlayers[index]) {
      updatedPlayers[index] = {
        ...updatedPlayers[index],
        position: newPosition
      };
      
      // Update players state which will trigger API save
      if (typeof setPlayers === 'function') {
        setPlayers(updatedPlayers);
      }
    }
  };

  return (
    <div 
      className="relative w-full min-h-screen p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e)}
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
        
        return (
        <Tooltip key={player.id} title={player.name} arrow>
          <div
            draggable={player.id ? canDrag(player.id) : false}
            onDragStart={(e) => player.id ? handleDragStart(e, index) : e.preventDefault()}
            style={{
              position: 'absolute',
              left: `${positions[index]?.x || 0}px`,
              top: `${positions[index]?.y || 0}px`,
              cursor: player.id && canDrag(player.id) ? 'grab' : 'default',
              zIndex: 10,
              transition: 'transform 0.2s ease'
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              player.id && canDrag(player.id) 
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