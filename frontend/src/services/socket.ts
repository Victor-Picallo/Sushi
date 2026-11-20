import { io, Socket } from 'socket.io-client';

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export const socket: Socket = io(backendUrl);
