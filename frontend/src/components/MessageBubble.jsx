import dayjs from "dayjs";
import { mediaUrl } from "../utils";

export default function MessageBubble({ message, isOwn }) {
  const time = dayjs(message.created_at).format("HH:mm");
  const hasImage = !!message.image_url;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[70%] ${hasImage ? "p-1" : "px-3 py-2"} rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-tg-bubble-own rounded-br-md"
            : "bg-tg-sidebar rounded-bl-md"
        }`}
      >
        {/* Sender name for group chats */}
        {!isOwn && message.sender && (
          <div className={`text-tg-blue text-xs font-semibold mb-0.5 ${hasImage ? "px-2 pt-1" : ""}`}>
            {message.sender.display_name || message.sender.phone}
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
      </div>
    </div>
  );
}
