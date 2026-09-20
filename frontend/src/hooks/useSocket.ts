import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

export function useSocket(): Socket | null {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!isAuthenticated || !token) return;

    const baseUrl =
      (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api/v1', '').replace('/api', '') ??
      'http://localhost:3000';

    const instance = io(baseUrl, {
      auth: { token },
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated]);

  return socket;
}
