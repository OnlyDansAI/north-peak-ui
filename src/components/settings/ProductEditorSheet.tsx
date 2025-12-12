"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Product, AvailableTool } from "@/lib/api";

interface ProductEditorSheetProps {
  product: Product | null;
  availableTools: AvailableTool[];
  onSave: (product: Product) => Promise<void>;
  onClose: () => void;
  isNew?: boolean;
}

export function ProductEditorSheet({
  product,
  availableTools,
  onSave,
  onClose,
  isNew = false,
}: ProductEditorSheetProps) {
  const [formData, setFormData] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      setFormData({ ...product });
      setActiveTab("basic");
      setError(null);
    } else {
      setFormData(null);
    }
  }, [product]);

  if (!product || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;

    // Validate required fields
    if (!formData.name?.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.slug?.trim()) {
      setError("Product slug is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToolConfigChange = (toolName: string, key: string, value: string | number | boolean) => {
    const currentConfig = formData.tool_config || {};
    const toolConfig = (currentConfig[toolName] as Record<string, unknown>) || {};
    setFormData({
      ...formData,
      tool_config: {
        ...currentConfig,
        [toolName]: {
          ...toolConfig,
          [key]: value,
        },
      },
    });
  };

  const getToolConfigValue = (toolName: string, key: string): string => {
    const config = formData.tool_config || {};
    const toolConfig = config[toolName] as Record<string, unknown> | undefined;
    if (!toolConfig) return "";
    return String(toolConfig[key] || "");
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const updates: Partial<Product> = { name };
    // Auto-generate slug if this is a new product or slug hasn't been manually edited
    if (isNew || formData.slug === slugify(formData.name || "")) {
      updates.slug = slugify(name);
    }
    setFormData({ ...formData, ...updates });
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${product ? "block" : "hidden"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet - slides in from right */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              {isNew ? "New Product" : `Edit Product: ${product.name}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure how the AI handles this product/service
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="tools">Tool Config</TabsTrigger>
              <TabsTrigger value="tags">Auto-Tagging</TabsTrigger>
            </TabsList>

            {/* Basic Settings Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Life Insurance"
                />
                <p className="text-xs text-muted-foreground">
                  Display name for this product/service
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="life-insurance"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (lowercase, hyphens)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Comprehensive life insurance policies for individuals and families"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Brief description for the AI to understand this product
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority || 100}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher = more prominent in recommendations
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Options</label>
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default || false}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Default Product</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Detection Keywords</label>
                <Textarea
                  value={(formData.detection_keywords || []).join(", ")}
                  onChange={(e) => {
                    const keywords = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    setFormData({ ...formData, detection_keywords: keywords });
                  }}
                  placeholder="life insurance, whole life, term life, death benefit"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords to help detect when users mention this product
                </p>
              </div>
            </TabsContent>

            {/* Prompt Tab */}
            <TabsContent value="prompt" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">System Prompt</label>
                <Textarea
                  value={formData.system_prompt || ""}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="When discussing life insurance products, emphasize the peace of mind and financial security benefits..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Product-specific instructions appended to the route prompt when this product is detected.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Goals (JSON)</label>
                <Textarea
                  value={JSON.stringify(formData.goals || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const goals = JSON.parse(e.target.value);
                      setFormData({ ...formData, goals });
                    } catch {
                      // Invalid JSON - ignore
                    }
                  }}
                  placeholder={`{
  "primary": "schedule_consultation",
  "upsell": ["disability_insurance", "long_term_care"]
}`}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Product-specific goals that override or extend route goals
                </p>
              </div>
            </TabsContent>

            {/* Tool Config Tab - V2 */}
            <TabsContent value="tools" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure tool behavior when this product is detected. These settings override the route defaults.
              </p>

              <div className="space-y-4">
                {/* Book Appointment Config */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium">Book Appointment Settings</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm">Calendar ID Override</label>
                      <Input
                        value={getToolConfigValue("book_appointment", "calendar_id")}
                        onChange={(e) =>
                          handleToolConfigChange("book_appointment", "calendar_id", e.target.value)
                        }
                        placeholder="Leave empty to use route default"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use a specific calendar for this product
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Default Duration (min)</label>
                      <Input
                        type="number"
                        value={getToolConfigValue("book_appointment", "default_duration")}
                        onChange={(e) =>
                          handleToolConfigChange(
                            "book_appointment",
                            "default_duration",
                            parseInt(e.target.value) || 30
                          )
                        }
                        placeholder="30"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default appointment length
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm">Appointment Title Template</label>
                    <Input
                      value={getToolConfigValue("book_appointment", "title_template")}
                      onChange={(e) =>
                        handleToolConfigChange("book_appointment", "title_template", e.target.value)
                      }
                      placeholder="{product_name} Consultation - {contact.first_name}"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Template for appointment title. Use variables like {"{product_name}"}, {"{contact.first_name}"}
                    </p>
                  </div>
                </div>

                {/* Add Tag Config */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium">Add Tag Settings</h3>
                  <div className="space-y-1">
                    <label className="text-sm">Allowed Tags</label>
                    <Input
                      value={getToolConfigValue("add_tag", "allowed_tags")}
                      onChange={(e) =>
                        handleToolConfigChange("add_tag", "allowed_tags", e.target.value)
                      }
                      placeholder="interested, qualified, hot-lead (comma-separated)"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tags the AI can apply when this product is discussed
                    </p>
                  </div>
                </div>

                {/* Escalate Config */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium">Escalation Settings</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm">Assign To</label>
                      <Input
                        value={getToolConfigValue("escalate", "assign_to")}
                        onChange={(e) =>
                          handleToolConfigChange("escalate", "assign_to", e.target.value)
                        }
                        placeholder="Product specialist ID or team"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Route escalations to specific person/team
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Default Reason</label>
                      <Input
                        value={getToolConfigValue("escalate", "default_reason")}
                        onChange={(e) =>
                          handleToolConfigChange("escalate", "default_reason", e.target.value)
                        }
                        placeholder="Customer needs life insurance specialist"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Auto-Tagging Tab - V2 */}
            <TabsContent value="tags" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automatically apply tags to contacts based on conversation events.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags on Conversation Start</label>
                  <Textarea
                    value={(formData.tags_on_start || []).join("\n")}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      setFormData({ ...formData, tags_on_start: tags });
                    }}
                    placeholder="interested-in-life-insurance&#10;ai-conversation-started"
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    One tag per line. Applied when conversation about this product begins.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags on Appointment Booked</label>
                  <Textarea
                    value={(formData.tags_on_book || []).join("\n")}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      setFormData({ ...formData, tags_on_book: tags });
                    }}
                    placeholder="life-insurance-appt-booked&#10;qualified-lead"
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    One tag per line. Applied when an appointment is successfully booked for this product.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-700 text-sm">
                  <strong>Auto-Tagging Tips:</strong>
                  <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                    <li>Use descriptive tag names (e.g., "life-insurance-interested" not "tag1")</li>
                    <li>Tags help with GHL automation triggers and reporting</li>
                    <li>Tags are applied in addition to any route-level auto-tags</li>
                    <li>Ensure tags exist in GHL before using them here</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
