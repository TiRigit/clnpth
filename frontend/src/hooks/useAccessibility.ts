import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface A11ySettings {
  /** Barrierearmer Modus (Default: an) — groessere Touch-Targets, Focus-Visible, Skip-Nav */
  accessible: boolean;
  /** Farbenblind-Modus — zusaetzliche Pattern-Indikatoren neben Farben */
  colorblind: boolean;
}

const STORAGE_KEY = "clnpth-a11y";

const DEFAULTS: A11ySettings = {
  accessible: true,
  colorblind: false,
};

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
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
  toggle: (key: keyof A11ySettings) => void;
  /** Min touch-target size: 44px (accessible) or 0 (compact) */
  minTarget: number;
  /** Spacing multiplier: 1 (accessible) or 0.75 (compact) */
  spacing: number;
}

export const AccessibilityContext = createContext<A11yContext>({
  ...DEFAULTS,
  toggle: () => {},
  minTarget: 44,
  spacing: 1,
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

export function useAccessibilityProvider(): A11yContext {
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    // CSS-Klassen auf html-Element setzen
    const root = document.documentElement;
    root.classList.toggle("a11y-accessible", settings.accessible);
    root.classList.toggle("a11y-compact", !settings.accessible);
    root.classList.toggle("a11y-colorblind", settings.colorblind);
  }, [settings]);

  const toggle = useCallback((key: keyof A11ySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    ...settings,
    toggle,
    minTarget: settings.accessible ? 44 : 0,
    spacing: settings.accessible ? 1 : 0.75,
  };
}
