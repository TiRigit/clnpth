import { useState, useEffect, useCallback } from "react";
import {
  api,
  SupervisorDashboard,
  TonalityEntry,
  TopicRanking,
  DeviationStats,
} from "../api/client";

export function useSupervisorDashboard() {
  const [dashboard, setDashboard] = useState<SupervisorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.supervisor.dashboard();
      setDashboard(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const evaluate = useCallback(async (artikelId: number) => {
    try {
      await api.supervisor.evaluate(artikelId);
      // Evaluation runs in background — refresh after delay
      setTimeout(refresh, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Evaluieren");
    }
  }, [refresh]);

  const addTonality = useCallback(
    async (merkmal: string, wert: string, gewichtung: number = 0.5) => {
      try {
        await api.supervisor.addTonality(merkmal, wert, gewichtung);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      }
    },
    [refresh]
  );

  const deleteTonality = useCallback(
    async (entryId: number) => {
      try {
        await api.supervisor.deleteTonality(entryId);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Löschen");
      }
    },
    [refresh]
  );

  return {
    dashboard,
    loading,
    error,
    refresh,
    evaluate,
    addTonality,
    deleteTonality,
  };
}
