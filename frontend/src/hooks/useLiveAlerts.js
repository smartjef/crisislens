/**
 * useLiveAlerts.js
 *
 * Subscribes to ws/alerts/ and merges new events into the Zustand alert store.
 * Also fetches initial alerts from REST on mount.
 */
import { useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAlertStore } from "../store/useAlertStore";
import client from "../api/client";

export function useLiveAlerts() {
  const { addAlert, setAlerts } = useAlertStore();
  const { lastMessage, readyState } = useWebSocket("ws/alerts/");

  // Initial fetch
  useEffect(() => {
    client.get("/api/alerts/?status=active&page_size=50")
      .then((res) => setAlerts(res.data.results || res.data))
      .catch(() => {});
  }, [setAlerts]);

  // Push new WS alerts into store
  useEffect(() => {
    if (lastMessage) addAlert(lastMessage);
  }, [lastMessage, addAlert]);

  return { readyState };
}
