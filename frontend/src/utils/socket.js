import { io } from 'socket.io-client';

// Connect automatically to the origin serving the page.
// In docker, Nginx reverse-proxies /socket.io/ to the backend.
const socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling']
});

export default socket;
