import { useState, useEffect } from 'react';
import { Tooltip } from '@mui/material';

export default function PlayerIcons({ players, setPlayers, currentUser }) {
  const [positions, setPositions] = useState(() => {
    const saved = localStorage.getItem('playerPositions');
    return saved ? JSON.parse(saved) : Array(12).fill().map((_, i) => ({
      x: (i % 3) * 100 + 50,
      y: Math.floor(i / 3) * 100 + 50
    }));
  });

  useEffect(() => {
    localStorage.setItem('playerPositions', JSON.stringify(positions));
  }, [positions]);

  const canDrag = (playerId) => {
    if (!currentUser) return false;
    if (currentUser.type === 'admin') return true;
    return currentUser.type === 'player' && currentUser.id === playerId;
  };

  const handleDragStart = (e, index) => {
    if (!canDrag(players[index].id)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('index', index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const index = e.dataTransfer.getData('index');
    if (!canDrag(players[index].id)) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 32;
    const y = e.clientY - rect.top - 32 + window.scrollY;

    setPositions(prev => {
      const newPos = [...prev];
      newPos[index] = { x, y };
      return newPos;
    });

    const updatedPlayers = [...players];
    updatedPlayers[index].stats.position = index + 1;
    setPlayers(updatedPlayers);
  };

  return (
    <div 
      className="relative w-full min-h-screen p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        minHeight: '120vh', // Увеличиваем высоту для скролла
        paddingBottom: '100px'
      }}
    >
      {players.map((player, index) => (
        <Tooltip key={player.id} title={player.name} arrow>
          <div
            draggable={canDrag(player.id)}
            onDragStart={(e) => handleDragStart(e, index)}
            style={{
              position: 'absolute',
              left: `${positions[index].x}px`,
              top: `${positions[index].y}px`,
              cursor: canDrag(player.id) ? 'grab' : 'default',
              zIndex: 10,
              transition: 'transform 0.2s ease'
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              canDrag(player.id) 
                ? 'bg-blue-500 hover:bg-blue-600 shadow-lg' 
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {player.image ? (
              <img 
                src={player.image} 
                alt={player.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-xl">👤</span>
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}