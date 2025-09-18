import { useState } from 'react';
import { Button } from '@mui/material';
import PlayerProfileModal from './PlayerProfileModal';
import DiceModal from './DiceModal';
import GameRollModal from './GameRollModal';
import RulesModal from './RulesModal';
import apiService from '../services/apiService';

const calculateStats = (games = []) => {
  const stats = {
    wins: 0,
    rerolls: 0,
    drops: 0,
    position: 0
  };

  if (!Array.isArray(games)) return stats;

  games.forEach(game => {
    if (!game || typeof game !== 'object') return;
    
    if (game.status === 'Пройдено') {
      stats.wins++;
      if (typeof game.dice === 'number') {
        stats.position += game.dice;
      }
    } else if (game.status === 'Реролл') {
      stats.rerolls++;
    } else if (game.status === 'Дроп') {
      stats.drops++;
    }
  });

  return stats;
};

export default function Sidebar({ players = [], setPlayers, currentUser }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [gameRollModalOpen, setGameRollModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  
  // Отладочная информация
  console.log('Sidebar render, rulesModalOpen:', rulesModalOpen);
  const [currentPlayerProfile, setCurrentPlayerProfile] = useState(null);

  const handlePlayerClick = (player) => {
    if (player && typeof player === 'object') {
      setSelectedPlayer({
        ...player,
        games: Array.isArray(player.games) ? player.games : []
      });
    }
  };

  const handleRollComplete = async (sum) => {
    if (!currentUser || currentUser.type !== 'player') return;
    
    
    // НЕ обновляем локальное состояние - отправляем сразу в БД
    try {
      const currentPlayer = players.find(p => p.id === currentUser.id);
      if (!currentPlayer) return;
      
      const games = Array.isArray(currentPlayer.games) ? [...currentPlayer.games] : [];
      
      // Ищем игру в процессе без результата броска
      let gameToUpdate = games.find(g => 
        g && g.status === 'В процессе' && 
        (!g.dice || g.dice === 0)
      );

      // Если не найдена, ищем любую игру в процессе
      if (!gameToUpdate) {
        gameToUpdate = games.find(g => g && g.status === 'В процессе');
      }

      if (!gameToUpdate) {
        gameToUpdate = {
          name: '',
          status: 'В процессе',
          comment: '',
          dice: sum
        };
        games.push(gameToUpdate);
      } else {
        gameToUpdate.dice = sum;
      }

      // Отправляем в БД через API
      await apiService.updatePlayerGames(currentUser.id, games);
      
      // Обновляем локальное состояние для немедленного отображения
      setPlayers(prev => prev.map(player => 
        player.id === currentUser.id 
          ? { ...player, games: games }
          : player
      ));
    } catch (error) {
      console.error('❌ Ошибка сохранения результата броска:', error);
      alert('Ошибка сохранения результата броска. Попробуйте еще раз.');
    }
  };

  const handleGameSelect = async (gameName) => {
    if (!currentUser || currentUser.type !== 'player') return;
    
    
    // НЕ обновляем локальное состояние - отправляем сразу в БД
    try {
      const currentPlayer = players.find(p => p.id === currentUser.id);
      if (!currentPlayer) return;
      
      const games = Array.isArray(currentPlayer.games) ? [...currentPlayer.games] : [];
      
      // Ищем игру в процессе с результатом броска но без названия
      let gameToUpdate = games.find(g => 
        g && g.status === 'В процессе' && 
        g.dice > 0 && 
        (!g.name || g.name === '')
      );

      // Если не найдена, ищем любую игру в процессе без названия
      if (!gameToUpdate) {
        gameToUpdate = games.find(g => 
          g && g.status === 'В процессе' && 
          (!g.name || g.name === '')
        );
      }

      if (!gameToUpdate) {
        gameToUpdate = {
          name: gameName,
          status: 'В процессе',
          comment: '',
          dice: 0
        };
        games.push(gameToUpdate);
      } else {
        gameToUpdate.name = gameName;
      }

      // Отправляем в БД через API
      await apiService.updatePlayerGames(currentUser.id, games);
      
      // Обновляем локальное состояние для немедленного отображения
      setPlayers(prev => prev.map(player => 
        player.id === currentUser.id 
          ? { ...player, games: games }
          : player
      ));
    } catch (error) {
      console.error('❌ Ошибка сохранения выбора игры:', error);
      alert('Ошибка сохранения выбора игры. Попробуйте еще раз.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      gap: '28px',
      width: '420px',
      height: '100vh',
      background: '#FFFFFF',
      position: 'relative',
      overflowY: 'auto'
    }}>
      <h1 style={{
        width: '100%',
        height: '44px',
        fontFamily: 'Manrope',
        fontStyle: 'normal',
        fontWeight: 800,
        fontSize: '32px',
        lineHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#151515',
        margin: 0,
        whiteSpace: 'nowrap'
      }}>
        MALABAR-EVENT
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0px',
        gap: '10px',
        width: '100%',
        height: '49px'
      }}>
        <Button 
          variant="contained" 
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '14px 24px',
            gap: '10px',
            width: '100%',
            height: '49px',
            background: '#151515',
            borderRadius: '6px',
            textTransform: 'none'
          }}
          onClick={() => {
            if (currentUser?.type === 'player') {
              const profile = players.find(p => p.id === currentUser.id);
              setCurrentPlayerProfile(profile ? {
                ...profile,
                games: Array.isArray(profile.games) ? profile.games : []
              } : null);
            }
            setDiceModalOpen(true);
          }}
        >
          <span style={{
            fontFamily: 'Raleway',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '18px',
            lineHeight: '21px',
            color: '#FFFFFF'
          }}>
            Кинуть кубик
          </span>
        </Button>
        <Button 
          variant="contained" 
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '14px 24px',
            gap: '10px',
            width: '100%',
            height: '49px',
            background: '#151515',
            borderRadius: '6px',
            textTransform: 'none'
          }}
          onClick={() => {
            if (currentUser?.type === 'player') {
              const profile = players.find(p => p.id === currentUser.id);
              setCurrentPlayerProfile(profile ? {
                ...profile,
                games: Array.isArray(profile.games) ? profile.games : []
              } : null);
            }
            setGameRollModalOpen(true);
          }}
        >
          <span style={{
            fontFamily: 'Raleway',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '18px',
            lineHeight: '21px',
            color: '#FFFFFF'
          }}>
            Ролл игры
          </span>
        </Button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0px',
        gap: '10px',
        width: '100%',
        height: '49px',
        marginTop: '20px'
      }}>
        <Button 
          variant="contained" 
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '14px 24px',
            gap: '10px',
            width: '100%',
            height: '49px',
            background: '#151515',
            borderRadius: '6px',
            textTransform: 'none'
          }}
          onClick={() => {
            console.log('Кнопка Правила нажата, открываем модальное окно');
            alert('Кнопка Правила нажата!'); // Временная отладка
            setRulesModalOpen(true);
          }}
        >
          <span style={{
            fontFamily: 'Raleway',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '18px',
            lineHeight: '21px',
            color: '#FFFFFF'
          }}>
            Правила
          </span>
        </Button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '0px',
        gap: '20px',
        width: '100%',
        flex: 1,
        overflowY: 'auto'
      }}>
        {players.map((player) => {
          const safeGames = Array.isArray(player.games) ? player.games : [];
          const stats = calculateStats(safeGames);
          
          return (
            <div 
              key={player.id} 
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: '0px',
                gap: '16px',
                width: '100%',
                height: '100px',
                background: '#F5F5F5',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handlePlayerClick(player)}
            >
              <div style={{
                boxSizing: 'border-box',
                width: '100px',
                height: '100px',
                border: '4px solid #FFFFFF',
                filter: 'drop-shadow(4px 0px 40px rgba(21, 21, 21, 0.25))',
                borderRadius: '8px',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {player.avatar ? (
                  <img 
                    src={player.avatar} 
                    alt="Аватар" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#EDEDED'
                  }}>
                    <span style={{ fontSize: '24px' }}>👤</span>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '10px 10px 10px 0px',
                gap: '10px',
                width: 'calc(100% - 116px)',
                height: '100px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0px',
                  gap: '7px',
                  width: '100%',
                  height: '21px'
                }}>
                  <span style={{
                    fontFamily: 'Raleway',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    fontSize: '18px',
                    lineHeight: '21px',
                    color: '#151515',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {player.name}
                  </span>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    padding: '0px',
                    gap: '4px',
                    width: '36px',
                    height: '16px'
                  }}>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '16px',
                      color: '#000000'
                    }}>
                      {stats.position.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: '0px',
                  gap: '4px',
                  width: '100%',
                  height: '34px'
                }}>
                  <div style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '4px 10px',
                    gap: '4px',
                    width: '33%',
                    height: '34px',
                    border: '2px solid #1A992E',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#1A992E'
                    }}>П:</span>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#1A992E'
                    }}>{stats.wins}</span>
                  </div>

                  <div style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '4px 10px',
                    gap: '4px',
                    width: '33%',
                    height: '34px',
                    border: '2px solid #1F19C3',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#1F19C3'
                    }}>Р:</span>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#1F19C3'
                    }}>{stats.rerolls}</span>
                  </div>

                  <div style={{
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '4px 10px',
                    gap: '4px',
                    width: '33%',
                    height: '34px',
                    border: '2px solid #C32519',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#C32519'
                    }}>Д:</span>
                    <span style={{
                      fontFamily: 'Raleway',
                      fontStyle: 'normal',
                      fontWeight: 700,
                      fontSize: '22px',
                      lineHeight: '26px',
                      color: '#C32519'
                    }}>{stats.drops}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          open={Boolean(selectedPlayer)}
          onClose={() => setSelectedPlayer(null)}
          setPlayers={setPlayers}
          players={players}
          currentUser={currentUser}
        />
      )}

      <DiceModal
        open={diceModalOpen}
        onClose={() => setDiceModalOpen(false)}
        currentUser={currentUser}
        onRollComplete={handleRollComplete}
        playerProfile={currentPlayerProfile}
      />

      <GameRollModal
        open={gameRollModalOpen}
        onClose={() => setGameRollModalOpen(false)}
        currentUser={currentUser}
        onGameSelect={handleGameSelect}
        playerProfile={currentPlayerProfile}
      />

      <RulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />
    </div>
  );
}