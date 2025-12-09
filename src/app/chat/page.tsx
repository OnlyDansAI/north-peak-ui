"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatContainer } from "@/components/chat";
import { resolveIds } from "@/lib/api";
import type { ChatContext } from "@/types";

// Demo/test IDs - replace with your actual test data
const DEMO_LOCATION_ID = "22222222-2222-2222-2222-222222222222";
const DEMO_CONTACT_ID = "33333333-3333-3333-3333-333333333333";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [context, setContext] = useState<ChatContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeContext() {
      setIsLoading(true);
      setError(null);

      // Get params from URL
      const locationId = searchParams.get("location_id");
      const contactId = searchParams.get("contact_id");
      const ghlLocationId = searchParams.get("ghl_location_id") || searchParams.get("locationId");
      const ghlContactId = searchParams.get("ghl_contact_id") || searchParams.get("contactId");

      // If we have our UUIDs directly, use them
      if (locationId && contactId) {
        setContext({
          locationId,
          contactId,
        });
        setIsLoading(false);
        return;
      }

      // If we have GHL IDs, resolve them
      if (ghlLocationId || ghlContactId) {
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
          } else {
            // Partial resolution - check what's missing
            const missing = [];
            if (!resolved.location?.id) missing.push("location");
            if (!resolved.contact?.id) missing.push("contact");
            setError(`Could not resolve: ${missing.join(", ")}`);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to resolve IDs");
        }
        setIsLoading(false);
        return;
      }

      // No params provided - use demo mode
      console.log("No context params provided, using demo mode");
      setContext({
        locationId: DEMO_LOCATION_ID,
        contactId: DEMO_CONTACT_ID,
        locationName: "Demo Location",
        contactName: "Demo User",
      });
      setIsLoading(false);
    }

    initializeContext();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
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
