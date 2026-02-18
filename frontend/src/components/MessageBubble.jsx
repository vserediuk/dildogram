import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { mediaUrl } from "../utils";

function MiniProfile({ user, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!user) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 bottom-full left-0 mb-2 bg-tg-sidebar border border-gray-600 rounded-xl shadow-2xl p-4 min-w-[220px] max-w-[280px]"
    >
      <div className="flex items-center gap-3 mb-3">
        {user.avatar_url ? (
          <img src={mediaUrl(user.avatar_url)} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-tg-blue flex items-center justify-center text-lg font-bold flex-shrink-0">
            {(user.display_name || user.phone)?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{user.display_name || user.phone}</div>
          {user.username && (
            <div className="text-tg-blue text-xs truncate">@{user.username}</div>
          )}
        </div>
      </div>
      {user.bio && (
        <div className="text-xs text-tg-muted leading-relaxed border-t border-gray-600/50 pt-2">
          {user.bio}
        </div>
      )}
      {user.phone && (
        <div className="text-xs text-tg-muted mt-2">
          {user.phone}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isOwn, onEdit, onDelete }) {
  const time = dayjs(message.created_at).format("HH:mm");
  const hasImage = !!message.image_url;
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleContextMenu = (e) => {
    if (!isOwn) return;
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group`}>
      <div
        className={`relative max-w-[70%] ${hasImage ? "p-1" : "px-3 py-2"} rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-tg-bubble-own rounded-br-md"
            : "bg-tg-sidebar rounded-bl-md"
        }`}
        onContextMenu={handleContextMenu}
      >
        {/* Sender name for group chats */}
        {!isOwn && message.sender && (
          <div className={`relative ${hasImage ? "px-2 pt-1" : ""}`}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="text-tg-blue text-xs font-semibold mb-0.5 hover:underline cursor-pointer"
            >
              {message.sender.display_name || message.sender.phone}
            </button>
            {showProfile && (
              <MiniProfile user={message.sender} onClose={() => setShowProfile(false)} />
            )}
          </div>
        )}

        {/* Image */}
        {hasImage && (
          <a href={mediaUrl(message.image_url)} target="_blank" rel="noopener noreferrer">
            <img
              src={mediaUrl(message.image_url)}
              alt="Image"
              className="rounded-xl max-w-full max-h-64 object-contain cursor-pointer"
              loading="lazy"
            />
          </a>
        )}

        {/* Text content + time + status */}
        <div className={`flex items-end gap-2 ${hasImage ? "px-2 pb-1 pt-1" : ""}`}>
          {message.content && (
            <span className="break-words whitespace-pre-wrap">{message.content}</span>
          )}
          <span className="flex items-center gap-0.5 flex-shrink-0 self-end ml-auto">
            {message.is_edited && (
              <span className="text-[10px] text-tg-muted leading-none mr-0.5">edited</span>
            )}
            <span className="text-[10px] text-tg-muted leading-none">{time}</span>
            {isOwn && (
              <span
                className={`text-[10px] leading-none ml-0.5 ${
                  message.status === "read"
                    ? "text-tg-green"
                    : "text-tg-muted"
                }`}
              >
                {message.status === "sent" && "✓"}
                {message.status === "delivered" && "✓✓"}
                {message.status === "read" && "✓✓"}
              </span>
            )}
          </span>
        </div>

        {/* Context menu */}
        {showMenu && isOwn && (
          <div
            ref={menuRef}
            className="absolute bottom-full right-0 mb-1 bg-tg-sidebar border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]"
          >
            {message.content && (
              <button
                onClick={() => { setShowMenu(false); onEdit?.(message); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-tg-hover transition flex items-center gap-2"
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); onDelete?.(message); }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-tg-hover transition flex items-center gap-2"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Hover action button (alternative to right-click) */}
      {isOwn && (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="opacity-0 group-hover:opacity-100 self-center ml-1 text-tg-muted hover:text-tg-text text-xs transition"
          title="Actions"
        >
          ⋮
        </button>
      )}
    </div>
  );
}
