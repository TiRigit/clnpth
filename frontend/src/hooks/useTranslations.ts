import { useState, useEffect, useCallback } from "react";
import { api, TranslationResponse } from "../api/client";

export function useTranslations(articleId: number | null) {
  const [translations, setTranslations] = useState<TranslationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (articleId === null) {
      setTranslations([]);
      return;
    }
    try {
      setLoading(true);
      const data = await api.translations.list(articleId);
      setTranslations(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const trigger = useCallback(
    async (languages?: string[]) => {
      if (articleId === null) return;
      try {
        await api.translations.trigger(articleId, languages);
        // Pipeline runs in background — refresh after short delay
        setTimeout(refresh, 1000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Starten");
      }
    },
    [articleId, refresh]
  );

  const approve = useCallback(
    async (lang: string) => {
      if (articleId === null) return;
      try {
        await api.translations.approve(articleId, lang);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Freigeben");
      }
    },
    [articleId, refresh]
  );

  const edit = useCallback(
    async (lang: string, data: { titel?: string; lead?: string; body?: string }) => {
      if (articleId === null) return;
      try {
        await api.translations.edit(articleId, lang, data);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    },
    [articleId, refresh]
  );

  return { translations, loading, error, refresh, trigger, approve, edit };
}
