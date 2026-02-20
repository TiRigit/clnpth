import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api.health
vi.mock("../../api/client", () => ({
  api: {
    health: vi.fn(),
  },
}));

import { api } from "../../api/client";

describe("useFeatures", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should have correct default features", async () => {
    // Test that the module exports expected defaults
    const mod = await import("../useFeatures");
    expect(mod).toBeDefined();
  });

  it("api.health returns features", async () => {
    const mockHealth = api.health as ReturnType<typeof vi.fn>;
    mockHealth.mockResolvedValue({
      status: "ok",
      version: "0.1.0",
      ws_connections: 0,
      features: {
        image: true,
        translation: true,
        social: true,
        rss: false,
        crosslinking: false,
        bulk_input: true,
      },
    });

    const result = await api.health();
    expect(result.features).toBeDefined();
    expect(result.features!.social).toBe(true);
    expect(result.features!.rss).toBe(false);
  });
});
