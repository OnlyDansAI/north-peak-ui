"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { OrgRoute, AvailableTool } from "@/lib/api";

interface RouteEditorSheetProps {
  route: OrgRoute | null;
  availableTools: AvailableTool[];
  onSave: (route: OrgRoute) => Promise<void>;
  onClose: () => void;
}

// Tools that have configurable settings
const CONFIGURABLE_TOOLS: Record<string, { label: string; fields: ToolConfigField[] }> = {
  add_tag: {
    label: "Add Tag",
    fields: [
      {
        key: "allowed_tags",
        label: "Allowed Tags",
        type: "text",
        placeholder: "tag1, tag2, tag3 (comma-separated)",
        description: "Tags the AI can apply to contacts",
      },
    ],
  },
  book_appointment: {
    label: "Book Appointment",
    fields: [
      {
        key: "calendar_id",
        label: "Calendar ID",
        type: "text",
        placeholder: "Leave empty to use location default",
        description: "Specific calendar for this route (optional)",
      },
      {
        key: "default_duration",
        label: "Default Duration (minutes)",
        type: "number",
        placeholder: "30",
        description: "Default appointment duration",
      },
    ],
  },
  escalate: {
    label: "Escalate",
    fields: [
      {
        key: "assign_to",
        label: "Assign To",
        type: "text",
        placeholder: "User ID or team name",
        description: "Who to escalate to (optional)",
      },
      {
        key: "escalation_reason",
        label: "Default Reason",
        type: "text",
        placeholder: "Customer needs human assistance",
        description: "Default escalation reason",
      },
    ],
  },
  add_note: {
    label: "Add Note",
    fields: [
      {
        key: "note_prefix",
        label: "Note Prefix",
        type: "text",
        placeholder: "[AI Note]",
        description: "Prefix to add to all AI notes",
      },
    ],
  },
};

interface ToolConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  placeholder: string;
  description: string;
}

