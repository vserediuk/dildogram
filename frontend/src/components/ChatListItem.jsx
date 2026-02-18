import dayjs from "dayjs";
import { useChatStore } from "../store/chatStore";
import { mediaUrl } from "../utils";

export default function ChatListItem({ chat, isActive, currentUserId, onClick }) {
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  // Determine display title
  let title = chat.title;
  if (!title && chat.chat_type === "private") {
    const other = chat.members?.find((m) => m.id !== currentUserId);
    title = other?.display_name || other?.phone || "Chat";
  }
  if (!title) title = chat.members?.map((m) => m.display_name || m.phone).join(", ") || "Chat";

  // Other user for private chat
  const otherUser = chat.chat_type === "private"
    ? chat.members?.find((m) => m.id !== currentUserId)
    : null;

  // Avatar: for private chats use other user's avatar, otherwise chat avatar
  const avatarUrl = chat.chat_type === "private" ? otherUser?.avatar_url : chat.avatar_url;
  const avatarLetter = title[0]?.toUpperCase() || "?";

  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  // Last message preview
  const lastMsg = chat.last_message;
  const preview = lastMsg
    ? lastMsg.image_url
      ? "📷 Photo"
      : lastMsg.content?.length > 40
        ? lastMsg.content.slice(0, 40) + "…"
        : lastMsg.content || ""
    : "No messages yet";

  const time = lastMsg ? dayjs(lastMsg.created_at).format("HH:mm") : "";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition ${
        isActive ? "bg-tg-blue/20" : "hover:bg-tg-hover"
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img src={mediaUrl(avatarUrl)} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-tg-blue flex items-center justify-center text-lg font-bold">
            {avatarLetter}
          </div>
        )}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-tg-green rounded-full border-2 border-tg-sidebar" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="font-medium truncate text-sm">{title}</span>
          <span className="text-xs text-tg-muted flex-shrink-0 ml-2">{time}</span>
        </div>
        <div className="flex items-center gap-1">
          {lastMsg && lastMsg.sender_id === currentUserId && (
            <span className={`status-${lastMsg.status} text-xs`} />
          )}
          <p className="text-sm text-tg-muted truncate">{preview}</p>
        </div>
      </div>
    </div>
  );
}
