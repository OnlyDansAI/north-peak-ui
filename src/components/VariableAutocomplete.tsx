"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { VariableAutocomplete } from "@/lib/api";

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  variables: VariableAutocomplete | null;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function VariableAutocompleteTextarea({
  value,
  onChange,
  variables,
  placeholder,
  rows = 6,
  className,
}: VariableAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // All available variables flattened
  const allVariables = [
    ...(variables?.contact || []).map((v) => ({ ...v, namespace: "contact" })),
    ...(variables?.location || []).map((v) => ({ ...v, namespace: "location" })),
  ];

  // Filter variables based on input
  const filteredVariables = suggestionFilter
    ? allVariables.filter(
        (v) =>
          v.key.toLowerCase().includes(suggestionFilter.toLowerCase()) ||
          v.display.toLowerCase().includes(suggestionFilter.toLowerCase())
      )
    : allVariables;

  // Check if cursor is inside a variable pattern
  const checkForVariablePattern = useCallback((text: string, position: number) => {
    // Look backwards from cursor for {
    let start = position - 1;
    while (start >= 0 && text[start] !== "{" && text[start] !== "}" && text[start] !== "\n") {
      start--;
    }

    if (start >= 0 && text[start] === "{") {
      // Found opening brace, extract partial variable
      const partial = text.slice(start + 1, position);
      // Don't trigger if there's already a closing brace
      if (!partial.includes("}")) {
        return { start: start + 1, partial };
      }
    }

    return null;
  }, []);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(position);

    // Check for variable pattern
    const pattern = checkForVariablePattern(newValue, position);
    if (pattern) {
      setSuggestionFilter(pattern.partial);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestionFilter("");
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredVariables.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredVariables.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredVariables.length) % filteredVariables.length);
        break;
      case "Enter":
      case "Tab":
        if (showSuggestions) {
          e.preventDefault();
          insertVariable(filteredVariables[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Insert selected variable
  const insertVariable = (variable: typeof allVariables[0]) => {
    if (!textareaRef.current) return;

    const text = value;
    const position = cursorPosition;
    const pattern = checkForVariablePattern(text, position);

    if (pattern) {
      // Replace partial with full variable
      const before = text.slice(0, pattern.start - 1); // Before the {
      const after = text.slice(position);
      const newValue = `${before}${variable.variable}${after}`;

      onChange(newValue);

      // Move cursor after inserted variable
      const newPosition = before.length + variable.variable.length;
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
        textareaRef.current?.focus();
      }, 0);
    }

    setShowSuggestions(false);
    setSuggestionFilter("");
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full px-3 py-2 text-sm border rounded-md font-mono",
          "focus:outline-none focus:ring-2 focus:ring-primary",
          "resize-y min-h-[100px]",
          className
        )}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && filteredVariables.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-background border rounded-md shadow-lg"
        >
          {filteredVariables.map((variable, index) => (
            <button
              key={`${variable.namespace}-${variable.key}`}
              type="button"
              onClick={() => insertVariable(variable)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                "hover:bg-muted transition-colors",
                index === selectedIndex && "bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {variable.variable}
                </code>
                <span className="text-muted-foreground">{variable.display}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    variable.namespace === "contact"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {variable.namespace}
                </span>
                {variable.is_required && (
                  <span className="text-xs text-orange-600">required</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-1">
        Type <code className="bg-muted px-1 rounded">{"{"}</code> to see available variables
      </p>
    </div>
  );
}

// Variable preview component
interface VariablePreviewProps {
  template: string;
  sampleData?: {
    contact?: Record<string, string>;
    location?: Record<string, string>;
  };
}

export function VariablePreview({ template, sampleData }: VariablePreviewProps) {
  const defaultData = {
    contact: {
      first_name: "John",
      last_name: "Smith",
      email: "john@example.com",
      phone: "+1 555 123 4567",
      timezone: "America/Denver",
      city: "Denver",
      state: "CO",
    },
    location: {
      business_name: "North Peak Insurance",
      ai_agent_name: "Sarah",
      human_agent_name: "Dan",
      calendar_id: "cal_12345",
    },
  };

  const data: Record<string, Record<string, string>> = {
    contact: { ...defaultData.contact, ...sampleData?.contact },
    location: { ...defaultData.location, ...sampleData?.location },
  };

  // Replace variables in template
  const rendered = template.replace(/\{(contact|location)\.(\w+)\}/g, (match, namespace, key) => {
    const value = data[namespace]?.[key];
    return value || match;
  });

  // Find unreplaced variables
  const unreplaced = template.match(/\{(contact|location)\.\w+\}/g)?.filter((v) => {
    const matchResult = v.match(/\{(contact|location)\.(\w+)\}/);
    if (!matchResult) return true;
    const [, namespace, key] = matchResult;
    return !data[namespace]?.[key];
  });

  if (!template) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Preview with sample data:</div>
      <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap font-mono">
        {rendered}
      </div>
      {unreplaced && unreplaced.length > 0 && (
        <div className="text-xs text-orange-600">
          Unknown variables: {unreplaced.join(", ")}
        </div>
      )}
    </div>
  );
}
