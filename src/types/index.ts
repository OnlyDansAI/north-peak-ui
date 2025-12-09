// API Types

export interface MessageRequest {
  contact_uuid: string;
  location_id: string;
  channel: string;
  message: string;
  route_name?: string;
}

export interface MessageResponse {
  success: boolean;
  route_detected: string;
  confidence: number;
  reply: string | null;
  should_escalate: boolean;
  escalation_reason: string | null;
  actions_taken: string[];
}

export interface ResolveResponse {
  location?: {
    id: string;
    name: string;
    ghl_location_id: string;
    ai_enabled: boolean;
  } | null;
  location_error?: string;
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    ghl_contact_id: string;
  } | null;
  contact_error?: string;
}

// Chat UI Types

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatContext {
  locationId: string;
  contactId: string;
  locationName?: string;
  contactName?: string;
}
