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
  getOrgVariables,
  createOrgVariable,
  updateOrgVariable,
  deleteOrgVariable,
  getVariableAutocomplete,
  type OrgSettings,
  type Product,
  type OrgRoute,
  type AvailableTool,
  type Industry,
  type OrgVariable,
  type VariableAutocomplete,
} from "@/lib/api";
import { VariableAutocompleteTextarea, VariablePreview } from "@/components/VariableAutocomplete";
import { resolveIds } from "@/lib/api";
import { isInGHLIframe, authenticateWithGHL } from "@/lib/sso";

// Super admin emails (must match backend)
const SUPER_ADMIN_EMAILS = ["dan@onlydans.ai", "danny@onlydans.ai"];

// Fallback GHL location ID for demo/test mode
const FALLBACK_GHL_LOCATION_ID = "ojKtYYUFbTKUmDCA5KUH";

function OrgSetupPageContent() {
  const searchParams = useSearchParams();

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Organization state
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<OrgRoute[]>([]);
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [variables, setVariables] = useState<OrgVariable[]>([]);
  const [variableAutocomplete, setVariableAutocomplete] = useState<VariableAutocomplete | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("organization");

  // Form state for organization
  const [orgForm, setOrgForm] = useState({
    name: "",
    industry: "",
    default_timezone: "",
  });

  // Product editing state
  const [editingProduct, setEditingProduct] = useState<{ index: number; product: Product } | null>(null);
  const [newProduct, setNewProduct] = useState<Product>({ name: "", description: "" });

  // Route editing state
  const [editingRoute, setEditingRoute] = useState<OrgRoute | null>(null);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  // Variable editing state
  const [editingVariable, setEditingVariable] = useState<OrgVariable | null>(null);
  const [isCreatingVariable, setIsCreatingVariable] = useState(false);

  // Initialize - check auth and resolve org
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      // Get user email from URL or SSO
      let email = searchParams.get("user_email");

      if (!email && isInGHLIframe()) {
        try {
          const userData = await authenticateWithGHL();
          email = userData.email || null;
        } catch (err) {
          console.warn("GHL SSO failed:", err);
        }
      }

      // For testing, allow hardcoded email
      if (!email) {
        email = "dan@onlydans.ai"; // Default for testing
      }

      setUserEmail(email);

      // Check authorization
      if (!email || !SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);

      // Resolve organization from location
      const urlLocationId = searchParams.get("location_id");
      const ghlLocationId = searchParams.get("ghl_location_id") || searchParams.get("locationId");

      let locationId: string | null = null;

      if (urlLocationId) {
        locationId = urlLocationId;
      } else if (ghlLocationId) {
        try {
          const resolved = await resolveIds({ ghl_location_id: ghlLocationId });
          locationId = resolved.location?.id || null;
        } catch (err) {
          console.error("Failed to resolve location:", err);
        }
      }

      // Fallback to demo location
      if (!locationId) {
        try {
          const resolved = await resolveIds({ ghl_location_id: FALLBACK_GHL_LOCATION_ID });
          locationId = resolved.location?.id || null;
        } catch (err) {
          console.error("Failed to resolve demo location:", err);
        }
      }

      if (!locationId) {
        setError("Could not resolve location");
        setIsLoading(false);
        return;
      }

      // For now, we'll use a hardcoded org ID (the org associated with this location)
      // In a real app, we'd look up the org from the location
      // Demo org: North Peak Life Group (Snapshot - North Peak AI Brain)
      const organizationId = searchParams.get("org_id") || "40094796-cd22-4f6c-92f2-399bcc228608";
      setOrgId(organizationId);

      // Load all data
      try {
        const [settingsData, productsData, routesData, toolsData, industriesData, variablesData, autocompleteData] = await Promise.all([
          getOrgSettings(organizationId, email),
          getOrgProducts(organizationId, email),
          getOrgRoutes(organizationId, email),
          getAvailableTools(organizationId, email),
          getIndustries(organizationId, email),
          getOrgVariables(organizationId, email),
          getVariableAutocomplete(organizationId, email),
        ]);

        setOrgSettings(settingsData);
        setProducts(productsData);
        setRoutes(routesData.all_routes || []);
        setAvailableTools(toolsData);
        setIndustries(industriesData);
        setVariables(variablesData);
        setVariableAutocomplete(autocompleteData);

        // Initialize form
        setOrgForm({
          name: settingsData.name || "",
          industry: settingsData.industry || "",
          default_timezone: settingsData.default_timezone || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organization data");
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [searchParams]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ==========================================
  // ORGANIZATION HANDLERS
  // ==========================================

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateOrgSettings(orgId, userEmail, {
        name: orgForm.name || undefined,
        industry: orgForm.industry || undefined,
        default_timezone: orgForm.default_timezone || undefined,
      });

      setOrgSettings(updated);
      setSuccess("Organization settings saved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // PRODUCT HANDLERS
  // ==========================================

  const handleAddProduct = async () => {
    if (!orgId || !userEmail || !newProduct.name) return;

    setIsSaving(true);
    setError(null);

    try {
      await addOrgProduct(orgId, userEmail, newProduct);
      const updatedProducts = await getOrgProducts(orgId, userEmail);
      setProducts(updatedProducts);
      setNewProduct({ name: "", description: "" });
      setSuccess("Product added!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!orgId || !userEmail || editingProduct === null) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateOrgProduct(orgId, userEmail, editingProduct.index, editingProduct.product);
      const updatedProducts = await getOrgProducts(orgId, userEmail);
      setProducts(updatedProducts);
      setEditingProduct(null);
      setSuccess("Product updated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (index: number) => {
    if (!orgId || !userEmail) return;
    if (!confirm("Are you sure you want to delete this product?")) return;

    setIsSaving(true);
    setError(null);

    try {
      await deleteOrgProduct(orgId, userEmail, index);
      const updatedProducts = await getOrgProducts(orgId, userEmail);
      setProducts(updatedProducts);
      setSuccess("Product deleted!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // ROUTE HANDLERS
  // ==========================================

  const handleCreateRoute = async (routeData: Partial<OrgRoute>) => {
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);

    try {
      await createOrgRoute(orgId, userEmail, routeData);
      const updatedRoutes = await getOrgRoutes(orgId, userEmail);
      setRoutes(updatedRoutes.all_routes || []);
      setIsCreatingRoute(false);
      setSuccess("Route created!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRoute = async (routeId: string, routeData: Partial<OrgRoute>) => {
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateOrgRoute(orgId, userEmail, routeId, routeData);
      const updatedRoutes = await getOrgRoutes(orgId, userEmail);
      setRoutes(updatedRoutes.all_routes || []);
      setEditingRoute(null);
      setSuccess("Route updated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!orgId || !userEmail) return;
    if (!confirm("Are you sure you want to delete this route?")) return;

    setIsSaving(true);
    setError(null);

    try {
      await deleteOrgRoute(orgId, userEmail, routeId);
      const updatedRoutes = await getOrgRoutes(orgId, userEmail);
      setRoutes(updatedRoutes.all_routes || []);
      setSuccess("Route deleted!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // VARIABLE HANDLERS
  // ==========================================

  const handleCreateVariable = async (variableData: Partial<OrgVariable>) => {
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);

    try {
      await createOrgVariable(orgId, userEmail, variableData);
      const [updatedVars, updatedAutocomplete] = await Promise.all([
        getOrgVariables(orgId, userEmail),
        getVariableAutocomplete(orgId, userEmail),
      ]);
      setVariables(updatedVars);
      setVariableAutocomplete(updatedAutocomplete);
      setIsCreatingVariable(false);
      setSuccess("Variable created!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variable");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVariable = async (varId: string, variableData: Partial<OrgVariable>) => {
    if (!orgId || !userEmail) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateOrgVariable(orgId, userEmail, varId, variableData);
      const [updatedVars, updatedAutocomplete] = await Promise.all([
        getOrgVariables(orgId, userEmail),
        getVariableAutocomplete(orgId, userEmail),
      ]);
      setVariables(updatedVars);
      setVariableAutocomplete(updatedAutocomplete);
      setEditingVariable(null);
      setSuccess("Variable updated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update variable");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVariable = async (varId: string) => {
    if (!orgId || !userEmail) return;
    if (!confirm("Are you sure you want to delete this variable?")) return;

    setIsSaving(true);
    setError(null);

    try {
      await deleteOrgVariable(orgId, userEmail, varId);
      const [updatedVars, updatedAutocomplete] = await Promise.all([
        getOrgVariables(orgId, userEmail),
        getVariableAutocomplete(orgId, userEmail),
      ]);
      setVariables(updatedVars);
      setVariableAutocomplete(updatedAutocomplete);
      setSuccess("Variable deleted!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete variable");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading organization setup...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <div className="text-destructive font-semibold text-xl">Access Denied</div>
        <div className="text-muted-foreground text-center max-w-md">
          You don&apos;t have permission to access the Organization Setup page.
          <br />
          <span className="text-sm">Logged in as: {userEmail || "Unknown"}</span>
        </div>
        <Link href="/chat">
          <Button variant="outline">Go to Chat</Button>
        </Link>
      </div>
    );
  }

  if (error && !orgSettings) {
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
          <div>
            <h1 className="text-xl font-semibold">Organization Setup</h1>
            <p className="text-sm text-muted-foreground">Super Admin Only</p>
          </div>
          <nav className="flex gap-2">
            <Link href="/chat">
              <Button variant="ghost" size="sm">Chat</Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">Settings</Button>
            </Link>
            <Button variant="ghost" size="sm" disabled>Org Setup</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 text-green-600 text-sm">
            {success}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Info</CardTitle>
                <CardDescription>
                  Configure basic organization settings that apply to all locations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrgSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="org_name">
                      Organization Name
                    </label>
                    <Input
                      id="org_name"
                      placeholder="e.g., North Peak Life Insurance"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="industry">
                      Industry
                    </label>
                    <Select
                      id="industry"
                      value={orgForm.industry}
                      onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                    >
                      <option value="">Select industry...</option>
                      {industries.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="timezone">
                      Default Timezone
                    </label>
                    <Select
                      id="timezone"
                      value={orgForm.default_timezone}
                      onChange={(e) => setOrgForm({ ...orgForm, default_timezone: e.target.value })}
                    >
                      <option value="">Select timezone...</option>
                      <option value="America/New_York">Eastern (New York)</option>
                      <option value="America/Chicago">Central (Chicago)</option>
                      <option value="America/Denver">Mountain (Denver)</option>
                      <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                      <option value="America/Phoenix">Arizona (Phoenix)</option>
                    </Select>
                  </div>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Organization Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables">
            <Card>
              <CardHeader>
                <CardTitle>Variable Definitions</CardTitle>
                <CardDescription>
                  Define variables that locations must fill in. Use these in prompts with {"{variable_name}"} syntax.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Variables */}
                {variables.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Current Variables</h3>
                    {variables.map((variable) => (
                      <div key={variable.id} className="p-4 border rounded-lg space-y-2">
                        {editingVariable?.id === variable.id ? (
                          <VariableEditor
                            variable={editingVariable}
                            onSave={(data) => handleUpdateVariable(variable.id, data)}
                            onCancel={() => setEditingVariable(null)}
                            isSaving={isSaving}
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                    {`{${variable.namespace}.${variable.internal_key}}`}
                                  </code>
                                  <span className="text-muted-foreground">{variable.display_name}</span>
                                  {variable.is_required && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {variable.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{variable.description}</div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingVariable(variable)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteVariable(variable.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2">
                              <div>Type: {variable.variable_type}</div>
                              <div>Namespace: {variable.namespace}</div>
                              {variable.default_value && <div>Default: {variable.default_value}</div>}
                              {variable.category && <div>Category: {variable.category}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Create New Variable */}
                {isCreatingVariable ? (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Create New Variable</h3>
                    <VariableEditor
                      onSave={handleCreateVariable}
                      onCancel={() => setIsCreatingVariable(false)}
                      isSaving={isSaving}
                    />
                  </div>
                ) : (
                  <div className="pt-4 border-t">
                    <Button onClick={() => setIsCreatingVariable(true)}>Create New Variable</Button>
                  </div>
                )}

                {/* Variable Usage Help */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Using Variables in Prompts</h3>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                    <p>Variables can be used in system prompts and other text fields:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">{"{location.ai_agent_name}"}</code> - AI assistant&apos;s name</li>
                      <li><code className="bg-muted px-1 rounded">{"{location.business_name}"}</code> - Business name</li>
                      <li><code className="bg-muted px-1 rounded">{"{contact.first_name}"}</code> - Contact&apos;s first name</li>
                    </ul>
                    <p className="text-muted-foreground">
                      Locations will be required to fill in values for required variables before going live.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Products & Services</CardTitle>
                <CardDescription>
                  Define the products or services your organization offers. These will be used to train the AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Products */}
                {products.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Current Products</h3>
                    {products.map((product, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-2">
                        {editingProduct?.index === index ? (
                          <div className="space-y-3">
                            <Input
                              placeholder="Product name"
                              value={editingProduct.product.name}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  product: { ...editingProduct.product, name: e.target.value },
                                })
                              }
                            />
                            <Textarea
                              placeholder="Product description"
                              value={editingProduct.product.description || ""}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  product: { ...editingProduct.product, description: e.target.value },
                                })
                              }
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleUpdateProduct} disabled={isSaving}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground">{product.description}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProduct({ index, product })}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(index)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Product */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-medium">Add New Product</h3>
                  <Input
                    placeholder="Product name (e.g., Term Life Insurance)"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                  <Textarea
                    placeholder="Product description (optional)"
                    value={newProduct.description || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                  <Button onClick={handleAddProduct} disabled={isSaving || !newProduct.name}>
                    Add Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <CardTitle>Route Configuration</CardTitle>
                <CardDescription>
                  Configure AI routes with custom prompts, tools, and behavior settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Routes */}
                {routes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Current Routes</h3>
                    {routes.map((route) => (
                      <div key={route.id} className="p-4 border rounded-lg space-y-2">
                        {editingRoute?.id === route.id ? (
                          <RouteEditor
                            route={editingRoute}
                            availableTools={availableTools}
                            variableAutocomplete={variableAutocomplete}
                            onSave={(data) => handleUpdateRoute(route.id, data)}
                            onCancel={() => setEditingRoute(null)}
                            isSaving={isSaving}
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {route.route_name}
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      route.source === "org"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {route.source === "org" ? "Org Override" : "Agent Default"}
                                  </span>
                                  {route.is_entry_point && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                      Entry Point
                                    </span>
                                  )}
                                </div>
                                {route.description && (
                                  <div className="text-sm text-muted-foreground">{route.description}</div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRoute(route)}
                                >
                                  Edit
                                </Button>
                                {route.source === "org" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteRoute(route.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                              <div>Tools: {route.tools_enabled?.join(", ") || "None"}</div>
                              <div>Confidence: {route.confidence_threshold}</div>
                              <div>Max Turns: {route.max_turns}</div>
                              <div>Priority: {route.priority}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Create New Route */}
                {isCreatingRoute ? (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Create New Route</h3>
                    <RouteEditor
                      availableTools={availableTools}
                      variableAutocomplete={variableAutocomplete}
                      onSave={handleCreateRoute}
                      onCancel={() => setIsCreatingRoute(false)}
                      isSaving={isSaving}
                    />
                  </div>
                ) : (
                  <div className="pt-4 border-t">
                    <Button onClick={() => setIsCreatingRoute(true)}>Create New Route</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ==========================================
// ROUTE EDITOR COMPONENT
// ==========================================

interface RouteEditorProps {
  route?: OrgRoute;
  availableTools: AvailableTool[];
  variableAutocomplete: VariableAutocomplete | null;
  onSave: (data: Partial<OrgRoute>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function RouteEditor({ route, availableTools, variableAutocomplete, onSave, onCancel, isSaving }: RouteEditorProps) {
  const [formData, setFormData] = useState({
    route_name: route?.route_name || "",
    description: route?.description || "",
    is_entry_point: route?.is_entry_point ?? true,
    system_prompt: route?.system_prompt || "",
    tools_enabled: route?.tools_enabled || [],
    confidence_threshold: route?.confidence_threshold ?? 0.7,
    max_turns: route?.max_turns ?? 10,
    priority: route?.priority ?? 0,
    is_active: route?.is_active ?? true,
  });

  const handleToolToggle = (toolName: string) => {
    const tools = formData.tools_enabled.includes(toolName)
      ? formData.tools_enabled.filter((t) => t !== toolName)
      : [...formData.tools_enabled, toolName];
    setFormData({ ...formData, tools_enabled: tools });
  };

  return (
    <div className="space-y-4">
      {!route && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Route Name</label>
          <Input
            placeholder="e.g., booking, faq, objections"
            value={formData.route_name}
            onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="What does this route do?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">System Prompt</label>
        <VariableAutocompleteTextarea
          value={formData.system_prompt}
          onChange={(value) => setFormData({ ...formData, system_prompt: value })}
          variables={variableAutocomplete}
          placeholder="Instructions for the AI when handling this route... Type { to see available variables"
          rows={6}
        />
        <VariablePreview template={formData.system_prompt} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Enabled Tools</label>
        <div className="flex flex-wrap gap-2">
          {availableTools.map((tool) => (
            <button
              key={tool.name}
              type="button"
              onClick={() => handleToolToggle(tool.name)}
              className={`px-3 py-1 text-sm rounded border transition-colors ${
                formData.tools_enabled.includes(tool.name)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
              }`}
              title={tool.description}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Confidence Threshold</label>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={formData.confidence_threshold}
            onChange={(e) =>
              setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Turns</label>
          <Input
            type="number"
            min="1"
            max="50"
            value={formData.max_turns}
            onChange={(e) => setFormData({ ...formData, max_turns: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_entry_point}
            onChange={(e) => setFormData({ ...formData, is_entry_point: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm">Entry Point</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm">Active</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(formData)} disabled={isSaving || (!route && !formData.route_name)}>
          {isSaving ? "Saving..." : route ? "Update Route" : "Create Route"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// VARIABLE EDITOR COMPONENT
// ==========================================

interface VariableEditorProps {
  variable?: OrgVariable;
  onSave: (data: Partial<OrgVariable>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const VARIABLE_TYPES = [
  { value: "text", label: "Text (single line)" },
  { value: "textarea", label: "Text (multi-line)" },
  { value: "select", label: "Dropdown Select" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email Address" },
  { value: "calendar_picker", label: "Calendar Picker" },
];

const NAMESPACES = [
  { value: "location", label: "Location" },
  { value: "contact", label: "Contact" },
];

const CATEGORIES = [
  { value: "identity", label: "Identity (names, branding)" },
  { value: "contact_info", label: "Contact Info (phone, email)" },
  { value: "scheduling", label: "Scheduling (calendars, availability)" },
  { value: "business", label: "Business Settings" },
  { value: "custom", label: "Custom" },
];

function VariableEditor({ variable, onSave, onCancel, isSaving }: VariableEditorProps) {
  const [formData, setFormData] = useState({
    internal_key: variable?.internal_key || "",
    display_name: variable?.display_name || "",
    description: variable?.description || "",
    variable_type: variable?.variable_type || "text",
    namespace: variable?.namespace || "location",
    is_required: variable?.is_required ?? false,
    default_value: variable?.default_value || "",
    category: variable?.category || "",
    display_order: variable?.display_order ?? 0,
    options: variable?.options || [],
  });

  const [newOption, setNewOption] = useState({ value: "", label: "" });

  // Auto-generate internal_key from display_name
  const handleDisplayNameChange = (displayName: string) => {
    setFormData({
      ...formData,
      display_name: displayName,
      // Only auto-update internal_key if creating new variable and key is empty or matches auto-generated pattern
      internal_key: !variable
        ? displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
        : formData.internal_key,
    });
  };

  const handleAddOption = () => {
    if (newOption.value && newOption.label) {
      setFormData({
        ...formData,
        options: [...formData.options, { ...newOption }],
      });
      setNewOption({ value: "", label: "" });
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    // Clean up data before saving
    const saveData: Partial<OrgVariable> = {
      internal_key: formData.internal_key,
      display_name: formData.display_name,
      description: formData.description || null,
      variable_type: formData.variable_type as OrgVariable["variable_type"],
      namespace: formData.namespace,
      is_required: formData.is_required,
      default_value: formData.default_value || null,
      category: formData.category || null,
      display_order: formData.display_order,
    };

    // Only include options for select type
    if (formData.variable_type === "select" && formData.options.length > 0) {
      saveData.options = formData.options;
    } else {
      saveData.options = null;
    }

    onSave(saveData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Name *</label>
          <Input
            placeholder="e.g., AI Agent Name"
            value={formData.display_name}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Key *</label>
          <Input
            placeholder="e.g., ai_agent_name"
            value={formData.internal_key}
            onChange={(e) => setFormData({ ...formData, internal_key: e.target.value })}
            disabled={!!variable} // Can't change key after creation
            className={variable ? "bg-muted" : ""}
          />
          {!variable && (
            <p className="text-xs text-muted-foreground">Auto-generated from display name. Used in prompts as {`{namespace.${formData.internal_key || "key"}}`}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="What is this variable used for?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select
            value={formData.variable_type}
            onChange={(e) => setFormData({ ...formData, variable_type: e.target.value as typeof formData.variable_type })}
          >
            {VARIABLE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Namespace</label>
          <Select
            value={formData.namespace}
            onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
          >
            {NAMESPACES.map((ns) => (
              <option key={ns.value} value={ns.value}>
                {ns.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">None</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Options for select type */}
      {formData.variable_type === "select" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          <div className="space-y-2">
            {formData.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{option.value}</code>
                <span className="text-sm">{option.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Value"
                value={newOption.value}
                onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                className="w-32"
              />
              <Input
                placeholder="Label"
                value={newOption.label}
                onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                disabled={!newOption.value || !newOption.label}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Value</label>
          <Input
            placeholder="Optional default"
            value={formData.default_value}
            onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Order</label>
          <Input
            type="number"
            min="0"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_required}
            onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm">Required</span>
        </label>
        <span className="text-xs text-muted-foreground">
          Required variables must be filled in by locations before going live
        </span>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <span className="text-muted-foreground">Variable syntax: </span>
        <code className="bg-muted px-1.5 py-0.5 rounded">
          {`{${formData.namespace}.${formData.internal_key || "key"}}`}
        </code>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={isSaving || !formData.internal_key || !formData.display_name}
        >
          {isSaving ? "Saving..." : variable ? "Update Variable" : "Create Variable"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function OrgSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <OrgSetupPageContent />
    </Suspense>
  );
}
