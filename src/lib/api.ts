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
 * Always creates a fresh test contact in GHL.
 */
export async function createTestSession(params: {
  locationId: string;
  channel?: string;
  name?: string;
  testContactName?: string;
  createTestContact?: boolean;
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
      create_test_contact: params.createTestContact ?? true, // Always create fresh contact
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

// ==========================================
// ORG SETUP API (Super Admin Only)
// ==========================================

export interface Product {
  name: string;
  description?: string;
}

export interface OrgSettings {
  id: string;
  name: string;
  industry: string | null;
  default_timezone: string | null;
  products: Product[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgRoute {
  id: string;
  organization_id: string;
  route_name: string;
  description: string | null;
  is_entry_point: boolean;
  system_prompt: string | null;
  goals: Record<string, unknown>;
  required_fields: unknown[];
  tools_enabled: string[];
  tool_config: Record<string, unknown>;
  event_prompts: Record<string, unknown>;
  drip_config: Record<string, unknown> | null;
  route_conditions: unknown[];
  confidence_threshold: number;
  max_turns: number;
  is_active: boolean;
  priority: number;
  source?: "org" | "agent";
  created_at?: string;
  updated_at?: string;
}

export interface OrgRoutesResponse {
  organization_id: string;
  org_routes: OrgRoute[];
  agent_routes: OrgRoute[];
  all_routes: OrgRoute[];
}

export interface AvailableTool {
  name: string;
  description: string;
  category: string;
}

export interface Industry {
  value: string;
  label: string;
}

/**
 * Get organization settings (super admin only).
 */
export async function getOrgSettings(orgId: string, userEmail: string): Promise<OrgSettings> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}`, {
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Update organization settings (super admin only).
 */
export async function updateOrgSettings(
  orgId: string,
  userEmail: string,
  settings: { name?: string; industry?: string; default_timezone?: string }
): Promise<OrgSettings> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
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
 * Get products for an organization.
 */
export async function getOrgProducts(orgId: string, userEmail: string): Promise<Product[]> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/products`, {
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Add a product to an organization.
 */
export async function addOrgProduct(
  orgId: string,
  userEmail: string,
  product: Product
): Promise<{ status: string; index: number; product: Product }> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Update a product by index.
 */
export async function updateOrgProduct(
  orgId: string,
  userEmail: string,
  index: number,
  product: Product
): Promise<{ status: string; index: number; product: Product }> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/products/${index}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a product by index.
 */
export async function deleteOrgProduct(
  orgId: string,
  userEmail: string,
  index: number
): Promise<void> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/products/${index}`, {
    method: "DELETE",
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
}

/**
 * Get routes for an organization.
 */
export async function getOrgRoutes(
  orgId: string,
  userEmail: string,
  includeAgentRoutes = true
): Promise<OrgRoutesResponse> {
  const params = new URLSearchParams({ include_agent_routes: String(includeAgentRoutes) });
  const response = await fetch(`${API_URL}/org-setup/${orgId}/routes?${params}`, {
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new org route.
 */
export async function createOrgRoute(
  orgId: string,
  userEmail: string,
  route: Partial<OrgRoute>
): Promise<OrgRoute> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/routes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
    body: JSON.stringify(route),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Update an org route.
 */
export async function updateOrgRoute(
  orgId: string,
  userEmail: string,
  routeId: string,
  route: Partial<OrgRoute>
): Promise<OrgRoute> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/routes/${routeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
    },
    body: JSON.stringify(route),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete an org route.
 */
export async function deleteOrgRoute(
  orgId: string,
  userEmail: string,
  routeId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/routes/${routeId}`, {
    method: "DELETE",
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }
}

/**
 * Get available tools for routes.
 */
export async function getAvailableTools(orgId: string, userEmail: string): Promise<AvailableTool[]> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/available-tools`, {
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get list of supported industries.
 */
export async function getIndustries(orgId: string, userEmail: string): Promise<Industry[]> {
  const response = await fetch(`${API_URL}/org-setup/${orgId}/industries`, {
    headers: {
      "X-User-Email": userEmail,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}
