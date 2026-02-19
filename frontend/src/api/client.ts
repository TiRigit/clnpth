const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// ── Types matching backend response schemas ──

export interface ArticleListItem {
  id: number;
  titel: string;
  status: string;
  kategorie: string | null;
  sprachen: Record<string, boolean> | null;
  trigger_typ: string;
  erstellt_am: string;
  aktualisiert_am: string;
}

export interface TranslationResponse {
  id: number;
  sprache: string;
  titel: string | null;
  lead: string | null;
  body: string | null;
  status: string;
}

export interface SupervisorResponse {
  id: number;
  supervisor_empfehlung: string | null;
  supervisor_begruendung: string | null;
  supervisor_score: number | null;
  tonality_tags: string[] | null;
  redakteur_entscheidung: string | null;
  redakteur_feedback: string | null;
  abweichung: boolean;
}

export interface ArticleDetail extends ArticleListItem {
  lead: string | null;
  body: string | null;
  quellen: unknown[] | null;
  seo_titel: string | null;
  seo_description: string | null;
  bild_url: string | null;
  bild_prompt: string | null;
  translations: TranslationResponse[];
  supervisor: SupervisorResponse | null;
}

export interface QueueStats {
  total: number;
  generating: number;
  translating: number;
  review: number;
  published: number;
  rejected: number;
}

export interface CreateArticlePayload {
  trigger_typ: string;
  text: string;
  kategorie?: string;
  sprachen?: Record<string, boolean>;
  urls?: string[];
  bild_typ?: string;
}

export interface TonalityEntry {
  id: number;
  merkmal: string;
  wert: string;
  gewichtung: number;
  belege: number;
}

export interface TopicRanking {
  id: number;
  thema: string;
  kategorie: string;
  artikel_count: number;
  freigabe_rate: number | null;
  letzter_artikel: string | null;
}

export interface DeviationStats {
  total_decisions: number;
  deviations: number;
  deviation_rate: number;
}

export interface SupervisorDecision {
  id: number;
  artikel_id: number;
  empfehlung: string | null;
  score: number | null;
  redakteur_entscheidung: string | null;
  abweichung: boolean;
  erstellt_am: string | null;
}

export interface SupervisorDashboard {
  tonality_profile: TonalityEntry[];
  themen_ranking: TopicRanking[];
  recent_decisions: SupervisorDecision[];
  deviation_stats: DeviationStats;
}

export interface PublishStatus {
  artikel_id: number;
  published: boolean;
  publications: Record<string, { wp_post_id: number }>;
}

export interface WpCheckResult {
  connected: boolean;
  wp_url: string | null;
  categories: { id: number; name: string }[];
}

// ── API functions ──

export const api = {
  articles: {
    list: (status?: string) =>
      request<ArticleListItem[]>(
        `/articles/${status ? `?status=${status}` : ""}`
      ),

    get: (id: number) => request<ArticleDetail>(`/articles/${id}`),

    create: (payload: CreateArticlePayload) =>
      request<ArticleListItem>("/articles/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    stats: () => request<QueueStats>("/articles/stats"),

    approve: (id: number, feedback?: string) =>
      request<ArticleListItem>(`/articles/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ feedback }),
      }),

    revise: (id: number, feedback?: string) =>
      request<ArticleListItem>(`/articles/${id}/revise`, {
        method: "PATCH",
        body: JSON.stringify({ feedback }),
      }),
  },

  translations: {
    list: (articleId: number) =>
      request<TranslationResponse[]>(`/articles/${articleId}/translations/`),

    get: (articleId: number, lang: string) =>
      request<TranslationResponse>(`/articles/${articleId}/translations/${lang}`),

    trigger: (articleId: number, languages?: string[]) =>
      request<{ ok: boolean; artikel_id: number; languages: string[] }>(
        `/articles/${articleId}/translations/trigger`,
        {
          method: "POST",
          body: JSON.stringify({ languages: languages ?? null }),
        }
      ),

    edit: (articleId: number, lang: string, data: { titel?: string; lead?: string; body?: string }) =>
      request<TranslationResponse>(`/articles/${articleId}/translations/${lang}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    approve: (articleId: number, lang: string) =>
      request<{ ok: boolean }>(`/articles/${articleId}/translations/${lang}/approve`, {
        method: "POST",
      }),
  },

  images: {
    trigger: (articleId: number, prompt: string, imageType: string = "illustration") =>
      request<{ ok: boolean; artikel_id: number; backend: string }>(
        `/articles/${articleId}/image/trigger`,
        {
          method: "POST",
          body: JSON.stringify({ prompt, image_type: imageType }),
        }
      ),

    status: (articleId: number) =>
      request<{ artikel_id: number; bild_url: string | null; bild_prompt: string | null; status: string }>(
        `/articles/${articleId}/image/status`
      ),

    backends: (articleId: number) =>
      request<{ comfyui: boolean; runpod: boolean }>(
        `/articles/${articleId}/image/backends`
      ),
  },

  supervisor: {
    dashboard: () =>
      request<SupervisorDashboard>("/supervisor/dashboard"),

    evaluate: (artikelId: number) =>
      request<{ ok: boolean }>("/supervisor/evaluate", {
        method: "POST",
        body: JSON.stringify({ artikel_id: artikelId }),
      }),

    tonality: () =>
      request<TonalityEntry[]>("/supervisor/tonality"),

    addTonality: (merkmal: string, wert: string, gewichtung: number = 0.5) =>
      request<{ ok: boolean }>("/supervisor/tonality", {
        method: "POST",
        body: JSON.stringify({ merkmal, wert, gewichtung }),
      }),

    deleteTonality: (entryId: number) =>
      request<{ ok: boolean }>(`/supervisor/tonality/${entryId}`, {
        method: "DELETE",
      }),

    topics: () =>
      request<TopicRanking[]>("/supervisor/topics"),

    deviations: () =>
      request<DeviationStats>("/supervisor/deviations"),
  },

  publish: {
    trigger: (articleId: number, wpStatus: string = "draft", languages?: string[]) =>
      request<{ ok: boolean; artikel_id: number }>(`/articles/${articleId}/publish/`, {
        method: "POST",
        body: JSON.stringify({ wp_status: wpStatus, languages: languages ?? null, upload_image: true }),
      }),

    status: (articleId: number) =>
      request<PublishStatus>(`/articles/${articleId}/publish/status`),

    wpCheck: (articleId: number) =>
      request<WpCheckResult>(`/articles/${articleId}/publish/wp-check`),
  },

  health: () => request<{ status: string; version: string; ws_connections: number }>("/health"),
};
