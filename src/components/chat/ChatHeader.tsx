"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  status?: "online" | "offline" | "connecting";
  className?: string;
  onReset?: () => void;
  onNewChat?: () => void;
  onReport?: () => void;
  showSettings?: boolean;
}

export function ChatHeader({
  title = "AI Assistant",
  subtitle,
  status = "online",
  className,
  onReset,
  onNewChat,
  onReport,
  showSettings = true,
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

      {/* Settings button */}
      {showSettings && (
        <Link
          href="/settings"
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Settings"
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
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
