"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sendMessage, sendTestMessage, createTestSession, resetTestSession } from "@/lib/api";
import type { ChatMessage, DebugInfo } from "@/types";

// localStorage keys
const STORAGE_KEY_PREFIX = "north_peak_chat_";
const STORAGE_SESSION_KEY = "north_peak_current_session";

interface UseChatOptions {
  locationId: string;
  contactId?: string;
  // Test mode options
  testMode?: boolean;
  sessionId?: string;
  userEmail?: string;
  userName?: string;
  // Shadow mode - use existing contact (recommended for demos)
  existingContactId?: string;
  existingGhlContactId?: string;
  // Create mode - create real GHL contact
  createTestContact?: boolean;
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
  startNewChat: () => Promise<void>;
}

// Helper to serialize messages for localStorage
function serializeMessages(messages: ChatMessage[]): string {
  return JSON.stringify(messages.map(m => ({
    ...m,
    timestamp: m.timestamp.toISOString(),
  })));
}

// Helper to deserialize messages from localStorage
function deserializeMessages(json: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(json);
    return parsed.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    }));
  } catch {
    return [];
  }
}

export function useChat({
  locationId,
  contactId,
  testMode = false,
  sessionId: initialSessionId,
  userEmail,
  userName,
  existingContactId,
  existingGhlContactId,
  createTestContact = false,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDebug, setLastDebug] = useState<DebugInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const hasRestoredMessages = useRef(false);

  // Try to restore existing session from localStorage on mount
  useEffect(() => {
    if (testMode && !sessionId && !isInitializing && locationId && !hasRestoredMessages.current) {
      hasRestoredMessages.current = true;

      // Check if we have a saved session for this location
      const savedSessionId = localStorage.getItem(`${STORAGE_SESSION_KEY}_${locationId}`);

      if (savedSessionId) {
        // Restore session ID (even if no messages yet)
        setSessionId(savedSessionId);

        // Try to restore messages too
        const savedMessages = localStorage.getItem(`${STORAGE_KEY_PREFIX}${savedSessionId}`);
        if (savedMessages) {
          const restored = deserializeMessages(savedMessages);
          if (restored.length > 0) {
            setMessages(restored);
          }
        }
        return; // Don't create a new session - use existing one
      }

      // No saved session, create a new one
      setIsInitializing(true);
      createTestSession({
        locationId,
        testContactName: userName || "Test User",
        userEmail,
        // Shadow mode - use existing contact
        existingContactId,
        existingGhlContactId,
        // Create mode - create real GHL contact
        createTestContact,
      })
        .then((session) => {
          setSessionId(session.session_id);
          // Save session ID for this location
          localStorage.setItem(`${STORAGE_SESSION_KEY}_${locationId}`, session.session_id);
          setIsInitializing(false);
        })
        .catch((err) => {
          setError(`Failed to create test session: ${err.message}`);
          setIsInitializing(false);
        });
    }
  }, [testMode, sessionId, locationId, userName, userEmail, isInitializing, existingContactId, existingGhlContactId, createTestContact]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, serializeMessages(messages));
    }
  }, [sessionId, messages]);

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
      // Clear localStorage for this session
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset session";
      setError(errorMessage);
    }
  }, [testMode, sessionId]);

  // Start a completely new chat - deletes old session and creates fresh one
  const startNewChat = useCallback(async () => {
    if (!testMode || !locationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clean up old session if exists
      if (sessionId) {
        // Clear localStorage for old session
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);

        // Try to end old session on backend (best effort)
        try {
          await resetTestSession(sessionId);
        } catch {
          // Ignore errors ending old session
        }
      }

      // Clear current state
      setMessages([]);
      setLastDebug(null);
      setSessionId(null);

      // Create new session
      const session = await createTestSession({
        locationId,
        testContactName: userName || "Test User",
        userEmail,
        // Shadow mode - use existing contact
        existingContactId,
        existingGhlContactId,
        // Create mode - create real GHL contact
        createTestContact,
      });

      setSessionId(session.session_id);
      localStorage.setItem(`${STORAGE_SESSION_KEY}_${locationId}`, session.session_id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start new chat";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [testMode, locationId, sessionId, userName, userEmail, existingContactId, existingGhlContactId, createTestContact]);

  return {
    messages,
    isLoading,
    error,
    lastDebug,
    sessionId,
    sendUserMessage,
    clearMessages,
    resetSession,
    startNewChat,
  };
}
