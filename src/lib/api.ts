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
