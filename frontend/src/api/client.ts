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

  health: () => request<{ status: string; version: string; ws_connections: number }>("/health"),
};
