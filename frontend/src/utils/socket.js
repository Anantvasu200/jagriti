import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

export default socket;
