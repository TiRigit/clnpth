import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface A11ySettings {
  /** Barrierearmer Modus (Default: aus) — S/W-Kontrast, grosse Targets, Farbenblind-Pattern, volle ARIA */
  accessible: boolean;
}

const STORAGE_KEY = "clnpth-a11y";

const DEFAULTS: A11ySettings = {
  accessible: false,
};

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { accessible: Boolean(parsed.accessible) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: A11ySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage not available
  }
}

export interface A11yContext extends A11ySettings {
  toggle: () => void;
  /** Min touch-target size: 44px (accessible) or 0 (compact) */
  minTarget: number;
}

export const AccessibilityContext = createContext<A11yContext>({
  ...DEFAULTS,
  toggle: () => {},
  minTarget: 0,
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

export function useAccessibilityProvider(): A11yContext {
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    const root = document.documentElement;
    root.classList.toggle("a11y-accessible", settings.accessible);
    root.classList.toggle("a11y-compact", !settings.accessible);
    // Colorblind patterns are included in accessible mode
    root.classList.toggle("a11y-colorblind", settings.accessible);
  }, [settings]);

  const toggle = useCallback(() => {
    setSettings((prev) => ({ accessible: !prev.accessible }));
  }, []);

  return {
    ...settings,
    toggle,
    minTarget: settings.accessible ? 44 : 0,
  };
}
