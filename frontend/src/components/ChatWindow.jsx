import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { sendWS } from "../hooks/useWebSocket";
import { mediaUrl } from "../utils";
import MessageBubble from "./MessageBubble";
import dayjs from "dayjs";

export default function ChatWindow() {
  const { user } = useAuthStore();
  const { activeChat, messages, fetchMessages, typingUsers, onlineUsers } = useChatStore();
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!activeChat || !messages.length || !user) return;
    const unread = messages.filter(
      (m) => m.sender_id !== user.id && m.status !== "read"
    );
    unread.forEach((m) => {
      sendWS({ type: "read", chat_id: activeChat.id, message_id: m.id });
    });
  }, [messages, activeChat?.id, user?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !activeChat) return;
    sendWS({ type: "message", chat_id: activeChat.id, content: trimmed });
    setText("");
  };

  const handleTyping = useCallback(() => {
    if (!activeChat) return;
    if (typingTimeoutRef.current) return; // throttle
    sendWS({ type: "typing", chat_id: activeChat.id });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [activeChat?.id, sendWS]);

  // Chat title
  let title = activeChat?.title;
  if (!title && activeChat?.chat_type === "private") {
    const other = activeChat.members?.find((m) => m.id !== user?.id);
    title = other?.display_name || other?.phone || "Chat";
  }
  if (!title) title = activeChat?.members?.map((m) => m.display_name || m.phone).join(", ") || "Chat";

  // Other user for private chat
  const otherUser = activeChat?.chat_type === "private"
    ? activeChat.members?.find((m) => m.id !== user?.id)
    : null;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  // Avatar: for private chats use other user's avatar, otherwise chat avatar
  const avatarUrl = activeChat?.chat_type === "private" ? otherUser?.avatar_url : activeChat?.avatar_url;
  const subtitle = activeChat?.chat_type === "group"
    ? `${activeChat.members?.length || 0} members`
    : isOnline
    ? "online"
    : otherUser?.last_seen
    ? `last seen ${dayjs(otherUser.last_seen).format("HH:mm")}`
    : "";

  // Typing indicator
  const chatTyping = typingUsers[activeChat?.id];
  const typingNames = chatTyping
    ? [...chatTyping]
        .filter((uid) => uid !== user?.id)
        .map((uid) => {
          const m = activeChat?.members?.find((u) => u.id === uid);
          return m?.display_name || "Someone";
        })
    : [];

  return (
    <div className="flex-1 flex flex-col bg-tg-dark h-screen">
      {/* Header */}
      <div className="px-4 py-3 bg-tg-sidebar border-b border-gray-700/50 flex items-center gap-3">
        <div className="relative">
          {avatarUrl ? (
            <img src={mediaUrl(avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-tg-blue flex items-center justify-center font-bold">
              {title[0]?.toUpperCase() || "?"}
            </div>
          )}
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-tg-green rounded-full border-2 border-tg-sidebar" />
          )}
        </div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-tg-muted">
            {typingNames.length > 0
              ? `${typingNames.join(", ")} typing...`
              : subtitle}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const showDate =
            i === 0 ||
            dayjs(msg.created_at).format("YYYY-MM-DD") !==
              dayjs(messages[i - 1].created_at).format("YYYY-MM-DD");
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-4">
                  <span className="bg-tg-sidebar/80 text-tg-muted text-xs px-3 py-1 rounded-full">
                    {dayjs(msg.created_at).format("MMMM D, YYYY")}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} isOwn={msg.sender_id === user?.id} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 bg-tg-sidebar border-t border-gray-700/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            placeholder="Write a message..."
            className="flex-1 px-4 py-3 bg-tg-input rounded-xl text-sm text-tg-text outline-none placeholder-tg-muted"
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-10 h-10 bg-tg-blue rounded-full flex items-center justify-center hover:brightness-110 transition disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
