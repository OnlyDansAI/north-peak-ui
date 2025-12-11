"use client";

import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  status?: "online" | "offline" | "connecting";
  className?: string;
  onReset?: () => void;
  onNewChat?: () => void;
  onReport?: () => void;
}

export function ChatHeader({
  title = "AI Assistant",
  subtitle,
  status = "online",
  className,
  onReset,
  onNewChat,
  onReport,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center gap-3 p-4 border-b bg-background",
        className
      )}
    >
      {/* Avatar/Logo */}
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
        AI
      </div>

      {/* Title & Status */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* New Chat button */}
      {onNewChat && (
        <button
          onClick={onNewChat}
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-1"
          title="Start new chat (deletes current conversation)"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">New</span>
        </button>
      )}

      {/* Report Issue button */}
      {onReport && (
        <button
          onClick={onReport}
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
          title="Report an issue with this conversation"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
        </button>
      )}

      {/* Reset button (only in test mode) */}
      {onReset && (
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Reset conversation"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            status === "online" && "bg-green-500",
            status === "offline" && "bg-red-500",
            status === "connecting" && "bg-yellow-500 animate-pulse"
          )}
        />
        <span className="text-xs text-muted-foreground capitalize">
          {status}
        </span>
      </div>
    </header>
  );
}
