import { useEffect, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

// ---- singleton WebSocket manager ----
let ws = null;
let reconnectTimer = null;
let currentToken = null;
let mountCount = 0;

function handleMessage(event) {
  const data = JSON.parse(event.data);
  const store = useChatStore.getState();

  switch (data.type) {
    case "new_message":
      store.addNewMessage(data.message);
      break;
    case "status_update":
      store.updateMessageStatus(data.message_id, data.chat_id, data.status);
      break;
    case "typing":
      store.setTyping(data.chat_id, data.user_id);
      break;
    case "presence":
      store.setOnline(data.user_id, data.online);
      break;
    case "chat_added":
      store.fetchChats();
      break;
    case "avatar_updated":
      store.fetchChats();
      break;
  }
}

function connectWS(token) {
  if (!token) return;

  // If token changed, force close old connection
  if (currentToken && currentToken !== token) {
    disconnectWS();
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  currentToken = token;

  let wsUrl;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Render / production: derive WS URL from the API URL
    const parsed = new URL(apiUrl);
    const proto = parsed.protocol === "https:" ? "wss:" : "ws:";
    wsUrl = `${proto}//${parsed.host}/ws?token=${token}`;
  } else {
    // Local dev: same host as the page (proxied by Vite)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    wsUrl = `${protocol}//${host}/ws?token=${token}`;
  }
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[WS] Connected");
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  ws.onmessage = handleMessage;

  ws.onclose = () => {
    console.log("[WS] Disconnected");
    ws = null;
    if (mountCount > 0 && currentToken) {
      reconnectTimer = setTimeout(() => connectWS(currentToken), 2000);
    }
  };

  ws.onerror = () => { try { ws.close(); } catch(_) {} };
}

function disconnectWS() {
  currentToken = null;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { try { ws.close(); } catch(_) {} ws = null; }
}

// ---- React hook (call once in ChatPage) ----
export function useWebSocket() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    mountCount++;
    connectWS(token);
    return () => {
      mountCount--;
      if (mountCount <= 0) {
        disconnectWS();
        mountCount = 0;
      }
    };
  }, [token]);

  const sendWS = useCallback((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Not connected, cannot send", data);
    }
  }, []);

  return { sendWS };
}

// standalone sendWS for use outside hooks
export function sendWS(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  } else {
    console.warn("[WS] Not connected, cannot send", data);
  }
}
