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
    organization_id?: string | null;
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

// Test Session Types

export interface TestSession {
  session_id: string;
  location_id: string;
  channel: string;
  test_contact_name: string;
  status: "active" | "ended";
}

export interface DebugInfo {
  route_name: string | null;
  route_confidence: number | null;
  intent?: string | null;
  tools_called: string[];
  goal_achieved: boolean;
  goal_type: string | null;
  processing_time_ms: number | null;
}

export interface TestMessageResponse {
  success: boolean;
  reply: string | null;
  should_escalate: boolean;
  escalation_reason: string | null;
  debug: DebugInfo;
  interaction_id: string | null;
}

// Chat UI Types

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  debug?: DebugInfo;
}

export interface ChatContext {
  locationId: string;
  contactId?: string;  // Optional now - not needed for test sessions
  locationName?: string;
  contactName?: string;
  // Test session mode
  testMode?: boolean;
  sessionId?: string;
}
