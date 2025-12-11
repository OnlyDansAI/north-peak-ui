"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgRoute, AvailableTool } from "@/lib/api";
import { RouteEditorSheet } from "./RouteEditorSheet";

interface RouteListProps {
  routes: OrgRoute[];
  availableTools: AvailableTool[];
  onCreateRoute: (route: Partial<OrgRoute>) => Promise<void>;
  onUpdateRoute: (route: OrgRoute) => Promise<void>;
  onDeleteRoute: (routeId: string) => Promise<void>;
}

export function RouteList({
  routes,
  availableTools,
  onCreateRoute,
  onUpdateRoute,
  onDeleteRoute,
}: RouteListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoute, setEditingRoute] = useState<OrgRoute | null>(null);
  const [newRouteName, setNewRouteName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick create a new route (just name), then open editor
  const handleQuickCreate = async () => {
    if (!newRouteName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateRoute({
        route_name: newRouteName.trim().toLowerCase().replace(/\s+/g, "_"),
        description: "",
        system_prompt: "",
        tools_enabled: [],
        confidence_threshold: 0.7,
        priority: 100,
        is_entry_point: true,
        is_active: true,
      });
      setNewRouteName("");
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm("Delete this route? This cannot be undone.")) return;

    try {
      await onDeleteRoute(routeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Routes</CardTitle>
        <CardDescription>
          Configure AI conversation routes with custom prompts, tools, and goals.
          Routes from the base agent template are shown in gray.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Quick Add Route */}
        <div className="flex gap-2">
          {isCreating ? (
            <>
              <Input
                placeholder="Route name (e.g., booking, support)"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickCreate();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewRouteName("");
                  }
                }}
                autoFocus
                className="flex-1"
              />
              <Button
                onClick={handleQuickCreate}
                disabled={!newRouteName.trim() || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewRouteName("");
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsCreating(true)}>+ Add Route</Button>
          )}
        </div>

        {/* Route List */}
        <div className="space-y-2">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onEdit={() => setEditingRoute(route)}
              onDelete={() => handleDelete(route.id)}
            />
          ))}
          {routes.length === 0 && (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No routes defined yet. Click "Add Route" to create one.
            </p>
          )}
        </div>

        {/* Route Editor Sheet */}
        <RouteEditorSheet
          route={editingRoute}
          availableTools={availableTools}
          onSave={async (updated) => {
            await onUpdateRoute(updated);
            setEditingRoute(null);
          }}
          onClose={() => setEditingRoute(null)}
        />
      </CardContent>
    </Card>
  );
}

// Individual route card component
interface RouteCardProps {
  route: OrgRoute;
  onEdit: () => void;
  onDelete: () => void;
}

function RouteCard({ route, onEdit, onDelete }: RouteCardProps) {
  const isFromAgent = route.source === "agent";
  const toolCount = route.tools_enabled?.length || 0;
  const hasGoals = Object.keys(route.goals || {}).length > 0;

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        isFromAgent
          ? "bg-muted/30 border-muted"
          : "bg-background hover:border-primary/50"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{route.route_name}</span>
            {isFromAgent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                template
              </span>
            )}
            {!route.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                inactive
              </span>
            )}
            {route.is_entry_point && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                entry
              </span>
            )}
          </div>
          {route.description && (
            <p className="text-sm text-muted-foreground mt-1">{route.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Confidence: {(route.confidence_threshold * 100).toFixed(0)}%</span>
            <span>Priority: {route.priority}</span>
            <span>Max turns: {route.max_turns}</span>
            {toolCount > 0 && <span>{toolCount} tool{toolCount !== 1 ? "s" : ""}</span>}
            {hasGoals && <span>Has goals</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          {!isFromAgent && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      {route.system_prompt && (
        <pre className="text-xs bg-muted/50 p-2 rounded mt-3 overflow-auto max-h-20 whitespace-pre-wrap">
          {route.system_prompt.slice(0, 200)}
          {route.system_prompt.length > 200 && "..."}
        </pre>
      )}
    </div>
  );
}
