"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { DebugPanel } from "./DebugPanel";
import type { ChatContext, ChatMessage, DebugInfo } from "@/types";

interface ChatContainerProps {
  context: ChatContext;
}

export function ChatContainer({ context }: ChatContainerProps) {
  const [debugExpanded, setDebugExpanded] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const {
    messages,
    isLoading,
    error,
    lastDebug,
    sessionId,
    sendUserMessage,
    resetSession,
    startNewChat,
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

  const handleNewChat = async () => {
    if (window.confirm("Start a new chat? This will delete the current conversation and test contact from the CRM.")) {
      await startNewChat();
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
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
        onNewChat={context.testMode ? handleNewChat : undefined}
        onReport={context.testMode ? handleReport : undefined}
      />

      {/* Report Modal - placeholder for now */}
      {showReportModal && (
        <ReportModal
          sessionId={sessionId}
          messages={messages}
          lastDebug={lastDebug}
          onClose={() => setShowReportModal(false)}
        />
      )}

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

// Simple Report Modal component
interface ReportModalProps {
  sessionId: string | null;
  messages: ChatMessage[];
  lastDebug: DebugInfo | null;
  onClose: () => void;
}

function ReportModal({ sessionId, messages, lastDebug, onClose }: ReportModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) return;

    setIsSubmitting(true);

    // For now, just log to console - backend will be added later
    console.log("Report submitted:", {
      sessionId,
      comment,
      messageCount: messages.length,
      lastDebug,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsSubmitting(false);
    setSubmitted(true);

    // Close after showing success
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Report Issue</h2>
            <p className="text-sm text-muted-foreground">
              This conversation will be preserved for review.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium">Report submitted!</p>
            <p className="text-xs text-muted-foreground">Thank you for your feedback.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">What went wrong?</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the issue you encountered..."
                className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Auto-captured:</strong> {messages.length} messages, session {sessionId?.slice(0, 8)}...
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
