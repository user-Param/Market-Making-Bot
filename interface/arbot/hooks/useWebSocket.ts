import { useEffect, useState, useCallback, useRef } from 'react';

export function useWebSocket(url: string) {
    const [data, setData] = useState<any>(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WS] Connected to backend');
            setConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                setData(msg);
            } catch (err) {
                console.error('[WS] Error parsing message', err);
            }
        };

        socket.onclose = () => {
            console.log('[WS] Disconnected');
            setConnected(false);
            // Simple reconnect
            setTimeout(() => {
                setConnected(false);
            }, 3000);
        };

        return () => {
            socket.close();
        };
    }, [url]);

    return { data, connected };
}
