import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;
let currentChatRoom: string | null = null;
let registeredUser: any = null;
let activeLoungePayload: any = null;

const getSocketServerUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  // Use local server during development
  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin;
  }
  // Connect directly to Cloud Run backend in production
  // (Firebase Hosting rewrites block WebSocket upgrades)
  return 'https://preplab-portal-scgudezxqq-et.a.run.app';
};

export function getGlobalSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(getSocketServerUrl(), {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    globalSocket.on('connect', () => {
      console.log('[SocketClient] Connected to server, ID:', globalSocket?.id);
      // Automatically re-register presence if user was registered
      if (registeredUser && registeredUser.nik) {
        globalSocket?.emit('presence:join', registeredUser);
      } else {
        // Try to read from localStorage
        const nik = localStorage.getItem('p2h_inspector_nik');
        const name = localStorage.getItem('p2h_inspector_name');
        if (nik) {
          let profile: any = {};
          try {
            profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
          } catch {}
          const user = {
            nik,
            name: name || nik,
            department: profile.section || profile.department || 'General',
            section: profile.section || 'General',
            avatar: profile.avatar || null
          };
          registeredUser = user;
          globalSocket?.emit('presence:join', user);
        }
      }

      // Automatically re-join active chat room / lounge on reconnect
      if (currentChatRoom) {
        globalSocket?.emit('chat:join', {
          room: currentChatRoom,
          ...(registeredUser || {})
        });
        if (currentChatRoom === 'lounge' && activeLoungePayload) {
          globalSocket?.emit('lounge:join', activeLoungePayload);
        }
      }
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
    });

    globalSocket.on('connect_error', (err) => {
      console.warn('[SocketClient] Connection error:', err.message);
    });
  }

  return globalSocket;
}

export function registerPresence(user: {
  nik: string;
  name?: string;
  department?: string;
  section?: string;
  avatar?: string;
  equippedTitle?: string;
  equippedFrame?: string;
}) {
  if (!user || !user.nik) return;
  registeredUser = user;
  const socket = getGlobalSocket();
  if (socket.connected) {
    socket.emit('presence:join', user);
  }
}

export function pingPresence() {
  const socket = getGlobalSocket();
  if (socket.connected) {
    socket.emit('presence:ping');
  }
}

export function unregisterPresence() {
  registeredUser = null;
  const socket = getGlobalSocket();
  if (socket.connected) {
    socket.emit('presence:leave');
  }
}

export function joinRoom(room: string, user?: any) {
  currentChatRoom = room;
  const socket = getGlobalSocket();
  const payload = {
    room,
    ...(registeredUser || {}),
    ...(user || {})
  };
  if (socket.connected) {
    socket.emit('chat:join', payload);
  }
}

export function joinLounge(userPayload?: any) {
  currentChatRoom = 'lounge';
  const socket = getGlobalSocket();
  const payload = {
    room: 'lounge',
    ...(registeredUser || {}),
    ...(userPayload || {})
  };
  activeLoungePayload = payload;
  if (socket.connected) {
    socket.emit('chat:join', payload);
    socket.emit('lounge:join', payload);
  }
}

export function leaveRoom() {
  currentChatRoom = null;
  const socket = getGlobalSocket();
  if (socket.connected) {
    socket.emit('chat:leave');
  }
}

export function leaveLounge(userNik?: string) {
  activeLoungePayload = null;
  currentChatRoom = null;
  const socket = getGlobalSocket();
  if (socket.connected) {
    socket.emit('lounge:leave', { nik: userNik });
    socket.emit('chat:leave');
  }
}

