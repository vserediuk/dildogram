import dayjs from "dayjs";

export default function MessageBubble({ message, isOwn }) {
  const time = dayjs(message.created_at).format("HH:mm");

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-tg-bubble-own rounded-br-md"
            : "bg-tg-sidebar rounded-bl-md"
        }`}
      >
        {/* Sender name for group chats */}
        {!isOwn && message.sender && (
          <div className="text-tg-blue text-xs font-semibold mb-0.5">
            {message.sender.display_name || message.sender.phone}
          </div>
        )}

        <div className="flex items-end gap-2">
          <span className="break-words whitespace-pre-wrap">{message.content}</span>
          <span className="flex items-center gap-0.5 flex-shrink-0 self-end">
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
