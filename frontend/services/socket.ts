import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.5:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};
