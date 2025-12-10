import type { MessageResponse, ResolveResponse, TestSession, TestMessageResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Send a message to the AI and get a response.
 * (Legacy - for real contact conversations)
 */
export async function sendMessage(
  contactId: string,
  locationId: string,
  message: string
): Promise<MessageResponse> {
  const response = await fetch(`${API_URL}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contact_uuid: contactId,
      location_id: locationId,
      channel: "chat",
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Resolve GHL IDs to our internal UUIDs.
 */
export async function resolveIds(params: {
  ghl_location_id?: string;
  ghl_contact_id?: string;
  location_id?: string;
}): Promise<ResolveResponse> {
  const searchParams = new URLSearchParams();
  if (params.ghl_location_id) searchParams.set("ghl_location_id", params.ghl_location_id);
  if (params.ghl_contact_id) searchParams.set("ghl_contact_id", params.ghl_contact_id);
  if (params.location_id) searchParams.set("location_id", params.location_id);

  const response = await fetch(`${API_URL}/lookup/resolve?${searchParams}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check API health.
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error("API unavailable");
  }
  return response.json();
}

// ==========================================
// TEST SESSION API
// ==========================================

/**
 * Create a new test chat session.
 */
export async function createTestSession(params: {
  locationId: string;
  channel?: string;
  name?: string;
  testContactName?: string;
  userId?: string;
  userEmail?: string;
}): Promise<TestSession> {
  const response = await fetch(`${API_URL}/chat/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      location_id: params.locationId,
      channel: params.channel || "chat",
      name: params.name,
      test_contact_name: params.testContactName || "Test User",
      user_id: params.userId,
      user_email: params.userEmail,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Send a test message and get AI response with debug info.
 */
export async function sendTestMessage(
  sessionId: string,
  message: string,
  routeOverride?: string
): Promise<TestMessageResponse> {
  const response = await fetch(`${API_URL}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      route_override: routeOverride,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Reset a test session (clear message history).
 */
export async function resetTestSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/session/${sessionId}/reset`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
}

/**
 * End a test session.
 */
export async function endTestSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/session/${sessionId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
}

/**
 * Undo the last message exchange in a test session.
 */
export async function undoLastMessage(sessionId: string): Promise<{ messages_removed: number }> {
  const response = await fetch(`${API_URL}/chat/session/${sessionId}/undo`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ==========================================
// LOCATION SETTINGS API
// ==========================================

export interface LocationSettings {
  location_id: string;
  crm_type: string;
  crm_location_id: string;
  status: string;
  ai_enabled: boolean;
  has_tokens: boolean;
  calendar_id: string | null;
  timezone: string | null;
  assistant_name: string | null;
  assistant_persona: string | null;
  business_name: string | null;
  business_type: string | null;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
}

export interface UpdateSettingsRequest {
  assistant_name?: string;
  assistant_persona?: string;
  business_name?: string;
  business_type?: string;
  calendar_id?: string;
  timezone?: string;
}

/**
 * Get location status and settings.
 */
export async function getLocationSettings(locationId: string): Promise<LocationSettings> {
  const response = await fetch(`${API_URL}/locations/${locationId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Update location settings.
 */
export async function updateLocationSettings(
  locationId: string,
  settings: UpdateSettingsRequest
): Promise<LocationSettings> {
  const response = await fetch(`${API_URL}/locations/${locationId}/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get available calendars for a location.
 */
export async function getLocationCalendars(
  locationId: string
): Promise<{ location_id: string; calendars: Calendar[] }> {
  const response = await fetch(`${API_URL}/locations/${locationId}/calendars`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}
