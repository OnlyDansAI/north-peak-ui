/**
 * GHL SSO utilities for iframe authentication.
 *
 * When embedded in a GHL iframe, we request encrypted user data
 * via postMessage, then send it to our backend for decryption.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GHLUserData {
  userId: string;
  companyId: string;
  role: string;
  type: "agency" | "location";
  userName?: string;
  email?: string;
  isAgencyOwner?: boolean;
  activeLocation?: string; // GHL location ID when in location context
}

/**
 * Check if we're running inside a GHL iframe.
 */
export function isInGHLIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin restriction means we're in an iframe
    return true;
  }
}

/**
 * Request encrypted user data from GHL parent frame via postMessage.
 */
export function requestGHLUserData(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log("[SSO] Sending REQUEST_USER_DATA to parent frame...");

    const timeout = setTimeout(() => {
      console.error("[SSO] Timeout waiting for GHL response (5s)");
      window.removeEventListener("message", messageHandler);
      reject(new Error("GHL user data request timed out"));
    }, 5000);

    const messageHandler = (event: MessageEvent) => {
      // Log all messages for debugging
      if (event.data?.message) {
        console.log("[SSO] Received message:", event.data.message);
      }

      if (event.data?.message === "REQUEST_USER_DATA_RESPONSE") {
        console.log("[SSO] Got encrypted payload, length:", event.data.payload?.length || 0);
        clearTimeout(timeout);
        window.removeEventListener("message", messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener("message", messageHandler);
    window.parent.postMessage({ message: "REQUEST_USER_DATA" }, "*");
  });
}

/**
 * Decrypt SSO data via our backend.
 */
export async function decryptSSOData(encryptedData: string): Promise<GHLUserData> {
  console.log("[SSO] Sending to backend for decryption...");

  const response = await fetch(`${API_URL}/auth/sso/decrypt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: encryptedData }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Decryption failed" }));
    console.error("[SSO] Backend decrypt failed:", error);
    throw new Error(error.detail || `SSO error: ${response.status}`);
  }

  const userData = await response.json();
  console.log("[SSO] Backend decrypt success:", userData);
  return userData;
}

/**
 * Full SSO flow: request from GHL, decrypt via backend.
 */
export async function authenticateWithGHL(): Promise<GHLUserData> {
  const encryptedData = await requestGHLUserData();
  return decryptSSOData(encryptedData);
}
