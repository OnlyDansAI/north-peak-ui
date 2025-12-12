"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLocationSettings,
  getLocationCalendars,
  updateLocationSettings,
  syncLocationFromGHL,
  resolveIds,
  getOrgSettings,
  updateOrgSettings,
  getOrgProducts,
  addOrgProduct,
  updateOrgProduct,
  deleteOrgProduct,
  getOrgRoutes,
  createOrgRoute,
  updateOrgRoute,
  deleteOrgRoute,
  getAvailableTools,
  getIndustries,
  type LocationSettings,
  type Calendar,
  type OrgSettings,
  type Product,
  type OrgRoute,
  type AvailableTool,
  type Industry,
} from "@/lib/api";
import { RouteList, ProductEditorSheet } from "@/components/settings";
import { isInGHLIframe, authenticateWithGHL } from "@/lib/sso";

// Super admin emails
const SUPER_ADMIN_EMAILS = ["dan@onlydans.ai", "danny@onlydans.ai"];

// Fallback GHL location ID for demo/test mode
const FALLBACK_GHL_LOCATION_ID = "ojKtYYUFbTKUmDCA5KUH";

// Demo org ID - anyone on this org is treated as super admin (for testing)
const DEMO_ORG_ID = "40094796-cd22-4f6c-92f2-399bcc228608";

