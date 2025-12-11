"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getLocationSettings,
  updateLocationSettings,
  getLocationCalendars,
  syncLocationFromGHL,
  type Calendar,
} from "@/lib/api";
import type { ChatMessage, DebugInfo } from "@/types";

interface LocationSidebarProps {
  locationId: string;
  // Debug props
  debug: DebugInfo | null;
  messages: ChatMessage[];
  sessionId: string | null;
}

type ViewMode = "settings" | "debug";

interface LocationFormData {
  ai_agent_name: string;
  human_agent_name: string;
  // Business/location info - {{location.*}}
  business_name: string;
  business_email: string;
  business_phone: string;
  // Location owner info - {{location_owner.*}}
  location_owner_name: string;
  location_owner_email: string;
  location_owner_phone: string;
  // Other settings
  calendar_id: string;
  timezone: string;
}

export function LocationSidebar({
  locationId,
  debug,
  messages,
  sessionId,
}: LocationSidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("settings");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Location data
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [formData, setFormData] = useState<LocationFormData>({
    ai_agent_name: "",
    human_agent_name: "",
    business_name: "",
    business_email: "",
    business_phone: "",
    location_owner_name: "",
    location_owner_email: "",
    location_owner_phone: "",
    calendar_id: "",
    timezone: "",
  });
  const [originalData, setOriginalData] = useState<LocationFormData | null>(null);

  // Load location settings and calendars
  const loadData = useCallback(async () => {
    if (!locationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [settings, calendarData] = await Promise.all([
        getLocationSettings(locationId),
        getLocationCalendars(locationId),
      ]);

      const data: LocationFormData = {
        ai_agent_name: settings.ai_agent_name || "",
        human_agent_name: settings.human_agent_name || "",
        business_name: settings.business_name || "",
        business_email: settings.business_email || "",
        business_phone: settings.business_phone || "",
        location_owner_name: settings.location_owner_name || "",
        location_owner_email: settings.location_owner_email || "",
        location_owner_phone: settings.location_owner_phone || "",
        calendar_id: settings.calendar_id || "",
        timezone: settings.timezone || "",
      };

      setFormData(data);
      setOriginalData(data);
      setCalendars(calendarData.calendars || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Check if form has changes
  const hasChanges = originalData && (
    formData.ai_agent_name !== originalData.ai_agent_name ||
    formData.human_agent_name !== originalData.human_agent_name ||
    formData.business_name !== originalData.business_name ||
    formData.business_email !== originalData.business_email ||
    formData.business_phone !== originalData.business_phone ||
    formData.location_owner_name !== originalData.location_owner_name ||
    formData.location_owner_email !== originalData.location_owner_email ||
    formData.location_owner_phone !== originalData.location_owner_phone ||
    formData.calendar_id !== originalData.calendar_id ||
    formData.timezone !== originalData.timezone
  );

  // Save settings
  const handleSave = async () => {
    if (!locationId || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateLocationSettings(locationId, {
        assistant_name: formData.ai_agent_name || undefined,
        human_agent_name: formData.human_agent_name || undefined,
        business_name: formData.business_name || undefined,
        business_email: formData.business_email || undefined,
        business_phone: formData.business_phone || undefined,
        location_owner_name: formData.location_owner_name || undefined,
        location_owner_email: formData.location_owner_email || undefined,
        location_owner_phone: formData.location_owner_phone || undefined,
        calendar_id: formData.calendar_id || undefined,
        timezone: formData.timezone || undefined,
      });

      setOriginalData({ ...formData });
      const ghlStatus = result.ghl_sync === "synced" ? " (synced to GHL)" : "";
      setSuccess(`Settings saved!${ghlStatus}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Sync from GHL
  const handleSyncFromGHL = async () => {
    if (!locationId) return;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncLocationFromGHL(locationId);

      // Update form data with synced values
      const newData: LocationFormData = {
        ...formData,
        business_name: result.synced_data.business_name || "",
        business_email: result.synced_data.business_email || "",
        business_phone: result.synced_data.business_phone || "",
        location_owner_name: result.synced_data.location_owner_name || "",
        location_owner_email: result.synced_data.location_owner_email || "",
        location_owner_phone: result.synced_data.location_owner_phone || "",
        timezone: result.synced_data.timezone || formData.timezone,
      };

      setFormData(newData);
      setOriginalData(newData);
      setSuccess("Synced from GHL!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync from GHL");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header with toggle */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("settings")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              viewMode === "settings"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Settings
          </button>
          <button
            onClick={() => setViewMode("debug")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              viewMode === "debug"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Debug
          </button>
        </div>
        {viewMode === "settings" && hasChanges && (
          <span className="text-xs text-orange-500">Unsaved</span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "settings" ? (
          <SettingsView
            formData={formData}
            setFormData={setFormData}
            calendars={calendars}
            isLoading={isLoading}
            error={error}
            success={success}
            onSyncFromGHL={handleSyncFromGHL}
            isSyncing={isSyncing}
          />
        ) : (
          <DebugView
            debug={debug}
            messages={messages}
            sessionId={sessionId}
          />
        )}
      </div>

      {/* Footer with save button (settings mode only) */}
      {viewMode === "settings" && (
        <div className="p-3 border-t">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              "w-full py-2 text-sm font-medium rounded-md transition-colors",
              hasChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SETTINGS VIEW
// ==========================================

interface SettingsViewProps {
  formData: LocationFormData;
  setFormData: (data: LocationFormData) => void;
  calendars: Calendar[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  onSyncFromGHL: () => void;
  isSyncing: boolean;
}

function SettingsView({
  formData,
  setFormData,
  calendars,
  isLoading,
  error,
  success,
  onSyncFromGHL,
  isSyncing,
}: SettingsViewProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status messages */}
      {error && (
        <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 rounded bg-green-500/10 text-green-600 text-xs">
          {success}
        </div>
      )}

      {/* AI Config Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          AI Configuration
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium">AI Agent Name</label>
          <input
            type="text"
            value={formData.ai_agent_name}
            onChange={(e) => setFormData({ ...formData, ai_agent_name: e.target.value })}
            placeholder="e.g., Lucy, Sarah, Alex"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            How the AI introduces itself
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Human Agent Name</label>
          <input
            type="text"
            value={formData.human_agent_name}
            onChange={(e) => setFormData({ ...formData, human_agent_name: e.target.value })}
            placeholder="e.g., Dan, Support Team"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Who to hand off to for escalations
          </p>
        </div>
      </div>

      {/* Business Info Section (Location Settings) */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Business Info
          </h3>
          <button
            onClick={onSyncFromGHL}
            disabled={isSyncing}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync from GHL"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Maps to GHL {"{{location.*}}"} variables
        </p>

        <div className="space-y-1">
          <label className="text-xs font-medium">Business Name</label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            placeholder="e.g., North Peak Insurance"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Business Email</label>
          <input
            type="email"
            value={formData.business_email}
            onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
            placeholder="e.g., info@northpeak.com"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Business Phone</label>
          <input
            type="tel"
            value={formData.business_phone}
            onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
            placeholder="e.g., +1 555-123-4567"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Location Owner Section */}
      <div className="space-y-3 pt-2 border-t">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Location Owner
        </h3>
        <p className="text-xs text-muted-foreground -mt-1">
          Maps to GHL {"{{location_owner.*}}"} variables
        </p>

        <div className="space-y-1">
          <label className="text-xs font-medium">Owner Name</label>
          <input
            type="text"
            value={formData.location_owner_name}
            onChange={(e) => setFormData({ ...formData, location_owner_name: e.target.value })}
            placeholder="e.g., John Smith"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Owner Email</label>
          <input
            type="email"
            value={formData.location_owner_email}
            onChange={(e) => setFormData({ ...formData, location_owner_email: e.target.value })}
            placeholder="e.g., owner@northpeak.com"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Owner Phone</label>
          <input
            type="tel"
            value={formData.location_owner_phone}
            onChange={(e) => setFormData({ ...formData, location_owner_phone: e.target.value })}
            placeholder="e.g., +1 555-987-6543"
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Booking Section */}
      <div className="space-y-3 pt-2 border-t">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Booking Calendar
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium">
            Calendar
            {!formData.calendar_id && (
              <span className="text-orange-500 ml-1">(Required)</span>
            )}
          </label>
          <select
            value={formData.calendar_id}
            onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
            className={cn(
              "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
              !formData.calendar_id && "border-orange-300"
            )}
          >
            <option value="">Select a calendar...</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
          {calendars.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No calendars found. Create one in your CRM first.
            </p>
          )}
          {!formData.calendar_id && calendars.length > 0 && (
            <p className="text-xs text-orange-500">
              Select a calendar to enable appointment booking
            </p>
          )}
        </div>
      </div>

      {/* Timezone Section */}
      <div className="space-y-3 pt-2 border-t">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Location Settings
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-medium">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select timezone...</option>
            <option value="America/New_York">Eastern (New York)</option>
            <option value="America/Chicago">Central (Chicago)</option>
            <option value="America/Denver">Mountain (Denver)</option>
            <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
            <option value="America/Phoenix">Arizona (Phoenix)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DEBUG VIEW
// ==========================================

interface DebugViewProps {
  debug: DebugInfo | null;
  messages: ChatMessage[];
  sessionId: string | null;
}

function DebugView({ debug, messages, sessionId }: DebugViewProps) {
  const [copied, setCopied] = useState(false);

  const copyDebugLog = () => {
    const log = formatDebugLogForAI(messages, debug, sessionId);
    navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Session info */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Session
        </h3>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session ID:</span>
            <code className="bg-muted px-1 rounded">{sessionId?.slice(0, 8) || "—"}...</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Messages:</span>
            <span>{messages.length}</span>
          </div>
        </div>
      </div>

      {/* Last response debug */}
      {debug && (
        <div className="space-y-2 pt-2 border-t">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Last Response
          </h3>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route:</span>
              <span className="font-medium">{debug.route_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={cn(
                "font-medium",
                (debug.route_confidence || 0) >= 0.8 ? "text-green-600" :
                (debug.route_confidence || 0) >= 0.5 ? "text-yellow-600" : "text-red-600"
              )}>
                {debug.route_confidence ? `${(debug.route_confidence * 100).toFixed(0)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latency:</span>
              <span>{debug.processing_time_ms ? `${debug.processing_time_ms}ms` : "—"}</span>
            </div>
            {debug.tools_called && debug.tools_called.length > 0 && (
              <div>
                <span className="text-muted-foreground">Tools:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {debug.tools_called.map((tool: string, i: number) => (
                    <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {debug.goal_achieved && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal:</span>
                <span className="text-green-600">{debug.goal_type || "Achieved"}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy button */}
      <div className="pt-2 border-t">
        <button
          onClick={copyDebugLog}
          className="w-full py-2 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
        >
          {copied ? "Copied!" : "Copy Debug Log for AI"}
        </button>
      </div>
    </div>
  );
}

// Format debug log for AI assistance
function formatDebugLogForAI(
  messages: ChatMessage[],
  debug: DebugInfo | null,
  sessionId: string | null
): string {
  const lines: string[] = [
    "=== Debug Log for AI Assistant ===",
    "",
    `Session ID: ${sessionId || "unknown"}`,
    `Total Messages: ${messages.length}`,
    "",
  ];

  if (debug) {
    lines.push("--- Last Response Debug ---");
    lines.push(`Route: ${debug.route_name || "unknown"}`);
    lines.push(`Confidence: ${debug.route_confidence ? `${(debug.route_confidence * 100).toFixed(1)}%` : "unknown"}`);
    lines.push(`Latency: ${debug.processing_time_ms || "unknown"}ms`);
    if (debug.tools_called?.length) {
      lines.push(`Tools Called: ${debug.tools_called.join(", ")}`);
    }
    if (debug.goal_achieved) {
      lines.push(`Goal: ${debug.goal_type || "Achieved"}`);
    }
    lines.push("");
  }

  lines.push("--- Conversation ---");
  messages.forEach((msg, i) => {
    const role = msg.role === "user" ? "USER" : "ASSISTANT";
    lines.push(`[${i + 1}] ${role}: ${msg.content}`);
  });

  return lines.join("\n");
}
