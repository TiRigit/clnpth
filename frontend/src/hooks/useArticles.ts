import { useState, useEffect, useCallback } from "react";
import {
  api,
  type ArticleListItem,
  type ArticleDetail,
  type QueueStats,
  type CreateArticlePayload,
} from "../api/client";

export function useArticleList(statusFilter?: string) {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.articles.list(statusFilter);
      setArticles(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { articles, loading, error, refresh };
}

export function useArticleDetail(id: number | null) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (id === null) {
      setArticle(null);
      return;
    }
    try {
      setLoading(true);
      const data = await api.articles.get(id);
      setArticle(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { article, loading, error, refresh };
}

export function useQueueStats() {
  const [stats, setStats] = useState<QueueStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.articles.stats();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, refresh };
}

export function useCreateArticle() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (payload: CreateArticlePayload) => {
    try {
      setSubmitting(true);
      setError(null);
      const result = await api.articles.create(payload);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler beim Erstellen";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting, error };
}
