import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { mediaUrl } from "../utils";
import toast from "react-hot-toast";

export default function NewChatModal({ onClose }) {
  const [tab, setTab] = useState("private"); // "private" | "group"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const { searchUsers, getOrCreatePrivateChat, createChat, setActiveChat } = useChatStore();

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchUsers(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectUser = (user) => {
    if (tab === "private") {
      // Start private chat immediately
      handleCreatePrivateChat(user.id);
    } else {
      // Toggle in selection
      if (selectedUsers.find((u) => u.id === user.id)) {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleCreatePrivateChat = async (userId) => {
    setLoading(true);
    try {
      const chat = await getOrCreatePrivateChat(userId);
      setActiveChat(chat);
      onClose();
    } catch (err) {
      toast.error("Failed to create chat");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) {
      toast.error("Group title is required");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Add at least one member");
      return;
    }
    setLoading(true);
    try {
      const chat = await createChat(
        "group",
        groupTitle,
        selectedUsers.map((u) => u.id)
      );
      setActiveChat(chat);
      onClose();
    } catch (err) {
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-tg-sidebar w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">New Chat</h2>
            <button onClick={onClose} className="text-tg-muted hover:text-white text-xl">
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-tg-input rounded-lg overflow-hidden">
            <button
              onClick={() => { setTab("private"); setSelectedUsers([]); }}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === "private" ? "bg-tg-blue text-white" : "text-tg-muted"
              }`}
            >
              Private
            </button>
            <button
              onClick={() => setTab("group")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === "group" ? "bg-tg-blue text-white" : "text-tg-muted"
              }`}
            >
              Group
            </button>
          </div>
        </div>

        {/* Group title */}
        {tab === "group" && (
          <div className="px-4 pt-3">
            <input
              type="text"
              placeholder="Group name"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              className="w-full px-3 py-2 bg-tg-input rounded-lg text-sm text-tg-text outline-none mb-2"
            />
            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="bg-tg-blue/30 text-tg-blue text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {u.display_name || u.phone}
                    <button
                      onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.id !== u.id))}
                      className="hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="Search by phone, name, or username..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 bg-tg-input rounded-lg text-sm text-tg-text outline-none"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto px-2 pb-3">
          {searchResults.map((u) => {
            const isSelected = selectedUsers.find((s) => s.id === u.id);
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
                  isSelected ? "bg-tg-blue/20" : "hover:bg-tg-hover"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-tg-blue flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {u.avatar_url ? (
                    <img src={mediaUrl(u.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    (u.display_name || u.phone)[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.display_name || u.phone}</div>
                  <div className="text-xs text-tg-muted truncate">{u.phone}</div>
                </div>
                {tab === "group" && isSelected && (
                  <span className="text-tg-blue text-lg">✓</span>
                )}
              </div>
            );
          })}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-center text-tg-muted text-sm py-4">No users found</p>
          )}
        </div>

        {/* Create group button */}
        {tab === "group" && (
          <div className="px-4 pb-4">
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupTitle.trim() || selectedUsers.length === 0}
              className="w-full py-2.5 bg-tg-blue rounded-lg font-semibold text-sm hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : `Create Group (${selectedUsers.length} members)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
