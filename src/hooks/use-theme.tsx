import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "claro" | "escuro" | "sistema";

export const THEME_STORAGE_KEY = "mc_theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(preference: ThemePreference): boolean {
  return preference === "escuro" || (preference === "sistema" && systemPrefersDark());
}

function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle("dark", resolveIsDark(preference));
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "sistema";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "claro" || stored === "escuro" || stored === "sistema" ? stored : "sistema";
}

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Single shared source of truth, mounted once at the app root — this is what keeps the "sistema"
 * option reacting live to OS theme changes no matter which page is open, and keeps every reader
 * (e.g. Configurações) in sync with the same value instead of drifting independent copies. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "sistema") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("sistema");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
