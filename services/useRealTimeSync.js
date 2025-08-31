import { useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';

export function useRealTimeSync(onPlayersUpdate, onUserUpdate) {
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket(API_ENDPOINTS.WEBSOCKET);

      ws.current.onopen = () => {
        console.log('WebSocket connected for real-time sync');
        reconnectAttempts.current = 0;
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
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [onPlayersUpdate, onUserUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
      ws.current = null;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Expose connection status and manual controls
  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 100);
    }
  };
}
