import { create } from "zustand";
import api from "../api";
import { useChatStore } from "./chatStore";

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,
  user: null,

  setToken: (token) => {
    localStorage.setItem("token", token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
    useChatStore.getState().resetStore();
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data });
    } catch {
      get().logout();
    }
  },

  register: async (phone, password, displayName) => {
    const res = await api.post("/auth/register", {
      phone,
      password,
      display_name: displayName,
    });
    get().setToken(res.data.access_token);
    await get().fetchMe();
  },

  login: async (phone, password) => {
    const res = await api.post("/auth/login", { phone, password });
    get().setToken(res.data.access_token);
    await get().fetchMe();
  },

  requestSMS: async (phone) => {
    const res = await api.post("/auth/sms/request", { phone });
    return res.data;
  },

  verifySMS: async (phone, code) => {
    const res = await api.post("/auth/sms/verify", { phone, code });
    get().setToken(res.data.access_token);
    await get().fetchMe();
  },
}));
