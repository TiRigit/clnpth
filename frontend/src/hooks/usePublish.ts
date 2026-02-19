import { useState, useEffect, useCallback } from "react";
import { api, type PublishStatus } from "../api/client";

export function usePublish(articleId: number | null) {
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (articleId === null) return;
    try {
      const data = await api.publish.status(articleId);
      setStatus(data);
    } catch {
      // silent — article may not be published yet
    }
  }, [articleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const publish = useCallback(
    async (wpStatus: string = "draft", languages?: string[]) => {
      if (articleId === null) return;
      try {
        setPublishing(true);
        setError(null);
        await api.publish.trigger(articleId, wpStatus, languages);
        // Publishing runs in background — poll after delay
        setTimeout(refresh, 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Publizieren");
      } finally {
        setPublishing(false);
      }
    },
    [articleId, refresh]
  );

  return { status, publishing, error, publish, refresh };
}
