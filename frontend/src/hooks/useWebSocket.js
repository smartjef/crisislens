/**
 * useWebSocket.js
 *
 * Generic reconnecting WebSocket hook.
 * Usage:
 *   const { lastMessage, readyState } = useWebSocket("ws/alerts/");
 */
import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/";

const READY_STATES = { 0: "CONNECTING", 1: "OPEN", 2: "CLOSING", 3: "CLOSED" };
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(path, { enabled = true } = {}) {
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState("CLOSED");
  const wsRef = useRef(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled || unmountedRef.current) return;
    const url = `${WS_BASE}${path}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setReadyState("CONNECTING");

    ws.onopen = () => {
      attemptsRef.current = 0;
      setReadyState("OPEN");
    };

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage(event.data);
      }
    };

    ws.onerror = () => setReadyState("CLOSED");

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setReadyState("CLOSED");
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1;
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, [path, enabled]);

  useEffect(() => {
    unmountedRef.current = false;
    if (enabled) connect();
    return () => {
      unmountedRef.current = true;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect, enabled]);

  return { lastMessage, readyState: READY_STATES[wsRef.current?.readyState] || readyState };
}
