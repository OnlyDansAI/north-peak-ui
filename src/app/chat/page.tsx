"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat";
import { resolveIds } from "@/lib/api";
import { isInGHLIframe, authenticateWithGHL } from "@/lib/sso";
import type { ChatContext } from "@/types";

// Demo/test IDs - replace with your actual test data
const DEMO_LOCATION_ID = "22222222-2222-2222-2222-222222222222";
const DEMO_CONTACT_ID = "33333333-3333-3333-3333-333333333333";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ChatContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>("initializing");

  useEffect(() => {
    async function initializeContext() {
      setIsLoading(true);
      setError(null);

      // Get params from URL
      const locationId = searchParams.get("location_id");
      const contactId = searchParams.get("contact_id");
      const ghlLocationId = searchParams.get("ghl_location_id") || searchParams.get("locationId");
      const ghlContactId = searchParams.get("ghl_contact_id") || searchParams.get("contactId");

      // PRIORITY 1: If we have our UUIDs directly, use them
      if (locationId && contactId) {
        setAuthStatus("using URL params (UUIDs)");
        setContext({
          locationId,
          contactId,
        });
        setIsLoading(false);
        return;
      }

      // PRIORITY 2: If we have GHL IDs in URL, resolve them
      if (ghlLocationId || ghlContactId) {
        setAuthStatus("resolving GHL IDs from URL");
        try {
          const resolved = await resolveIds({
            ghl_location_id: ghlLocationId || undefined,
            ghl_contact_id: ghlContactId || undefined,
          });

          if (resolved.location?.id && resolved.contact?.id) {
            setContext({
              locationId: resolved.location.id,
              contactId: resolved.contact.id,
              locationName: resolved.location.name,
              contactName: [resolved.contact.first_name, resolved.contact.last_name]
                .filter(Boolean)
                .join(" ") || undefined,
            });
            setIsLoading(false);
            return;
          } else if (resolved.location?.id) {
            // We have location but no contact - might be okay for some use cases
            // For now, require both
            setError(`Contact not found for GHL ID: ${ghlContactId}`);
            setIsLoading(false);
            return;
          } else {
            setError(`Location not found for GHL ID: ${ghlLocationId}`);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to resolve IDs");
          setIsLoading(false);
          return;
        }
      }

      // PRIORITY 3: Try SSO authentication if in GHL iframe
      if (isInGHLIframe()) {
        setAuthStatus("authenticating via GHL SSO");
        try {
          const userData = await authenticateWithGHL();
          console.log("GHL SSO user data:", userData);

          // We got the user, now resolve their location
          if (userData.activeLocation) {
            const resolved = await resolveIds({
              ghl_location_id: userData.activeLocation,
            });

            if (resolved.location?.id) {
              // SSO gives us location but not contact
              // Use test mode for staff testing the bot
              setContext({
                locationId: resolved.location.id,
                // No contactId - use test mode instead
                locationName: resolved.location.name,
                contactName: userData.userName || userData.email,
                testMode: true,
              });
              setAuthStatus(`authenticated as ${userData.userName || userData.email} (test mode)`);
              setIsLoading(false);
              return;
            }
          }

          setError("SSO succeeded but no active location found");
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn("GHL SSO failed:", err);
          // Fall through to demo mode
          setAuthStatus("SSO failed, using demo mode");
        }
      }

      // PRIORITY 4: Demo/Test mode (no auth)
      console.log("No context params provided, using test mode");
      setAuthStatus("test mode");
      setContext({
        locationId: DEMO_LOCATION_ID,
        // No contactId needed for test mode
        locationName: "Demo Location",
        contactName: "Demo User",
        testMode: true,
      });
      setIsLoading(false);
    }

    initializeContext();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <div className="text-muted-foreground">Loading...</div>
        <div className="text-xs text-muted-foreground">{authStatus}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <div className="text-destructive font-semibold">Configuration Error</div>
        <div className="text-muted-foreground text-center max-w-md">{error}</div>
        <div className="text-sm text-muted-foreground">
          Expected URL params: location_id & contact_id (our UUIDs) or ghl_location_id & ghl_contact_id
        </div>
        <div className="text-xs text-muted-foreground mt-4">Auth status: {authStatus}</div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">No chat context available</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ChatContainer context={context} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
