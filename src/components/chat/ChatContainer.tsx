"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { DebugPanel } from "./DebugPanel";
import type { ChatContext } from "@/types";

interface ChatContainerProps {
  context: ChatContext;
}

export function ChatContainer({ context }: ChatContainerProps) {
  const [debugExpanded, setDebugExpanded] = useState(true);

  const {
    messages,
    isLoading,
    error,
    lastDebug,
    sessionId,
    sendUserMessage,
    resetSession,
  } = useChat({
    locationId: context.locationId,
    contactId: context.contactId,
    testMode: context.testMode ?? true, // Default to test mode
    userEmail: context.contactName, // Use contact name as email for now
  });

  const handleReset = async () => {
    if (window.confirm("Reset conversation? This will clear all messages.")) {
      await resetSession();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        title={context.locationName || "AI Assistant"}
        subtitle={
          context.testMode
            ? `Test Session${sessionId ? ` (${sessionId.slice(0, 8)}...)` : ""}`
            : context.contactName || "Chat Assistant"
        }
        status={error ? "offline" : isLoading ? "connecting" : "online"}
        onReset={context.testMode ? handleReset : undefined}
      />

      <MessageList messages={messages} />

      {/* Debug Panel - only in test mode */}
      {context.testMode && (
        <DebugPanel
          debug={lastDebug}
          isExpanded={debugExpanded}
          onToggle={() => setDebugExpanded(!debugExpanded)}
        />
      )}

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <ChatInput
        onSend={sendUserMessage}
        disabled={isLoading || (!context.testMode && !context.contactId)}
        placeholder={
          isLoading
            ? "Waiting for response..."
            : !sessionId && context.testMode
            ? "Initializing test session..."
            : "Type a message..."
        }
      />
    </div>
  );
}
