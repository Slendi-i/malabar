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

  // Heartbeat отключен - может вызывать проблемы с постоянными обновлениями
  const startHeartbeat = useCallback(() => {
    // Отключили heartbeat чтобы избежать проблем с постоянными обновлениями
    console.log('Heartbeat отключен для предотвращения проблем с обновлениями');
  }, []);

  // Функция для остановки heartbeat
  const stopHeartbeat = useCallback(() => {
    // Heartbeat отключен
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
        if (startHeartbeat) startHeartbeat();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
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
              
            default:
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        if (stopHeartbeat) stopHeartbeat();
        
        // Упростили логику переподключения
        if (event.code !== 1000 && reconnectAttempts.current < 3) {
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, 2000);
        } else {
          setConnectionStatus('failed');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [onPlayersUpdate, onUserUpdate]);

  // HTTP polling отключен - может вызывать проблемы с постоянными обновлениями
  const startHttpPolling = useCallback(() => {
    // Отключили HTTP polling чтобы избежать проблем с постоянными обновлениями
    console.log('HTTP polling отключен для предотвращения проблем с обновлениями');
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (stopHeartbeat) stopHeartbeat();
    
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
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
