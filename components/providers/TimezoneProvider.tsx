"use client";

import { createContext, useContext, type ReactNode } from "react";

const DEFAULT_TIMEZONE = "America/Santiago";

const TimezoneContext = createContext<string>(DEFAULT_TIMEZONE);

export function TimezoneProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

/** Devuelve la IANA timezone del centro actual. Default "America/Santiago". */
export function useTimezone(): string {
  return useContext(TimezoneContext);
}
