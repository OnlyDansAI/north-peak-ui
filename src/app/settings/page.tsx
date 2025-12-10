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
import { isInGHLIframe, authenticateWithGHL } from "@/lib/sso";

// Super admin emails
const SUPER_ADMIN_EMAILS = ["dan@onlydans.ai", "danny@onlydans.ai"];

// Fallback GHL location ID for demo/test mode
const FALLBACK_GHL_LOCATION_ID = "ojKtYYUFbTKUmDCA5KUH";

function SettingsPageContent() {
  const searchParams = useSearchParams();

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isSuperAdmin = userEmail ? SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase()) : false;

  // Location state
  const [locationId, setLocationId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
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
  const [activeTab, setActiveTab] = useState("location");

  // Location form state
  const [formData, setFormData] = useState({
    assistant_name: "",
    business_name: "",
    calendar_id: "",
    timezone: "",
  });

  // Org form state
  const [orgFormData, setOrgFormData] = useState({
    name: "",
    industry: "",
    default_timezone: "",
  });

  // Product editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", description: "" });

  // Route editing state
  const [editingRoute, setEditingRoute] = useState<OrgRoute | null>(null);
  const [newRoute, setNewRoute] = useState({
    route_name: "",
    description: "",
    system_prompt: "",
    tools_enabled: [] as string[],
    confidence_threshold: 0.7,
    priority: 100,
    is_entry_point: true,
  });

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
        // Still try to get user email via SSO
        if (isInGHLIframe()) {
          try {
            const userData = await authenticateWithGHL();
            setUserEmail(userData.email || null);
          } catch {
            // Continue without user email
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
          const userData = await authenticateWithGHL();
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
          console.warn("GHL SSO failed:", err);
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

        setFormData({
          assistant_name: settingsData.assistant_name || "",
          business_name: settingsData.business_name || "",
          calendar_id: settingsData.calendar_id || "",
          timezone: settingsData.timezone || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    loadLocationData();
  }, [locationId]);

  // Load org data when super admin and orgId is available
  useEffect(() => {
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
        assistant_name: formData.assistant_name || undefined,
        business_name: formData.business_name || undefined,
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
  const handleAddProduct = async () => {
    if (!orgId || !userEmail || !newProduct.name) return;
    try {
      const result = await addOrgProduct(orgId, userEmail, newProduct);
      const product = result.product;
      setProducts([...products, product]);
      setNewProduct({ name: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    }
  };

  const handleUpdateProduct = async (product: Product, index: number) => {
    if (!orgId || !userEmail) return;
    try {
      const result = await updateOrgProduct(orgId, userEmail, index, product);
      setProducts(products.map((p, i) => i === index ? result.product : p));
      setEditingProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    }
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

  // Route handlers
  const handleAddRoute = async () => {
    if (!orgId || !userEmail || !newRoute.route_name) return;
    try {
      const route = await createOrgRoute(orgId, userEmail, newRoute);
      setRoutes([...routes, route]);
      setNewRoute({
        route_name: "",
        description: "",
        system_prompt: "",
        tools_enabled: [],
        confidence_threshold: 0.7,
        priority: 100,
        is_entry_point: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add route");
    }
  };

  const handleUpdateRoute = async (route: OrgRoute) => {
    if (!orgId || !userEmail) return;
    try {
      const updated = await updateOrgRoute(orgId, userEmail, route.id, route);
      setRoutes(routes.map(r => r.id === route.id ? updated : r));
      setEditingRoute(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route");
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!orgId || !userEmail || !confirm("Delete this route?")) return;
    try {
      await deleteOrgRoute(orgId, userEmail, routeId);
      setRoutes(routes.filter(r => r.id !== routeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    }
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
            <Link href="/chat">
              <Button variant="ghost" size="sm">Chat</Button>
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

              {/* Assistant Settings */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Assistant</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="assistant_name">
                    Assistant Name
                  </label>
                  <Input
                    id="assistant_name"
                    placeholder="e.g., Alex, Sarah"
                    value={formData.assistant_name}
                    onChange={(e) => setFormData({ ...formData, assistant_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Business Settings */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Business</h2>
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

          {/* Organization Tab (Super Admin Only) */}
          {isSuperAdmin && orgId && (
            <TabsContent value="organization">
              <form onSubmit={handleOrgSubmit} className="space-y-6 max-w-2xl">
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
                  <CardTitle>Products & Services</CardTitle>
                  <CardDescription>
                    Define products that the AI can discuss and recommend.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Product */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Product name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <Input
                      placeholder="Description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                    <Button onClick={handleAddProduct} disabled={!newProduct.name}>Add</Button>
                  </div>

                  {/* Product List */}
                  <div className="space-y-2">
                    {products.map((product, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        {editingProduct?.name === product.name ? (
                          <>
                            <Input
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            />
                            <Input
                              value={editingProduct.description || ""}
                              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            />
                            <Button size="sm" onClick={() => handleUpdateProduct(editingProduct, index)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingProduct(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{product.name}</span>
                            <span className="flex-1 text-muted-foreground text-sm">{product.description}</span>
                            <Button size="sm" variant="ghost" onClick={() => setEditingProduct(product)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(index)}>Delete</Button>
                          </>
                        )}
                      </div>
                    ))}
                    {products.length === 0 && (
                      <p className="text-muted-foreground text-sm">No products defined yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Routes Tab (Super Admin Only) */}
          {isSuperAdmin && orgId && (
            <TabsContent value="routes">
              <Card>
                <CardHeader>
                  <CardTitle>AI Routes</CardTitle>
                  <CardDescription>
                    Configure AI conversation routes with custom prompts and tools.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Route */}
                  <div className="space-y-2 p-4 border rounded">
                    <h3 className="font-medium">Add New Route</h3>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Route name (e.g., booking, support)"
                        value={newRoute.route_name}
                        onChange={(e) => setNewRoute({ ...newRoute, route_name: e.target.value })}
                      />
                      <Input
                        placeholder="Description"
                        value={newRoute.description}
                        onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                      />
                      <Textarea
                        placeholder="System prompt (instructions for the AI)"
                        value={newRoute.system_prompt}
                        onChange={(e) => setNewRoute({ ...newRoute, system_prompt: e.target.value })}
                        rows={3}
                      />
                      <div className="flex gap-2 items-center">
                        <label className="text-sm">Confidence:</label>
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          className="w-20"
                          value={newRoute.confidence_threshold}
                          onChange={(e) => setNewRoute({ ...newRoute, confidence_threshold: parseFloat(e.target.value) })}
                        />
                        <label className="text-sm ml-4">Priority:</label>
                        <Input
                          type="number"
                          min="1"
                          className="w-20"
                          value={newRoute.priority}
                          onChange={(e) => setNewRoute({ ...newRoute, priority: parseInt(e.target.value) })}
                        />
                      </div>
                      <Button onClick={handleAddRoute} disabled={!newRoute.route_name}>Add Route</Button>
                    </div>
                  </div>

                  {/* Route List */}
                  <div className="space-y-2">
                    {routes.map((route) => (
                      <div key={route.id} className="p-4 border rounded space-y-2">
                        {editingRoute?.id === route.id ? (
                          <>
                            <Input
                              value={editingRoute.route_name}
                              onChange={(e) => setEditingRoute({ ...editingRoute, route_name: e.target.value })}
                            />
                            <Input
                              value={editingRoute.description || ""}
                              onChange={(e) => setEditingRoute({ ...editingRoute, description: e.target.value })}
                            />
                            <Textarea
                              value={editingRoute.system_prompt || ""}
                              onChange={(e) => setEditingRoute({ ...editingRoute, system_prompt: e.target.value })}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateRoute(editingRoute)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingRoute(null)}>Cancel</Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium">{route.route_name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  (confidence: {route.confidence_threshold}, priority: {route.priority})
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingRoute(route)}>Edit</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRoute(route.id)}>Delete</Button>
                              </div>
                            </div>
                            {route.description && (
                              <p className="text-sm text-muted-foreground">{route.description}</p>
                            )}
                            {route.system_prompt && (
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                {route.system_prompt}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {routes.length === 0 && (
                      <p className="text-muted-foreground text-sm">No routes defined yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
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
