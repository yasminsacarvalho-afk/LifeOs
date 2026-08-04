import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "theme-cosmos" | "theme-ocean" | "theme-forest" | "theme-dracula" | "theme-monochrome";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("theme-cosmos");

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = localStorage.getItem("lifeos_theme") as ThemeType;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme class to document body
    document.body.classList.remove(
      "theme-cosmos",
      "theme-ocean",
      "theme-forest",
      "theme-dracula",
      "theme-monochrome"
    );
    document.body.classList.add(theme);
    localStorage.setItem("lifeos_theme", theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
