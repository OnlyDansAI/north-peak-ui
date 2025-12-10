"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getLocationSettings,
  getLocationCalendars,
  updateLocationSettings,
  resolveIds,
  type LocationSettings,
  type Calendar,
} from "@/lib/api";
import { isInGHLIframe, authenticateWithGHL } from "@/lib/sso";

// Fallback GHL location ID for demo/test mode (Snapshot location)
const FALLBACK_GHL_LOCATION_ID = "ojKtYYUFbTKUmDCA5KUH";

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    assistant_name: "",
    business_name: "",
    business_type: "",
    calendar_id: "",
    timezone: "",
  });

  // Initialize - resolve location ID
  useEffect(() => {
    async function initializeLocation() {
      setIsLoading(true);
      setError(null);

      // Check URL params first
      const urlLocationId = searchParams.get("location_id");
      const ghlLocationId = searchParams.get("ghl_location_id") || searchParams.get("locationId");

      if (urlLocationId) {
        setLocationId(urlLocationId);
        return;
      }

      if (ghlLocationId) {
        try {
          const resolved = await resolveIds({ ghl_location_id: ghlLocationId });
          if (resolved.location?.id) {
            setLocationId(resolved.location.id);
            return;
          }
        } catch (err) {
          console.error("Failed to resolve GHL location:", err);
        }
      }

      // Try SSO
      if (isInGHLIframe()) {
        try {
          const userData = await authenticateWithGHL();
          if (userData.activeLocation) {
            const resolved = await resolveIds({ ghl_location_id: userData.activeLocation });
            if (resolved.location?.id) {
              setLocationId(resolved.location.id);
              return;
            }
          }
        } catch (err) {
          console.warn("GHL SSO failed:", err);
        }
      }

      // Fall back to demo location
      try {
        const resolved = await resolveIds({ ghl_location_id: FALLBACK_GHL_LOCATION_ID });
        if (resolved.location?.id) {
          setLocationId(resolved.location.id);
        } else {
          setError("Could not resolve demo location");
        }
      } catch (err) {
        setError("Failed to initialize location");
      }
    }

    initializeLocation();
  }, [searchParams]);

  // Load settings and calendars when location is resolved
  useEffect(() => {
    if (!locationId) return;

    // Capture locationId as non-null for use in async function
    const locId = locationId;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [settingsData, calendarsData] = await Promise.all([
          getLocationSettings(locId),
          getLocationCalendars(locId),
        ]);

        setSettings(settingsData);
        setCalendars(calendarsData.calendars || []);

        // Initialize form with current values
        setFormData({
          assistant_name: settingsData.assistant_name || "",
          business_name: settingsData.business_name || "",
          business_type: settingsData.business_type || "",
          calendar_id: settingsData.calendar_id || "",
          timezone: settingsData.timezone || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateLocationSettings(locationId, {
        assistant_name: formData.assistant_name || undefined,
        business_name: formData.business_name || undefined,
        business_type: formData.business_type || undefined,
        calendar_id: formData.calendar_id || undefined,
        timezone: formData.timezone || undefined,
      });

      // Merge response with existing settings to preserve fields not in response
      setSettings((prev) => prev ? { ...prev, ...updated } : updated as unknown as LocationSettings);
      setSuccess("Settings saved successfully!");

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <div className="text-destructive font-semibold">Error</div>
        <div className="text-muted-foreground text-center max-w-md">{error}</div>
        <Link href="/chat">
          <Button variant="outline">Go to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">North Peak AI Settings</h1>
          <nav className="flex gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm">Chat</Button>
            </Link>
            <Button variant="ghost" size="sm" disabled>Settings</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-green-500/10 text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Location Info */}
          {settings && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={settings.ai_enabled ? "text-green-600" : "text-yellow-600"}>
                  {settings.ai_enabled ? "AI Enabled" : "AI Disabled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CRM:</span>
                <span>{settings.crm_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected:</span>
                <span>{settings.has_tokens ? "Yes" : "No"}</span>
              </div>
            </div>
          )}

          {/* Assistant Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Assistant</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="assistant_name">
                Assistant Name
              </label>
              <Input
                id="assistant_name"
                placeholder="e.g., Alex, Sarah"
                value={formData.assistant_name}
                onChange={(e) => setFormData({ ...formData, assistant_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The name your AI assistant will use when talking to customers
              </p>
            </div>
          </div>

          {/* Business Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Business</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="business_name">
                Business Name
              </label>
              <Input
                id="business_name"
                placeholder="e.g., North Peak Life Insurance"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="business_type">
                Business Type
              </label>
              <Select
                id="business_type"
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              >
                <option value="">Select type...</option>
                <option value="insurance">Insurance</option>
                <option value="dental">Dental</option>
                <option value="medical">Medical</option>
                <option value="fitness">Fitness</option>
                <option value="real_estate">Real Estate</option>
                <option value="legal">Legal</option>
                <option value="financial">Financial Services</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </div>

          {/* Calendar Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Booking Calendar</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="calendar_id">
                Calendar for Appointments
              </label>
              <Select
                id="calendar_id"
                value={formData.calendar_id}
                onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
              >
                <option value="">Select calendar...</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </Select>
              {calendars.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No calendars found. Make sure you have calendars set up in your CRM.
                </p>
              )}
              {formData.calendar_id && (
                <p className="text-xs text-muted-foreground">
                  Current: {formData.calendar_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="timezone">
                Timezone
              </label>
              <Select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <option value="">Select timezone...</option>
                <option value="America/New_York">Eastern (New York)</option>
                <option value="America/Chicago">Central (Chicago)</option>
                <option value="America/Denver">Mountain (Denver)</option>
                <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                <option value="America/Phoenix">Arizona (Phoenix)</option>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            <Link href="/chat">
              <Button type="button" variant="outline">
                Back to Chat
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
