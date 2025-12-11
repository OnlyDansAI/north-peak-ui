"use client";

import { useState, useEffect, useCallback } from "react";
import { getTestContacts, type TestContact } from "@/lib/api";
import { Input } from "@/components/ui/input";

interface ContactPickerProps {
  locationId: string;
  onSelect: (contact: TestContact | null) => void;
  selectedContact: TestContact | null;
}

export function ContactPicker({ locationId, onSelect, selectedContact }: ContactPickerProps) {
  const [contacts, setContacts] = useState<TestContact[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchContacts = useCallback(async (searchQuery: string) => {
    if (!locationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTestContacts({
        locationId,
        search: searchQuery || undefined,
        limit: 20,
        excludeTest: true,
      });
      setContacts(result.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  // Fetch on mount and when search changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchContacts(search);
    }, 300);

    return () => clearTimeout(debounce);
  }, [search, fetchContacts]);

  const handleSelect = (contact: TestContact) => {
    onSelect(contact);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearch("");
  };

  // If a contact is selected, show a summary
  if (selectedContact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {selectedContact.display_name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {selectedContact.email || selectedContact.phone || "No contact info"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
            Shadow Mode
          </span>
          <button
            onClick={handleClear}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search contacts for shadow mode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pr-8"
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-muted-foreground hover:text-foreground border rounded-md transition-colors"
          title="Browse contacts"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-auto">
          {error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : contacts.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {isLoading ? "Loading..." : search ? "No contacts found" : "Type to search contacts"}
            </div>
          ) : (
            <div className="py-1">
              {contacts.map((contact) => (
                <button
                  key={contact.contact_id}
                  onClick={() => handleSelect(contact)}
                  className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-sm">{contact.display_name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {!contact.email && !contact.phone && <span>No contact info</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Hint at bottom */}
          <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            Shadow mode uses existing contacts without creating duplicates in GHL
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
