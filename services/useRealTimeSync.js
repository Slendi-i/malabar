import { useEffect, useRef, useCallback, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

export function useRealTimeSync(onPlayersUpdate, onUserUpdate) {
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      console.log('Attempting WebSocket connection to:', API_ENDPOINTS.WEBSOCKET);
      setConnectionStatus('connecting');
      
      ws.current = new WebSocket(API_ENDPOINTS.WEBSOCKET);

      ws.current.onopen = () => {
        console.log('WebSocket connected for real-time sync');
        setConnectionStatus('connected');
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
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached. Falling back to HTTP polling.');
          setConnectionStatus('failed');
          // Start HTTP polling as fallback
          startHttpPolling();
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      // Fallback to HTTP polling
      startHttpPolling();
    }
  }, [onPlayersUpdate, onUserUpdate]);

  // HTTP polling as fallback when WebSocket fails
  const startHttpPolling = useCallback(() => {
    console.log('Starting HTTP polling fallback...');
    
    const pollInterval = setInterval(async () => {
      try {
        // Check for updates via HTTP
        const response = await fetch(`${API_ENDPOINTS.PLAYERS}/updates?since=${Date.now() - 5000}`);
        if (response.ok) {
          const data = await response.json();
          if (data.players && data.players.length > 0 && onPlayersUpdate) {
            onPlayersUpdate('batch', data.players);
          }
        }
      } catch (error) {
        console.warn('HTTP polling failed:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    // Store interval ID for cleanup
    reconnectTimeoutRef.current = pollInterval;
  }, [onPlayersUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(reconnectTimeoutRef.current); // Also clear intervals
      reconnectTimeoutRef.current = null;
    }
    
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
  }, [connect, disconnect]);

  // Expose connection status and manual controls
  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connectionStatus,
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 100);
    }
  };
}