export function RouteEditorSheet({
  route,
  availableTools,
  onSave,
  onClose,
}: RouteEditorSheetProps) {
  const [formData, setFormData] = useState<OrgRoute | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Initialize form when route changes
  useEffect(() => {
    if (route) {
      setFormData({ ...route });
      setActiveTab("basic");
      setError(null);
    } else {
      setFormData(null);
    }
  }, [route]);

  if (!route || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToolToggle = (toolName: string) => {
    const current = formData.tools_enabled || [];
    const updated = current.includes(toolName)
      ? current.filter((t) => t !== toolName)
      : [...current, toolName];
    setFormData({ ...formData, tools_enabled: updated });
  };

  const handleToolConfigChange = (toolName: string, key: string, value: string | number) => {
    const currentConfig = formData.tool_config || {};
    const toolConfig = currentConfig[toolName] || {};
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

  const isToolEnabled = (toolName: string) => {
    return (formData.tools_enabled || []).includes(toolName);
  };

  const getToolConfigValue = (toolName: string, key: string): string => {
    const toolConfig = formData.tool_config || {};
    const config = toolConfig[toolName] as Record<string, unknown> | undefined;
    if (!config) return "";
    return String(config[key] || "");
  };

  const isFromAgent = route.source === "agent";

  return (
    <div
      className={`fixed inset-0 z-50 ${route ? "block" : "hidden"}`}
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
            <h2 className="text-lg font-semibold">Edit Route: {route.route_name}</h2>
            {isFromAgent && (
              <p className="text-sm text-muted-foreground">
                This route comes from the agent template. Changes create an org override.
              </p>
            )}
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
              <TabsTrigger value="router">Router</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            {/* Basic Settings Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Route Name</label>
                <Input
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="booking"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase with underscores (e.g., booking, faq, support)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Handles appointment booking requests"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confidence Threshold</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.confidence_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) || 0.7 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    0.0-1.0, higher = more certain before routing
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher = checked first when routing
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Turns</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.max_turns}
                    onChange={(e) =>
                      setFormData({ ...formData, max_turns: parseInt(e.target.value) || 10 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Max back-and-forth before escalation
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Options</label>
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_entry_point}
                        onChange={(e) => setFormData({ ...formData, is_entry_point: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Entry Point</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Router Tab - V2 AI Classification Settings */}
            <TabsContent value="router" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure how the AI router classifies messages for this route.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Route Description</label>
                <Textarea
                  value={formData.route_description || ""}
                  onChange={(e) => setFormData({ ...formData, route_description: e.target.value })}
                  placeholder="Handle appointment booking requests, schedule changes, and cancellations"
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  A clear description helps the AI router correctly classify incoming messages.
                  Be specific about what types of conversations this route handles.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model Override</label>
                <select
                  value={formData.model_name || ""}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value || null })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Inherit from template</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (fast, cost-effective)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (complex conversations)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (fast, reliable)</option>
                  <option value="gpt-4o">GPT-4o (highest quality)</option>
                  <option value="claude-3-haiku">Claude 3 Haiku (fast)</option>
                  <option value="claude-sonnet-4">Claude Sonnet 4 (balanced)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Use faster models for simple routes (FAQ), more capable models for complex routes (booking).
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Router Examples</label>
                <Textarea
                  value={(formData.router_examples || []).join("\n")}
                  onChange={(e) => {
                    const examples = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    setFormData({ ...formData, router_examples: examples });
                  }}
                  placeholder="I want to book an appointment&#10;Can I schedule a meeting?&#10;I need to reschedule my visit&#10;Cancel my appointment please"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  One example message per line. These help the AI router learn what messages belong to this route.
                  Include variations of how customers might phrase their requests.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-700 text-sm">
                <strong>Routing Tips:</strong>
                <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                  <li>Be specific in your description - avoid generic terms</li>
                  <li>Include 4-8 example messages for best results</li>
                  <li>Use examples that reflect real customer language</li>
                  <li>Higher confidence threshold = fewer false positives</li>
                </ul>
              </div>
            </TabsContent>

            {/* Prompt Tab */}
            <TabsContent value="prompt" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">System Prompt</label>
                <Textarea
                  value={formData.system_prompt || ""}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are a helpful booking assistant. Your goal is to schedule appointments for customers..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Instructions for the AI when handling this route. Use variables like{" "}
                  <code className="bg-muted px-1 rounded">{"{contact.first_name}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{org.business_name}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{ai_agent_name}"}</code>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-700 text-sm">
                <strong>Available Variables:</strong>
                <ul className="mt-1 text-xs space-y-1">
                  <li><code>{"{contact.first_name}"}</code> - Contact's first name</li>
                  <li><code>{"{contact.email}"}</code> - Contact's email</li>
                  <li><code>{"{contact.phone}"}</code> - Contact's phone</li>
                  <li><code>{"{org.business_name}"}</code> - Organization name</li>
                  <li><code>{"{ai_agent_name}"}</code> - AI assistant name</li>
                  <li><code>{"{human_agent_name}"}</code> - Human agent name for escalations</li>
                </ul>
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which tools the AI can use when handling this route.
              </p>

              <div className="space-y-4">
                {availableTools.map((tool) => {
                  const enabled = isToolEnabled(tool.name);
                  const config = CONFIGURABLE_TOOLS[tool.name];

                  return (
                    <div
                      key={tool.name}
                      className={`p-4 border rounded-lg transition-colors ${
                        enabled ? "border-primary bg-primary/5" : "border-muted"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToolToggle(tool.name)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{tool.name}</div>
                          <div className="text-sm text-muted-foreground">{tool.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Category: {tool.category}
                          </div>
                        </div>
                      </label>

                      {/* Tool-specific config (only show if enabled and has config) */}
                      {enabled && config && (
                        <div className="mt-4 pl-7 space-y-3 border-t pt-3">
                          {config.fields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-sm font-medium">{field.label}</label>
                              {field.type === "textarea" ? (
                                <Textarea
                                  value={getToolConfigValue(tool.name, field.key)}
                                  onChange={(e) =>
                                    handleToolConfigChange(tool.name, field.key, e.target.value)
                                  }
                                  placeholder={field.placeholder}
                                  rows={3}
                                  className="text-sm"
                                />
                              ) : (
                                <Input
                                  type={field.type}
                                  value={getToolConfigValue(tool.name, field.key)}
                                  onChange={(e) =>
                                    handleToolConfigChange(
                                      tool.name,
                                      field.key,
                                      field.type === "number" ? parseInt(e.target.value) : e.target.value
                                    )
                                  }
                                  placeholder={field.placeholder}
                                  className="text-sm"
                                />
                              )}
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {availableTools.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No tools available. Tools are defined in the backend.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define goals for this route. Goals help the AI understand when a conversation is successful.
              </p>

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
  "primary": "book_appointment",
  "success_criteria": ["appointment_confirmed", "contact_details_collected"]
}`}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JSON object defining route goals. Common keys: primary, success_criteria, fallback.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
                <strong>Example Goals:</strong>
                <pre className="mt-2 text-xs overflow-auto">
{`{
  "primary": "book_appointment",
  "success_criteria": [
    "appointment_confirmed"
  ],
  "fallback": "escalate"
}`}
                </pre>
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
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
