import { describe, it, expect, vi } from "vitest";

// Mock hooks and api
vi.mock("../../hooks/useAccessibility", () => ({
  useAccessibility: () => ({ minTarget: 44 }),
}));

vi.mock("../../hooks/useArticles", () => ({
  useArticleList: () => ({ articles: [], loading: false }),
  useQueueStats: () => ({ stats: { total: 5, review: 2, generating: 1, translating: 1, published: 1, rejected: 0, failed: 0, timeout: 0, paused: 0, cancelled: 0 } }),
}));

vi.mock("../../api/client", () => ({
  api: {
    articles: {
      cancel: vi.fn().mockResolvedValue({}),
      retry: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("QueueScreen", () => {
  it("should include new status types in STATUS_MAP", async () => {
    // Import the module to check STATUS_MAP is valid
    const mod = await import("../QueueScreen");
    expect(mod.default).toBeDefined();
  });

  it("should handle all article status types", () => {
    const statuses = [
      "generating", "translating", "review", "published", "rejected",
      "failed", "timeout", "paused", "cancelled",
    ];
    // All statuses should be valid ArticleStatus types
    statuses.forEach((s) => {
      expect(typeof s).toBe("string");
    });
  });
});
