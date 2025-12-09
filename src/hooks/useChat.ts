"use client";

import { useState, useCallback } from "react";
import { sendMessage } from "@/lib/api";
import type { ChatMessage } from "@/types";

interface UseChatOptions {
  locationId: string;
  contactId: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendUserMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat({ locationId, contactId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !locationId || !contactId) return;

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
    [locationId, contactId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendUserMessage,
    clearMessages,
  };
}
