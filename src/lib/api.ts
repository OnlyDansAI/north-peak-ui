import type { MessageResponse, ResolveResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Send a message to the AI and get a response.
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
