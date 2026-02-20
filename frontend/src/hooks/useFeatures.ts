import { useState, useEffect } from "react";
import { api } from "../api/client";

export interface Features {
  image: boolean;
  translation: boolean;
  social: boolean;
  rss: boolean;
  crosslinking: boolean;
  bulk_input: boolean;
}

const DEFAULT_FEATURES: Features = {
  image: true,
  translation: true,
  social: false,
  rss: false,
  crosslinking: false,
  bulk_input: false,
};

export function useFeatures() {
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.health().then((data) => {
      if (!cancelled && data.features) {
        setFeatures({ ...DEFAULT_FEATURES, ...data.features } as Features);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { features, loading };
}
