"use client";

import { useState, useCallback, useEffect } from "react";
import { sendMessage, sendTestMessage, createTestSession, resetTestSession } from "@/lib/api";
import type { ChatMessage, DebugInfo } from "@/types";

interface UseChatOptions {
  locationId: string;
  contactId?: string;
  // Test mode options
  testMode?: boolean;
  sessionId?: string;
  userEmail?: string;
  userName?: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  lastDebug: DebugInfo | null;
  sessionId: string | null;
  sendUserMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  resetSession: () => Promise<void>;
}

export function useChat({
  locationId,
  contactId,
  testMode = false,
  sessionId: initialSessionId,
  userEmail,
  userName,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDebug, setLastDebug] = useState<DebugInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize test session if in test mode
  useEffect(() => {
    if (testMode && !sessionId && !isInitializing && locationId) {
      setIsInitializing(true);
      createTestSession({
        locationId,
        testContactName: userName || "Test User",
        userEmail,
      })
        .then((session) => {
          setSessionId(session.session_id);
          setIsInitializing(false);
        })
        .catch((err) => {
          setError(`Failed to create test session: ${err.message}`);
          setIsInitializing(false);
        });
    }
  }, [testMode, sessionId, locationId, userName, userEmail, isInitializing]);

  const sendUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !locationId) return;
      if (testMode && !sessionId) {
        setError("Test session not initialized");
        return;
      }
      if (!testMode && !contactId) {
        setError("Contact ID required for non-test mode");
        return;
      }

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Add loading placeholder for assistant
      const loadingMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        if (testMode && sessionId) {
          // Test mode - use test session API
          const response = await sendTestMessage(sessionId, content);

          // Store debug info
          setLastDebug(response.debug);

          // Replace loading message with actual response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: response.reply || "I understand. Let me help you with that.",
                    isLoading: false,
                    debug: response.debug,
                  }
                : msg
            )
          );
        } else if (contactId) {
          // Real contact mode - use regular message API
          const response = await sendMessage(contactId, locationId, content);

          // Replace loading message with actual response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: response.reply || "I understand. Let me help you with that.",
                    isLoading: false,
                  }
                : msg
            )
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);

        // Replace loading message with error state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessage.id
              ? {
                  ...msg,
                  content: "Sorry, I encountered an error. Please try again.",
                  isLoading: false,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [locationId, contactId, testMode, sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastDebug(null);
  }, []);

  const resetSession = useCallback(async () => {
    if (!testMode || !sessionId) return;

    try {
      await resetTestSession(sessionId);
      setMessages([]);
      setError(null);
      setLastDebug(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset session";
      setError(errorMessage);
    }
  }, [testMode, sessionId]);

  return {
    messages,
    isLoading,
    error,
    lastDebug,
    sessionId,
    sendUserMessage,
    clearMessages,
    resetSession,
  };
}
