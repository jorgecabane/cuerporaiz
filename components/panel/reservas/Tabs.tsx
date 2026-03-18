"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type TabsContextValue = {
  value: string;
  onChange: (v: string) => void;
  tabIds: string[];
  registerTab: (id: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs used outside TabsRoot");
  return ctx;
}

export function TabsRoot({
  defaultValue,
  value: controlledValue,
  onChange,
  children,
  "aria-label": ariaLabel,
}: {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  "aria-label": string;
}) {
  const [tabIds, setTabIds] = useState<string[]>([]);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const registerTab = useCallback((id: string) => {
    setTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleChange = useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onChange?.(v);
    },
    [isControlled, onChange]
  );

  return (
    <TabsContext.Provider
      value={{
        value: (value || tabIds[0]) ?? "",
        onChange: handleChange,
        tabIds,
        registerTab,
      }}
    >
      <div className="flex flex-col" role="tablist" aria-label={ariaLabel}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-nowrap gap-0 border-b border-[var(--color-border)] overflow-x-auto ${className}`}
      style={{ scrollbarWidth: "thin" }}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  id,
  children,
}: {
  value: string;
  id?: string;
  children: ReactNode;
}) {
  const { value: selected, onChange, registerTab } = useTabs();
  const tabId = id ?? `tab-${value}`;
  useEffect(() => {
    registerTab(value);
  }, [value, registerTab]);

  const isSelected = selected === value;
  const triggerStyle = {
    borderBottomColor: isSelected ? "var(--color-primary)" : "transparent",
    color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)",
  };

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={"panel-" + value}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onChange(value)}
      className="min-w-0 shrink-0 rounded-t-[var(--radius-md)] border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
      style={triggerStyle}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  id,
  children,
  className = "",
}: {
  value: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: selected } = useTabs();
  const panelId = id ?? `panel-${value}`;
  const tabId = `tab-${value}`;

  if (selected !== value) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      className={`pt-4 ${className}`}
    >
      {children}
    </div>
  );
}
