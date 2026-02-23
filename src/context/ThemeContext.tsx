"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("chat-theme") as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) return stored;
  } catch {
    // SSR / no localStorage
  }
  return "system";
}

function getSystemResolved(): "light" | "dark" {
  try {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // On mount: read stored preference, apply immediately (no flash)
  useEffect(() => {
    const stored = getStoredTheme();
    const resolved =
      stored === "system" ? getSystemResolved() : stored;
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
    setMounted(true);
  }, []);

  // Re-apply whenever theme changes
  useEffect(() => {
    if (!mounted) return;

    if (theme === "system") {
      const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
      const resolved: "light" | "dark" = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyThemeClass(resolved);

      const handler = (e: MediaQueryListEvent) => {
        const r: "light" | "dark" = e.matches ? "dark" : "light";
        setResolvedTheme(r);
        applyThemeClass(r);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      setResolvedTheme(theme);
      applyThemeClass(theme);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("chat-theme", newTheme);
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
