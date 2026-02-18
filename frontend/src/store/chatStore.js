import { create } from "zustand";
import api from "../api";

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  messages: [],
  typingUsers: {}, // chatId -> Set<userId>
  onlineUsers: new Set(),

  resetStore: () => {
    set({
      chats: [],
      activeChat: null,
      messages: [],
      typingUsers: {},
      onlineUsers: new Set(),
    });
  },

  fetchChats: async () => {
    const res = await api.get("/chats");
    set({ chats: res.data });
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat, messages: [] });
    if (chat) get().fetchMessages(chat.id);
  },

  fetchMessages: async (chatId) => {
    const res = await api.get(`/chats/${chatId}/messages`);
    set({ messages: res.data });
  },

  sendMessage: async (chatId, content) => {
    await api.post(`/chats/${chatId}/messages`, { content });
    // Message will arrive via WebSocket
  },

  sendImage: async (chatId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/chats/${chatId}/messages/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Message will arrive via WebSocket
  },

  createChat: async (chatType, title, memberIds) => {
    const res = await api.post("/chats", {
      chat_type: chatType,
      title,
      member_ids: memberIds,
    });
    await get().fetchChats();
    return res.data;
  },

  getOrCreatePrivateChat: async (userId) => {
    const res = await api.get(`/chats/private/${userId}`);
    await get().fetchChats();
    return res.data;
  },

  addNewMessage: (message) => {
    const { activeChat, messages, chats } = get();

    // Update messages if current chat
    if (activeChat && message.chat_id === activeChat.id) {
      const exists = messages.some((m) => m.id === message.id);
      if (!exists) {
        set({ messages: [...messages, message] });
      }
    }

    // Update chat list last message
    const chatExists = chats.some((c) => c.id === message.chat_id);
    if (chatExists) {
      set({
        chats: chats.map((c) =>
          c.id === message.chat_id ? { ...c, last_message: message } : c
        ),
      });
    } else {
      // Chat not in list yet (e.g., new private chat from another user) — fetch all chats
      get().fetchChats();
    }
  },

  updateMessageStatus: (messageId, chatId, status) => {
    set({
      messages: get().messages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      ),
    });
  },

  editMessage: async (chatId, messageId, content) => {
    const res = await api.put(`/chats/${chatId}/messages/${messageId}`, { content });
    return res.data;
  },

  deleteMessage: async (chatId, messageId) => {
    await api.delete(`/chats/${chatId}/messages/${messageId}`);
  },

  applyMessageEdit: (message) => {
    set({
      messages: get().messages.map((m) =>
        m.id === message.id ? { ...m, content: message.content, edited: true } : m
      ),
    });
    // Update last_message in chat list if needed
    const { chats } = get();
    set({
      chats: chats.map((c) =>
        c.last_message?.id === message.id
          ? { ...c, last_message: { ...c.last_message, content: message.content } }
          : c
      ),
    });
  },

  applyMessageDelete: (messageId, chatId) => {
    const { messages, chats } = get();
    const filtered = messages.filter((m) => m.id !== messageId);
    set({ messages: filtered });
    // Update last_message in chat list
    set({
      chats: chats.map((c) => {
        if (c.last_message?.id === messageId) {
          return { ...c, last_message: filtered.length > 0 && c.id === chatId ? filtered[filtered.length - 1] : null };
        }
        return c;
      }),
    });
  },

  setTyping: (chatId, userId) => {
    const { typingUsers } = get();
    const existing = typingUsers[chatId] || new Set();
    existing.add(userId);
    set({ typingUsers: { ...typingUsers, [chatId]: existing } });
    // Clear after 3s
    setTimeout(() => {
      const current = get().typingUsers[chatId];
      if (current) {
        current.delete(userId);
        set({ typingUsers: { ...get().typingUsers, [chatId]: current } });
      }
    }, 3000);
  },

  setOnline: (userId, online) => {
    const s = new Set(get().onlineUsers);
    if (online) s.add(userId);
    else s.delete(userId);
    set({ onlineUsers: s });
  },

  addMember: async (chatId, memberId) => {
    await api.post(`/chats/${chatId}/members?member_id=${memberId}`);
    await get().fetchChats();
  },

  searchUsers: async (query) => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },
}));
