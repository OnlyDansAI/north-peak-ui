"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isInGHLIframe,
  authenticateWithGHL,
  type GHLUserData,
} from "@/lib/sso";
import { resolveIds } from "@/lib/api";

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  user: GHLUserData | null;
  locationId: string | null; // Our internal UUID
  contactId: string | null; // Our internal UUID (if available)
}

/**
 * Hook to handle GHL SSO authentication when embedded in iframe.
 *
 * Flow:
 * 1. Detect if we're in a GHL iframe
 * 2. Request encrypted user data via postMessage
 * 3. Send to backend for decryption
 * 4. Resolve GHL location ID to our internal UUID
 */
export function useGHLAuth(): AuthState & { retry: () => void } {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    error: null,
    user: null,
    locationId: null,
    contactId: null,
  });

  const authenticate = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if we're in a GHL iframe
      if (!isInGHLIframe()) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          error: "Not running in GHL iframe",
          user: null,
          locationId: null,
          contactId: null,
        });
        return;
      }

      // Get user data from GHL
      const userData = await authenticateWithGHL();

      // Resolve GHL location ID to our internal UUID
      let locationId: string | null = null;
      if (userData.activeLocation) {
        try {
          const resolved = await resolveIds({
            ghl_location_id: userData.activeLocation,
          });
          locationId = resolved.location?.id || null;
        } catch (e) {
          console.warn("Could not resolve location:", e);
        }
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        error: null,
        user: userData,
        locationId,
        contactId: null, // Contact is determined by URL params or conversation context
      });
    } catch (error) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Authentication failed",
        user: null,
        locationId: null,
        contactId: null,
      });
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return { ...state, retry: authenticate };
}
