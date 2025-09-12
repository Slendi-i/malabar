import { useEffect, useRef, useCallback, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

export function useRealTimeSync(onPlayersUpdate, onUserUpdate) {
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 999; // Практически бесконечные попытки
  const baseReconnectDelay = 10000; // Не чаще 1 раза в 10 секунд
  const lastConnectAttemptRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());
  const isConnectingRef = useRef(false);
  const lastPingRef = useRef(0);
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
      
      // Если давно не было сообщений (более 30 секунд), отправляем ping  
      if (timeSinceLastHeartbeat > 30000) {
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
    }, 15000); // Проверяем каждые 15 секунд для оптимизации
  }, []);

  // Функция для остановки heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') {
      console.log('🔌 WebSocket: Серверный рендеринг, пропускаем подключение');
      return;
    }

    // Защита от одновременных подключений
    if (isConnectingRef.current) {
      console.log('🔌 WebSocket: Подключение уже в процессе, пропускаем');
      return;
    }

    // Проверка видимости и онлайн статуса
    if (document.hidden || !navigator.onLine) {
      console.log('🔌 WebSocket: Страница скрыта или офлайн, откладываем подключение');
      setTimeout(() => {
        if (!document.hidden && navigator.onLine) {
          connect();
        }
      }, 10000);
      return;
    }

    try {
      // Троттлинг подключения: не чаще 1 раза в 10 секунд
      const now = Date.now();
      const sinceLast = now - lastConnectAttemptRef.current;
      if (sinceLast < baseReconnectDelay) {
        const wait = baseReconnectDelay - sinceLast;
        console.log(`🔌 WebSocket: ждём ${wait}мс перед новым подключением`);
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, wait);
        }
        return;
      }
      lastConnectAttemptRef.current = now;

      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }

      setConnectionStatus('connecting');
      isConnectingRef.current = true;
      
      ws.current = new WebSocket(API_ENDPOINTS.WEBSOCKET);

      ws.current.onopen = () => {
        console.log('🔗 WebSocket: Соединение установлено!');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        startHeartbeat();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Обновляем время последнего сообщения (heartbeat)
          lastHeartbeatRef.current = Date.now();
          
          switch (message.type) {
            case 'coordinates':
              // Обновление координат игрока
              if (onPlayersUpdate && message.data.id && message.data.x !== undefined && message.data.y !== undefined) {
                console.log('📍 WebSocket: Получены новые координаты для игрока', message.data.id);
                onPlayersUpdate('coordinates', message.data, message.data.id);
              }
              break;
              
            case 'profile':
              // Обновление профиля игрока
              if (onPlayersUpdate && message.data.player && message.data.id) {
                console.log('📝 WebSocket: Получен обновленный профиль игрока', message.data.id);
                onPlayersUpdate('profile', message.data.player, message.data.id);
              }
              break;
              
            case 'player_updated':
              // Старый формат для совместимости
              if (onPlayersUpdate && message.data.player) {
                onPlayersUpdate('profile', message.data.player, message.data.id);
              }
              break;
              
            case 'players_batch_updated':
              if (onPlayersUpdate && message.data.players) {
                onPlayersUpdate('initial_load', message.data.players);
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
        console.log(`❌ WebSocket: Соединение закрыто. Code: ${event.code}, Reason: ${event.reason || 'Не указано'}`);
        setConnectionStatus('disconnected');
        stopHeartbeat();
        isConnectingRef.current = false;
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          // Фиксируем паузу между попытками не менее 10 секунд + джиттер
          const delay = baseReconnectDelay + Math.floor(Math.random() * 1500);
          console.log(`🔄 WebSocket: Переподключаемся через ${delay}ms (попытка ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached.');
          setConnectionStatus('failed');
          // 🚀 УБРАЛИ HTTP polling - он создавал постоянные запросы к БД!
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        isConnectingRef.current = false;
        // 🚀 УБРАЛИ HTTP polling - он создавал постоянные запросы!
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      isConnectingRef.current = false;
      // 🚀 УБРАЛИ HTTP polling - он создавал постоянные запросы!
    }
  }, [onPlayersUpdate, onUserUpdate]);

  // 🚀 УБРАЛИ HTTP polling - он создавал постоянные запросы к БД!
  // Теперь синхронизация работает ТОЛЬКО через WebSocket

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
    
    // Слушатели для видимости и онлайн статуса
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine && ws.current?.readyState !== WebSocket.OPEN) {
        console.log('🔌 WebSocket: Страница стала видимой, пытаемся подключиться');
        connect();
      }
    };

    const handleOnline = () => {
      if (!document.hidden && ws.current?.readyState !== WebSocket.OPEN) {
        console.log('🔌 WebSocket: Соединение восстановлено, пытаемся подключиться');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    return () => {
      disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
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
      setTimeout(() => {
        connect();
      }, 100);
    }
  };
}
