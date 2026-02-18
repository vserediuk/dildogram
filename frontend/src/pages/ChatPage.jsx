import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { useWebSocket } from "../hooks/useWebSocket";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const { user, fetchMe } = useAuthStore();
  const { fetchChats, activeChat } = useChatStore();
  useWebSocket();

  useEffect(() => {
    fetchMe();
    fetchChats();
  }, []);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      {activeChat ? (
        <ChatWindow />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-tg-dark">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-tg-muted text-lg">Select a chat to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
