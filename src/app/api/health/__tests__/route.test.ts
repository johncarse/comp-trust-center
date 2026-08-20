import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  it("returns 200 without resolving a tenant or calling Comp", async () => {
    // No Host header, no TRUST_TENANTS, no COMP_API_URL: a probe must succeed
    // on a server that is up even when it is misconfigured or Comp is down.
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
