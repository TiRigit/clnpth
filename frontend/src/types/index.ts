export type TriggerType = "prompt" | "url" | "rss" | "calendar" | "image";

export type ArticleStatus =
  | "generating"
  | "translating"
  | "review"
  | "published"
  | "rejected"
  | "failed"
  | "timeout"
  | "paused"
  | "cancelled";

export type Language = "de" | "en" | "es" | "fr";

export type ImageType = "illustration" | "infographic" | "photo" | "animation";

export type SupervisorRecommendation = "freigeben" | "ueberarbeiten" | "ablehnen";

export interface Article {
  id: number;
  titel: string;
  lead: string;
  body: string;
  status: ArticleStatus;
  triggerTyp: TriggerType;
  kategorie: string;
  sprachen: Record<Language, boolean>;
  quellen: Source[];
  supervisor: SupervisorResult | null;
  translations: Record<Language, Translation>;
  image: ImageResult | null;
  erstelltAm: string;
}

export interface Source {
  title: string;
  url: string | null;
  auto: boolean;
}

export interface SupervisorResult {
  score: number;
  recommendation: SupervisorRecommendation;
  reasoning: string;
  tonalityTags: string[];
  flags: string[];
}

export interface Translation {
  titel: string;
  lead: string;
  body: string;
  status: "pending" | "deepl_done" | "reviewed" | "approved";
  ready: boolean;
}

export interface ImageResult {
  prompt: string;
  url: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  altTexts: Record<Language, string>;
}

export interface QueueItem {
  id: number;
  title: string;
  status: ArticleStatus;
  langs: number;
  score: number | null;
  trigger: TriggerType;
  ago: string;
}

export type ScreenId = "input" | "review" | "queue" | "archive" | "supervisor";
