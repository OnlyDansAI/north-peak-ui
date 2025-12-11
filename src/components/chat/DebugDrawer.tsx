"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage, DebugInfo } from "@/types";

interface TestContactFields {
  name: string;
  email: string;
  phone: string;
  timezone: string;
}

interface DebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debug: DebugInfo | null;
  messages: ChatMessage[];
  sessionId: string | null;
  testContact?: TestContactFields;
  onTestContactChange?: (fields: TestContactFields) => void;
}

export function DebugDrawer({
  isOpen,
  onClose,
  debug,
  messages,
  sessionId,
  testContact,
  onTestContactChange,
}: DebugDrawerProps) {
  const [activeTab, setActiveTab] = useState<"current" | "history" | "contact">("current");
  const [editableContact, setEditableContact] = useState<TestContactFields>(
    testContact || { name: "Test User", email: "", phone: "", timezone: "America/Denver" }
  );
  const [copied, setCopied] = useState(false);

  // Calculate collected data from messages
  const collectedData = extractCollectedData(messages);

  // Copy full debug log for AI debugging
  const copyDebugLog = async () => {
    const log = formatDebugLogForAI(messages, debug, sessionId, editableContact);
    try {
      await navigator.clipboard.writeText(log);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const confidenceColor = (confidence: number | null) => {
    if (!confidence) return "text-muted-foreground";
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const handleContactChange = (field: keyof TestContactFields, value: string) => {
    const updated = { ...editableContact, [field]: value };
    setEditableContact(updated);
    onTestContactChange?.(updated);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-background border-l shadow-xl z-50",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BugIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Debug Panel</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyDebugLog}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                copied
                  ? "bg-green-100 text-green-700"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Copy full debug log for AI debugging"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5" />
                  <span>Copy Log</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: "current", label: "Current" },
            { id: "history", label: "History" },
            { id: "contact", label: "Contact" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-8rem)] p-4">
          {activeTab === "current" && (
            <CurrentDebugTab
              debug={debug}
              sessionId={sessionId}
              collectedData={collectedData}
              confidenceColor={confidenceColor}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab messages={messages} confidenceColor={confidenceColor} />
          )}

          {activeTab === "contact" && (
            <ContactTab
              contact={editableContact}
              onChange={handleContactChange}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Current debug info tab
function CurrentDebugTab({
  debug,
  sessionId,
  collectedData,
  confidenceColor,
}: {
  debug: DebugInfo | null;
  sessionId: string | null;
  collectedData: Record<string, string>;
  confidenceColor: (c: number | null) => string;
}) {
  if (!debug) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BugIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No debug info yet.</p>
        <p className="text-xs mt-1">Send a message to see debug data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {sessionId && (
        <Section title="Session">
          <DataRow label="ID" value={sessionId} mono truncate />
        </Section>
      )}

      {/* Route Info */}
      <Section title="Routing">
        <DataRow label="Route" value={debug.route_name || "unknown"} mono />
        <DataRow
          label="Confidence"
          value={debug.route_confidence ? `${(debug.route_confidence * 100).toFixed(0)}%` : "N/A"}
          className={confidenceColor(debug.route_confidence)}
        />
        {debug.intent && <DataRow label="Intent" value={debug.intent} />}
      </Section>

      {/* Tools */}
      {debug.tools_called && debug.tools_called.length > 0 && (
        <Section title="Tools Called">
          <div className="flex flex-wrap gap-1">
            {debug.tools_called.map((tool, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-muted rounded text-xs font-mono"
              >
                {tool}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Goal Status */}
      <Section title="Goal">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              debug.goal_achieved ? "bg-green-500" : "bg-muted-foreground"
            )}
          />
          <span className={debug.goal_achieved ? "text-green-600" : "text-muted-foreground"}>
            {debug.goal_achieved ? `Achieved: ${debug.goal_type || "primary"}` : "In progress"}
          </span>
        </div>
      </Section>

      {/* Performance */}
      <Section title="Performance">
        <DataRow
          label="Processing Time"
          value={debug.processing_time_ms ? `${debug.processing_time_ms}ms` : "N/A"}
        />
        {/* Future: tokens will go here once backend supports it */}
      </Section>

      {/* Collected Data */}
      {Object.keys(collectedData).length > 0 && (
        <Section title="Collected Data">
          {Object.entries(collectedData).map(([key, value]) => (
            <DataRow key={key} label={key} value={value} />
          ))}
        </Section>
      )}
    </div>
  );
}

// History tab showing all messages with their debug info
function HistoryTab({
  messages,
  confidenceColor,
}: {
  messages: ChatMessage[];
  confidenceColor: (c: number | null) => string;
}) {
  const assistantMessages = messages.filter((m) => m.role === "assistant" && m.debug);

  if (assistantMessages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No message history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assistantMessages.map((msg, i) => (
        <div key={msg.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Message {i + 1}</span>
            <span>{msg.timestamp.toLocaleTimeString()}</span>
          </div>
          <p className="text-sm line-clamp-2">{msg.content}</p>
          {msg.debug && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-muted rounded font-mono">
                {msg.debug.route_name || "unknown"}
              </span>
              <span className={cn("px-2 py-0.5 rounded", confidenceColor(msg.debug.route_confidence))}>
                {msg.debug.route_confidence
                  ? `${(msg.debug.route_confidence * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
              {msg.debug.processing_time_ms && (
                <span className="px-2 py-0.5 bg-muted rounded">
                  {msg.debug.processing_time_ms}ms
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Editable test contact tab
function ContactTab({
  contact,
  onChange,
}: {
  contact: TestContactFields;
  onChange: (field: keyof TestContactFields, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit test contact fields to simulate different scenarios.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={contact.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Test User"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            value={contact.email}
            onChange={(e) => onChange("email", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="test@example.com"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="+1 555 123 4567"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Timezone</label>
          <select
            value={contact.timezone}
            onChange={(e) => onChange("timezone", e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          >
            <option value="America/New_York">Eastern (America/New_York)</option>
            <option value="America/Chicago">Central (America/Chicago)</option>
            <option value="America/Denver">Mountain (America/Denver)</option>
            <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
            <option value="America/Phoenix">Arizona (America/Phoenix)</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Changes will apply to future messages in this test session.
      </p>
    </div>
  );
}

// Helper components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono = false,
  truncate = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          mono && "font-mono",
          truncate && "truncate max-w-[180px]",
          className
        )}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// Extract collected data from conversation (timezone, preferences, etc.)
function extractCollectedData(messages: ChatMessage[]): Record<string, string> {
  const data: Record<string, string> = {};

  // Look through messages for collected information
  // This is a simple implementation - can be enhanced based on actual data patterns
  for (const msg of messages) {
    if (msg.debug?.goal_achieved && msg.debug?.goal_type) {
      data["Last Goal"] = msg.debug.goal_type;
    }
  }

  return data;
}

// Format the entire debug log for AI debugging
function formatDebugLogForAI(
  messages: ChatMessage[],
  lastDebug: DebugInfo | null,
  sessionId: string | null,
  contact: TestContactFields
): string {
  const lines: string[] = [];

  lines.push("=== AI CHAT DEBUG LOG ===");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Session info
  lines.push("## Session Info");
  lines.push(`Session ID: ${sessionId || "N/A"}`);
  lines.push("");

  // Test contact
  lines.push("## Test Contact");
  lines.push(`Name: ${contact.name}`);
  lines.push(`Email: ${contact.email || "N/A"}`);
  lines.push(`Phone: ${contact.phone || "N/A"}`);
  lines.push(`Timezone: ${contact.timezone}`);
  lines.push("");

  // Last debug info
  if (lastDebug) {
    lines.push("## Last Response Debug");
    lines.push(`Route: ${lastDebug.route_name || "unknown"}`);
    lines.push(`Confidence: ${lastDebug.route_confidence ? `${(lastDebug.route_confidence * 100).toFixed(0)}%` : "N/A"}`);
    lines.push(`Intent: ${lastDebug.intent || "N/A"}`);
    lines.push(`Tools Called: ${lastDebug.tools_called?.length ? lastDebug.tools_called.join(", ") : "none"}`);
    lines.push(`Goal Achieved: ${lastDebug.goal_achieved ? `Yes (${lastDebug.goal_type || "primary"})` : "No"}`);
    lines.push(`Processing Time: ${lastDebug.processing_time_ms ? `${lastDebug.processing_time_ms}ms` : "N/A"}`);
    lines.push("");
  }

  // Full conversation with debug info
  lines.push("## Conversation Log");
  lines.push("");

  for (const msg of messages) {
    const role = msg.role === "user" ? "USER" : "ASSISTANT";
    const time = msg.timestamp.toLocaleTimeString();

    lines.push(`[${time}] ${role}:`);
    lines.push(msg.content);

    if (msg.debug) {
      lines.push(`  --- Debug: route=${msg.debug.route_name || "?"}, confidence=${msg.debug.route_confidence ? `${(msg.debug.route_confidence * 100).toFixed(0)}%` : "?"}, tools=[${msg.debug.tools_called?.join(", ") || ""}], time=${msg.debug.processing_time_ms || "?"}ms`);
    }
    lines.push("");
  }

  lines.push("=== END DEBUG LOG ===");

  return lines.join("\n");
}

// Icons (inline SVG to avoid additional imports)
function BugIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
