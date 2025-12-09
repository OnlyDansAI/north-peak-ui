"use client";

import { useChat } from "@/hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatContext } from "@/types";

interface ChatContainerProps {
  context: ChatContext;
}

export function ChatContainer({ context }: ChatContainerProps) {
  const { messages, isLoading, error, sendUserMessage } = useChat({
    locationId: context.locationId,
    contactId: context.contactId,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        title={context.locationName || "North Peak AI"}
        subtitle={context.contactName || "Chat Assistant"}
        status={error ? "offline" : isLoading ? "connecting" : "online"}
      />

      <MessageList messages={messages} />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <ChatInput
        onSend={sendUserMessage}
        disabled={isLoading}
        placeholder={isLoading ? "Waiting for response..." : "Type a message..."}
      />
    </div>
  );
}
