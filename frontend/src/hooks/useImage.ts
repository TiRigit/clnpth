import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";

interface ImageState {
  status: "pending" | "generating" | "ready" | "failed";
  bild_url: string | null;
  bild_prompt: string | null;
}

export function useImage(articleId: number | null) {
  const [image, setImage] = useState<ImageState>({
    status: "pending",
    bild_url: null,
    bild_prompt: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (articleId === null) return;
    try {
      const data = await api.images.status(articleId);
      setImage({
        status: data.status as ImageState["status"],
        bild_url: data.bild_url,
        bild_prompt: data.bild_prompt,
      });
      // Stop polling when done
      if (data.status === "ready" || data.status === "failed") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // silent — article may not have archiv yet
    }
  }, [articleId]);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [refresh]);

  const trigger = useCallback(
    async (prompt: string, imageType: string = "illustration") => {
      if (articleId === null) return;
      try {
        setLoading(true);
        setError(null);
        await api.images.trigger(articleId, prompt, imageType);
        setImage((prev) => ({ ...prev, status: "generating", bild_prompt: prompt }));

        // Start polling for status
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(refresh, 5000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Starten");
      } finally {
        setLoading(false);
      }
    },
    [articleId, refresh]
  );

  return { image, loading, error, trigger, refresh };
}
