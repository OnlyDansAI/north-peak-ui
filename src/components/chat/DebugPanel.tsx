"use client";

import type { DebugInfo } from "@/types";

interface DebugPanelProps {
  debug: DebugInfo | null;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DebugPanel({ debug, isExpanded, onToggle }: DebugPanelProps) {
  if (!debug) {
    return null;
  }

  const confidenceColor =
    debug.route_confidence && debug.route_confidence >= 0.8
      ? "text-green-600"
      : debug.route_confidence && debug.route_confidence >= 0.5
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="border-t border-border bg-muted/30">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-between"
      >
        <span>Debug Info</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          {/* Route & Confidence */}
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-muted-foreground">Route:</span>{" "}
              <span className="font-mono font-medium">
                {debug.route_name || "unknown"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span>{" "}
              <span className={`font-mono font-medium ${confidenceColor}`}>
                {debug.route_confidence
                  ? `${(debug.route_confidence * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Tools Called */}
          {debug.tools_called && debug.tools_called.length > 0 && (
            <div>
              <span className="text-muted-foreground">Tools:</span>{" "}
              <span className="font-mono text-xs">
                {debug.tools_called.join(", ")}
              </span>
            </div>
          )}

          {/* Goal Status */}
          {debug.goal_achieved && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-600 font-medium">
                Goal achieved: {debug.goal_type || "primary"}
              </span>
            </div>
          )}

          {/* Processing Time */}
          {debug.processing_time_ms && (
            <div className="text-xs text-muted-foreground">
              Processing time: {debug.processing_time_ms}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
