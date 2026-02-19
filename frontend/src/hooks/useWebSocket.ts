import { useEffect, useRef, useCallback } from "react";

type WsHandler = (event: string, data: Record<string, unknown>) => void;

export function useWebSocket(onMessage: WsHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/status`);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handlerRef.current(msg.event, msg.data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);
}
