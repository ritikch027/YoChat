import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorSchemeName, useColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedScheme: ColorSchemeName;
};

const STORAGE_KEY = "yochat.theme.mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (saved === "light" || saved === "dark" || saved === "system") {
          setModeState(saved);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const resolvedScheme: ColorSchemeName = useMemo(() => {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return systemScheme ?? "light";
  }, [mode, systemScheme]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      resolvedScheme,
    }),
    [mode, resolvedScheme, setMode],
  );

  // avoid a flash of wrong theme while storage loads
  if (!hydrated) return <>{children}</>;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: "system" as ThemeMode,
      setMode: (_m: ThemeMode) => {},
      resolvedScheme: (useColorScheme() ?? "light") as ColorSchemeName,
    };
  }
  return ctx;
};

