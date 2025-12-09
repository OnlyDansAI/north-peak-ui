"use client";

import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  status?: "online" | "offline" | "connecting";
  className?: string;
}

export function ChatHeader({
  title = "North Peak AI",
  subtitle,
  status = "online",
  className,
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
        NP
      </div>

      {/* Title & Status */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

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