function SettingsPageContent() {
  const searchParams = useSearchParams();

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Location state
  const [locationId, setLocationId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Super admin check - requires authenticated user
  const adminOverride = searchParams.get("admin") === "true";
  const emailOverride = searchParams.get("email");
  const effectiveEmail = emailOverride || userEmail;
  const isDemoOrg = orgId === DEMO_ORG_ID;
  // Must be authenticated AND (admin override OR demo org OR super admin email)
  const isSuperAdmin = effectiveEmail
    ? (adminOverride || isDemoOrg || SUPER_ADMIN_EMAILS.includes(effectiveEmail.toLowerCase()))
    : false;
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  // Org state (for super admins)
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<OrgRoute[]>([]);
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Read initial tab from URL param (for deep linking from chat)
  const initialTab = searchParams.get("tab") || "location";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Location form state - ALL fields including GHL sync
  const [formData, setFormData] = useState({
    // AI config
    assistant_name: "",
    human_agent_name: "",
    assistant_persona: "",
    // Business info (2-way sync with GHL)
    business_name: "",
    business_type: "",
    business_email: "",
    business_phone: "",
    // Location owner info (read-only from GHL)
    location_owner_name: "",
    location_owner_email: "",
    location_owner_phone: "",
    // Booking
    calendar_id: "",
    timezone: "",
  });

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Org form state
  const [orgFormData, setOrgFormData] = useState({
    name: "",
    industry: "",
    default_timezone: "",
  });

  // Product editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  // Route editing state - now handled by RouteList component

  // Initialize - resolve location ID and get user email via SSO
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      // Check URL params first
      const urlLocationId = searchParams.get("location_id");
      const ghlLocationId = searchParams.get("ghl_location_id") || searchParams.get("locationId");

      if (urlLocationId) {
        setLocationId(urlLocationId);
        // Try to get org_id from the location
        try {
          const resolved = await resolveIds({ location_id: urlLocationId });
          if (resolved.location?.organization_id) {
            setOrgId(resolved.location.organization_id);
          }
        } catch {
          // Continue without org_id
        }
        // Still try to get user email via SSO
        if (isInGHLIframe()) {
          try {
            console.log("[SSO] Attempting GHL authentication...");
            const userData = await authenticateWithGHL();
            console.log("[SSO] Success:", { userId: userData.userId, email: userData.email, type: userData.type });
            setUserEmail(userData.email || null);
          } catch (err) {
            console.error("[SSO] Failed:", err);
          }
        }
        return;
      }

      if (ghlLocationId) {
        try {
          const resolved = await resolveIds({ ghl_location_id: ghlLocationId });
          if (resolved.location?.id) {
            setLocationId(resolved.location.id);
            setOrgId(resolved.location.organization_id || null);
          }
        } catch (err) {
          console.error("Failed to resolve GHL location:", err);
        }
      }

      // Try SSO
      if (isInGHLIframe()) {
        try {
          console.log("[SSO] Attempting GHL authentication...");
          const userData = await authenticateWithGHL();
          console.log("[SSO] Success:", { userId: userData.userId, email: userData.email, type: userData.type, activeLocation: userData.activeLocation });
          setUserEmail(userData.email || null);
          if (userData.activeLocation && !locationId) {
            const resolved = await resolveIds({ ghl_location_id: userData.activeLocation });
            if (resolved.location?.id) {
              setLocationId(resolved.location.id);
              setOrgId(resolved.location.organization_id || null);
              return;
            }
          }
        } catch (err) {
          console.error("[SSO] Failed:", err);
        }
      }

      // Fall back to demo location
      if (!locationId) {
        try {
          const resolved = await resolveIds({ ghl_location_id: FALLBACK_GHL_LOCATION_ID });
          if (resolved.location?.id) {
            setLocationId(resolved.location.id);
            setOrgId(resolved.location.organization_id || null);
          } else {
            setError("Could not resolve demo location");
          }
        } catch (err) {
          setError("Failed to initialize location");
        }
      }
    }

    initialize();
  }, [searchParams]);

  // Load location settings when location is resolved
  useEffect(() => {
    if (!locationId) return;

    async function loadLocationData() {
      try {
        const [settingsData, calendarsData] = await Promise.all([
          getLocationSettings(locationId!),
          getLocationCalendars(locationId!),
        ]);

        setSettings(settingsData);
        setCalendars(calendarsData.calendars || []);
        // Note: org_id is already set from resolveIds in initialize()

        // Check if we need to auto-sync from GHL (first load with empty business data)
        const needsAutoSync = !settingsData.business_name && !settingsData.location_owner_name;

        if (needsAutoSync) {
          // Auto-sync from GHL on first load
          try {
            const syncResult = await syncLocationFromGHL(locationId!);
            const synced = syncResult.synced_data;
            const config = syncResult.config;

            setSettings(config);
            setFormData({
              assistant_name: config.ai_agent_name || config.assistant_name || "",
              human_agent_name: config.human_agent_name || "",
              assistant_persona: config.assistant_persona || "",
              business_name: synced.business_name || "",
              business_type: config.business_type || "",
              business_email: synced.business_email || "",
              business_phone: synced.business_phone || "",
              location_owner_name: synced.location_owner_name || "",
              location_owner_email: synced.location_owner_email || "",
              location_owner_phone: synced.location_owner_phone || "",
              calendar_id: config.calendar_id || "",
              timezone: synced.timezone || config.timezone || "",
            });
          } catch {
            // If auto-sync fails, just use existing data
            setFormData({
              assistant_name: settingsData.ai_agent_name || settingsData.assistant_name || "",
              human_agent_name: settingsData.human_agent_name || "",
              assistant_persona: settingsData.assistant_persona || "",
              business_name: settingsData.business_name || "",
              business_type: settingsData.business_type || "",
              business_email: settingsData.business_email || "",
              business_phone: settingsData.business_phone || "",
              location_owner_name: settingsData.location_owner_name || "",
              location_owner_email: settingsData.location_owner_email || "",
              location_owner_phone: settingsData.location_owner_phone || "",
              calendar_id: settingsData.calendar_id || "",
              timezone: settingsData.timezone || "",
            });
          }
        } else {
          setFormData({
            // AI config - prefer ai_agent_name over assistant_name
            assistant_name: settingsData.ai_agent_name || settingsData.assistant_name || "",
            human_agent_name: settingsData.human_agent_name || "",
            assistant_persona: settingsData.assistant_persona || "",
            // Business info (2-way sync with GHL)
            business_name: settingsData.business_name || "",
            business_type: settingsData.business_type || "",
            business_email: settingsData.business_email || "",
            business_phone: settingsData.business_phone || "",
            // Location owner info (read-only from GHL)
            location_owner_name: settingsData.location_owner_name || "",
            location_owner_email: settingsData.location_owner_email || "",
            location_owner_phone: settingsData.location_owner_phone || "",
            // Booking
            calendar_id: settingsData.calendar_id || "",
            timezone: settingsData.timezone || "",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    loadLocationData();
  }, [locationId]);

  // Load org data only for super admins
  useEffect(() => {
    // Must have authenticated super admin access and org ID
    if (!isSuperAdmin || !orgId || !userEmail) return;

    async function loadOrgData() {
      try {
        const [settingsData, productsData, routesData, toolsData, industriesData] = await Promise.all([
          getOrgSettings(orgId!, userEmail!),
          getOrgProducts(orgId!, userEmail!),
          getOrgRoutes(orgId!, userEmail!),
          getAvailableTools(orgId!, userEmail!),
          getIndustries(orgId!, userEmail!),
        ]);

        setOrgSettings(settingsData);
        setProducts(productsData);
        setRoutes(routesData.all_routes || []);
        setAvailableTools(toolsData);
        setIndustries(industriesData);

        setOrgFormData({
          name: settingsData.name || "",
          industry: settingsData.industry || "",
          default_timezone: settingsData.default_timezone || "",
        });
      } catch (err) {
        console.error("Failed to load org data:", err);
        // Don't show error - org data is optional
      }
    }

    loadOrgData();
  }, [isSuperAdmin, orgId, userEmail]);

  // Location form submit
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateLocationSettings(locationId, {
        // AI config
        assistant_name: formData.assistant_name || undefined,
        human_agent_name: formData.human_agent_name || undefined,
        assistant_persona: formData.assistant_persona || undefined,
        // Business info (2-way sync with GHL)
        business_name: formData.business_name || undefined,
        business_type: formData.business_type || undefined,
        business_email: formData.business_email || undefined,
        business_phone: formData.business_phone || undefined,
        // Note: location_owner_* fields are read-only from GHL, don't submit
        // Booking
        calendar_id: formData.calendar_id || undefined,
        timezone: formData.timezone || undefined,
      });

      setSettings((prev) => prev ? { ...prev, ...updated } : updated as unknown as LocationSettings);
      setSuccess("Location settings saved!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Sync from GHL handler
  const handleSyncFromGHL = async () => {
    if (!locationId) return;

    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await syncLocationFromGHL(locationId);
      const synced = result.synced_data;
      const config = result.config;

      // Update form with synced data
      setFormData((prev) => ({
        ...prev,
        business_name: synced.business_name || prev.business_name,
        business_email: synced.business_email || prev.business_email,
        business_phone: synced.business_phone || prev.business_phone,
        timezone: synced.timezone || prev.timezone,
        location_owner_name: synced.location_owner_name || prev.location_owner_name,
        location_owner_email: synced.location_owner_email || prev.location_owner_email,
        location_owner_phone: synced.location_owner_phone || prev.location_owner_phone,
        // Also update AI fields from config
        assistant_name: config.ai_agent_name || config.assistant_name || prev.assistant_name,
        human_agent_name: config.human_agent_name || prev.human_agent_name,
        calendar_id: config.calendar_id || prev.calendar_id,
      }));

      setSettings(config);
      setSuccess("Synced from GHL successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync from GHL");
    } finally {
      setIsSyncing(false);
    }
  };

  // Org form submit
  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOrgSettings(orgId, userEmail, orgFormData);
      setSuccess("Organization settings saved!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save org settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Product handlers
  const handleOpenNewProduct = () => {
    setEditingProduct({
      name: "",
      slug: "",
      description: "",
      is_active: true,
      priority: 100,
    });
    setIsNewProduct(true);
    setEditingProductIndex(null);
  };

  const handleOpenEditProduct = (product: Product, index: number) => {
    setEditingProduct(product);
    setIsNewProduct(false);
    setEditingProductIndex(index);
  };

  const handleSaveProduct = async (product: Product) => {
    if (!orgId || !userEmail) return;
    try {
      if (isNewProduct) {
        const result = await addOrgProduct(orgId, userEmail, product);
        setProducts([...products, result.product]);
      } else if (editingProductIndex !== null) {
        const result = await updateOrgProduct(orgId, userEmail, editingProductIndex, product);
        setProducts(products.map((p, i) => i === editingProductIndex ? result.product : p));
      }
      setEditingProduct(null);
      setIsNewProduct(false);
      setEditingProductIndex(null);
    } catch (err) {
      throw err; // Let the sheet handle the error display
    }
  };

  const handleCloseProductEditor = () => {
    setEditingProduct(null);
    setIsNewProduct(false);
    setEditingProductIndex(null);
  };

  const handleDeleteProduct = async (index: number) => {
    if (!orgId || !userEmail || !confirm("Delete this product?")) return;
    try {
      await deleteOrgProduct(orgId, userEmail, index);
      setProducts(products.filter((_, i) => i !== index));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  // Route handlers - used by RouteList component
  const handleCreateRoute = async (routeData: Partial<OrgRoute>) => {
    if (!orgId || !userEmail) return;
    const route = await createOrgRoute(orgId, userEmail, routeData);
    setRoutes([...routes, route]);
  };

  const handleUpdateRoute = async (route: OrgRoute) => {
    if (!orgId || !userEmail) return;
    const updated = await updateOrgRoute(orgId, userEmail, route.id, route);
    setRoutes(routes.map(r => r.id === route.id ? updated : r));
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!orgId || !userEmail) return;
    await deleteOrgRoute(orgId, userEmail, routeId);
    setRoutes(routes.filter(r => r.id !== routeId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <div className="text-destructive font-semibold">Error</div>
        <div className="text-muted-foreground text-center max-w-md">{error}</div>
        <Link href="/chat">
          <Button variant="outline">Go to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">North Peak AI Settings</h1>
          <nav className="flex gap-2 items-center">
            <Link href={locationId ? `/chat?location_id=${locationId}` : "/chat"}>
              <Button variant="ghost" size="sm">← Back to Chat</Button>
            </Link>
            {userEmail && (
              <span className="text-xs text-muted-foreground">
                {userEmail}
              </span>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Debug Info - remove in production */}
        {searchParams.get("debug") === "true" && (
          <div className="p-4 rounded-lg bg-blue-500/10 text-blue-600 text-xs mb-6 font-mono">
            <div>userEmail: {userEmail || "null"}</div>
            <div>effectiveEmail: {effectiveEmail || "null"}</div>
            <div>isSuperAdmin: {isSuperAdmin ? "true" : "false"}</div>
            <div>orgId: {orgId || "null"}</div>
            <div>locationId: {locationId || "null"}</div>
            <div>isInGHLIframe: {typeof window !== "undefined" && isInGHLIframe() ? "true" : "false"}</div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-lg bg-green-500/10 text-green-600 text-sm mb-6">
            {success}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="location">Location Settings</TabsTrigger>
            {isSuperAdmin && orgId && (
              <>
                <TabsTrigger value="organization">Organization</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="routes">Routes</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Location Settings Tab */}
          <TabsContent value="location">
            <form onSubmit={handleLocationSubmit} className="space-y-6 max-w-2xl">
              {/* Location Info */}
              {settings && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={settings.ai_enabled ? "text-green-600" : "text-yellow-600"}>
                      {settings.ai_enabled ? "AI Enabled" : "AI Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CRM:</span>
                    <span>{settings.crm_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connected:</span>
                    <span>{settings.has_tokens ? "Yes" : "No"}</span>
                  </div>
                </div>
              )}

              {/* AI Agent Settings */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium">AI Agent</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="assistant_name">
                      AI Assistant Name
                    </label>
                    <Input
                      id="assistant_name"
                      placeholder="e.g., Alex, Sarah"
                      value={formData.assistant_name}
                      onChange={(e) => setFormData({ ...formData, assistant_name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">The name the AI will use when talking to customers</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="human_agent_name">
                      Human Agent Name
                    </label>
                    <Input
                      id="human_agent_name"
                      placeholder="e.g., Dan, Support Team"
                      value={formData.human_agent_name}
                      onChange={(e) => setFormData({ ...formData, human_agent_name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Name used when escalating to a human</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="assistant_persona">
                    Assistant Persona
                  </label>
                  <Textarea
                    id="assistant_persona"
                    placeholder="e.g., You are a friendly and helpful insurance advisor..."
                    value={formData.assistant_persona}
                    onChange={(e) => setFormData({ ...formData, assistant_persona: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Custom personality or instructions for the AI</p>
                </div>
              </div>

              {/* Business Info - 2-way sync with GHL */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Business Information</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncFromGHL}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Syncing..." : "Sync from GHL"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  These fields sync with GHL. Changes here will update your GHL location.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="business_name">
                      Business Name
                    </label>
                    <Input
                      id="business_name"
                      placeholder="e.g., North Peak Life Insurance"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="business_type">
                      Business Type
                    </label>
                    <Select
                      id="business_type"
                      value={formData.business_type}
                      onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    >
                      <option value="">Select type...</option>
                      <option value="insurance">Insurance</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="legal">Legal</option>
                      <option value="financial">Financial Services</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="business_email">
                      Business Email
                    </label>
                    <Input
                      id="business_email"
                      type="email"
                      placeholder="e.g., contact@business.com"
                      value={formData.business_email}
                      onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="business_phone">
                      Business Phone
                    </label>
                    <Input
                      id="business_phone"
                      type="tel"
                      placeholder="e.g., (555) 123-4567"
                      value={formData.business_phone}
                      onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Location Owner Info - Read-only from GHL */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Location Owner</h2>
                <p className="text-sm text-muted-foreground">
                  Pulled from GHL user profile. Click "Sync from GHL" to refresh.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Owner Name
                    </label>
                    <Input
                      value={formData.location_owner_name}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Owner Email
                    </label>
                    <Input
                      value={formData.location_owner_email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Owner Phone
                    </label>
                    <Input
                      value={formData.location_owner_phone}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Calendar Settings */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Booking Calendar</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="calendar_id">
                    Calendar for Appointments
                  </label>
                  <Select
                    id="calendar_id"
                    value={formData.calendar_id}
                    onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
                  >
                    <option value="">Select calendar...</option>
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="timezone">
                    Timezone
                  </label>
                  <Select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  >
                    <option value="">Select timezone...</option>
                    <option value="America/New_York">Eastern (New York)</option>
                    <option value="America/Chicago">Central (Chicago)</option>
                    <option value="America/Denver">Mountain (Denver)</option>
                    <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                    <option value="America/Phoenix">Arizona (Phoenix)</option>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
                <Link href="/chat">
                  <Button type="button" variant="outline">Back to Chat</Button>
                </Link>
              </div>
            </form>
          </TabsContent>

          {/* Organization Tab - Super Admin Only */}
          {isSuperAdmin && orgId && (
            <TabsContent value="organization">
              <form onSubmit={handleOrgSubmit} className="space-y-6 max-w-2xl">
                {/* Current User Info */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-1 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Logged in as:</span>
                    <span className={effectiveEmail ? "text-green-600" : "text-yellow-600"}>
                      {effectiveEmail || "Not authenticated"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Access Level:</span>
                    <span>{isSuperAdmin ? "Super Admin" : "Standard"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization ID:</span>
                    <span className="font-mono text-xs">{orgId}</span>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>
                      Configure settings that apply to all locations in this organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Organization Name</label>
                      <Input
                        value={orgFormData.name}
                        onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                        placeholder="e.g., North Peak Insurance Group"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry</label>
                      <Select
                        value={orgFormData.industry}
                        onChange={(e) => setOrgFormData({ ...orgFormData, industry: e.target.value })}
                      >
                        <option value="">Select industry...</option>
                        {industries.map((ind) => (
                          <option key={ind.value} value={ind.value}>{ind.label}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Default Timezone</label>
                      <Select
                        value={orgFormData.default_timezone}
                        onChange={(e) => setOrgFormData({ ...orgFormData, default_timezone: e.target.value })}
                      >
                        <option value="">Select timezone...</option>
                        <option value="America/New_York">Eastern</option>
                        <option value="America/Chicago">Central</option>
                        <option value="America/Denver">Mountain</option>
                        <option value="America/Los_Angeles">Pacific</option>
                      </Select>
                    </div>

                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Organization"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          )}

          {/* Products Tab (Super Admin Only) */}
          {isSuperAdmin && orgId && (
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Products & Services</CardTitle>
                      <CardDescription>
                        Define products that the AI can discuss and recommend. Configure tool behavior and auto-tagging per product.
                      </CardDescription>
                    </div>
                    <Button onClick={handleOpenNewProduct}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product List */}
                  <div className="space-y-2">
                    {products.map((product, index) => (
                      <div
                        key={product.id || index}
                        className={`flex items-center gap-4 p-4 border rounded-lg transition-colors hover:bg-muted/50 cursor-pointer ${
                          product.is_active === false ? "opacity-50" : ""
                        }`}
                        onClick={() => handleOpenEditProduct(product, index)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                            )}
                            {product.is_active === false && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Inactive</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {product.description || "No description"}
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Slug: {product.slug}</span>
                            {product.priority && <span>Priority: {product.priority}</span>}
                            {(product.tags_on_book?.length || 0) > 0 && (
                              <span>{product.tags_on_book?.length} auto-tag(s) on book</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditProduct(product, index);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(index);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm mb-4">No products defined yet.</p>
                        <Button variant="outline" onClick={handleOpenNewProduct}>
                          Create your first product
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Product Editor Sheet */}
              <ProductEditorSheet
                product={editingProduct}
                availableTools={availableTools}
                onSave={handleSaveProduct}
                onClose={handleCloseProductEditor}
                isNew={isNewProduct}
              />
            </TabsContent>
          )}

          {/* Routes Tab (Super Admin Only) */}
          {isSuperAdmin && orgId && (
            <TabsContent value="routes">
              <RouteList
                routes={routes}
                availableTools={availableTools}
                onCreateRoute={handleCreateRoute}
                onUpdateRoute={handleUpdateRoute}
                onDeleteRoute={handleDeleteRoute}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
