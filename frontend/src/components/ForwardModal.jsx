import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { mediaUrl, sanitizeText } from "../utils";
import toast from "react-hot-toast";

export default function ForwardModal({ message, onClose }) {
  const { chats, forwardMessage } = useChatStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = chats.filter((c) => {
    const title =
      c.title ||
      c.members
        ?.filter((m) => m.id !== user?.id)
        .map((m) => m.display_name || m.phone)
        .join(", ") ||
      "";
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async (chatId) => {
    setSending(true);
    try {
      await forwardMessage(message.id, chatId);
      toast.success("Message forwarded");
      onClose();
    } catch (err) {
      toast.error("Failed to forward message");
    } finally {
      setSending(false);
    }
  };

  const getChatTitle = (chat) => {
    if (chat.title) return chat.title;
    if (chat.chat_type === "private") {
      const other = chat.members?.find((m) => m.id !== user?.id);
      return other?.display_name || other?.phone || "Chat";
    }
    return chat.members?.map((m) => m.display_name || m.phone).join(", ") || "Chat";
  };

  const getChatAvatar = (chat) => {
    if (chat.chat_type === "private") {
      const other = chat.members?.find((m) => m.id !== user?.id);
      return other?.avatar_url;
    }
    return chat.avatar_url;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div
        ref={ref}
        className="bg-tg-sidebar rounded-2xl shadow-2xl w-[380px] max-h-[500px] flex flex-col"
      >
        <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Forward message</h2>
          <button onClick={onClose} className="text-tg-muted hover:text-tg-text text-lg">✕</button>
        </div>

        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-tg-input rounded-lg text-sm text-tg-text outline-none placeholder-tg-muted"
            autoFocus
          />
        </div>

        {/* Preview of forwarded message */}
        <div className="mx-4 mb-2 p-2 bg-tg-dark rounded-lg border-l-2 border-tg-blue">
          <div className="text-xs text-tg-blue font-semibold truncate">
            {sanitizeText(message.sender?.display_name || "You")}
          </div>
          <div className="text-xs text-tg-muted truncate">
            {message.image_url ? "📷 Photo" : ""}
            {message.image_url && message.content ? " " : ""}
            {sanitizeText(message.content) || ""}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((chat) => {
            const title = getChatTitle(chat);
            const avatarUrl = getChatAvatar(chat);
            return (
              <button
                key={chat.id}
                onClick={() => handleForward(chat.id)}
                disabled={sending}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-tg-hover transition text-left disabled:opacity-50"
              >
                {avatarUrl ? (
                  <img src={mediaUrl(avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-tg-blue flex items-center justify-center font-bold flex-shrink-0">
                    {title[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="text-sm font-medium truncate">{sanitizeText(title)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-tg-muted text-sm py-8">No chats found</div>
          )}
        </div>
      </div>
    </div>
  );
}
