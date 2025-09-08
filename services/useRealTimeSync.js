import { useEffect, useRef, useCallback, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

export function useRealTimeSync(onPlayersUpdate, onUserUpdate) {
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10; // Увеличено количество попыток
  const baseReconnectDelay = 500; // Уменьшена базовая задержка
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Функция для запуска heartbeat
  const startHeartbeat = useCallback(() => {
    // Очищаем предыдущий интервал если есть
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    lastHeartbeatRef.current = Date.now();
    
    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
      
      // Если давно не было сообщений (более 60 секунд), отправляем ping
      if (timeSinceLastHeartbeat > 60000) {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          try {
            ws.current.send(JSON.stringify({ type: 'ping', timestamp: now }));
          } catch (error) {
            console.error('Failed to send heartbeat ping:', error);
            // Принудительно переподключаемся при ошибке ping
            if (ws.current) {
              ws.current.close();
            }
          }
        }
      }
    }, 30000); // Проверяем каждые 30 секунд (увеличили интервал)
  }, []);

  // Функция для остановки heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      setConnectionStatus('connecting');
      
      ws.current = new WebSocket(API_ENDPOINTS.WEBSOCKET);

      ws.current.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        startHeartbeat();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Обновляем время последнего сообщения (heartbeat)
          lastHeartbeatRef.current = Date.now();
          
          switch (message.type) {
            case 'player_updated':
              if (onPlayersUpdate && message.data.player) {
                onPlayersUpdate('single', message.data.player, message.data.id);
              }
              break;
              
            case 'players_batch_updated':
              if (onPlayersUpdate && message.data.players) {
                onPlayersUpdate('batch', message.data.players);
              }
              break;
              
            case 'user_logged_in':
              if (onUserUpdate && message.data) {
                onUserUpdate('login', message.data);
              }
              break;
              
            case 'ping':
              // Отвечаем на ping сервера
              if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'pong' }));
              }
              break;
              
            case 'pong':
              // Получен ответ на наш ping
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        stopHeartbeat();
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(baseReconnectDelay * Math.pow(1.5, reconnectAttempts.current), 10000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached. Starting HTTP polling fallback.');
          setConnectionStatus('failed');
          // Запускаем HTTP polling как fallback
          startHttpPolling();
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        // Запускаем HTTP polling при ошибке WebSocket
        startHttpPolling();
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      // Запускаем HTTP polling при ошибке создания WebSocket
      startHttpPolling();
    }
  }, [onPlayersUpdate, onUserUpdate]);

  // HTTP polling as fallback when WebSocket fails
  const startHttpPolling = useCallback(() => {
    console.log('Starting HTTP polling fallback...');
    
    const pollInterval = setInterval(async () => {
      try {
        // Check for updates via HTTP
        const response = await fetch(`${API_ENDPOINTS.PLAYERS}/updates?since=${Date.now() - 10000}`);
        if (response.ok) {
          const data = await response.json();
          if (data.players && data.players.length > 0 && onPlayersUpdate) {
            onPlayersUpdate('batch', data.players);
          }
        }
      } catch (error) {
        console.warn('HTTP polling failed:', error);
      }
    }, 10000); // Poll every 10 seconds (увеличили интервал)
    
    // Store interval ID for cleanup
    reconnectTimeoutRef.current = pollInterval;
  }, [onPlayersUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Запускаем HTTP polling как fallback
    startHttpPolling();
    
    return () => {
      disconnect();
    };
  }, []);

  // Expose connection status and manual controls
  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connectionStatus,
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(() => {
        connect();
      }, 100);
    }
  };
}
