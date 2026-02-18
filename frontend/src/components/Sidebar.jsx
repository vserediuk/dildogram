import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { mediaUrl } from "../utils";
import ChatListItem from "./ChatListItem";
import NewChatModal from "./NewChatModal";
import dayjs from "dayjs";

export default function Sidebar() {
  const { user } = useAuthStore();
  const { chats, activeChat, setActiveChat } = useChatStore();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();

  const filteredChats = chats.filter((c) => {
    const title = c.title || c.members?.map((m) => m.display_name || m.phone).join(", ") || "";
    return title.toLowerCase().includes(search.toLowerCase());
  });

  // Sort by last_message time
  const sortedChats = [...filteredChats].sort((a, b) => {
    const ta = a.last_message?.created_at || a.created_at;
    const tb = b.last_message?.created_at || b.created_at;
    return new Date(tb) - new Date(ta);
  });

  return (
    <div className="w-80 bg-tg-sidebar flex flex-col border-r border-gray-700/50 h-screen">
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-tg-blue flex items-center justify-center text-lg font-bold hover:brightness-110 transition flex-shrink-0"
        >
          {user?.avatar_url ? (
            <img src={mediaUrl(user.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            (user?.display_name || "?")[0].toUpperCase()
          )}
        </button>
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-tg-input rounded-lg text-sm text-tg-text outline-none placeholder-tg-muted"
        />
        <button
          onClick={() => setShowNewChat(true)}
          className="w-10 h-10 rounded-full hover:bg-tg-hover flex items-center justify-center transition text-xl"
          title="New chat"
        >
          ✏️
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="p-4 text-center text-tg-muted text-sm">No chats yet</div>
        ) : (
          sortedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={activeChat?.id === chat.id}
              currentUserId={user?.id}
              onClick={() => setActiveChat(chat)}
            />
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
