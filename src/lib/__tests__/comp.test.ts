import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicTrustPortal, getTrustAccessRequestUrl } from "@/lib/comp";

const SAMPLE_RESPONSE = {
  organization: { name: "Acme Inc", friendlyUrl: "acme" },
  branding: { faviconUrl: null },
  contact: { email: "trust@acme.com", privacyPolicyUrl: "https://acme.com/privacy" },
  frameworks: [{ id: "soc2", label: "SOC 2 Type II" }],
  policies: [{ id: "p1", name: "Access Control Policy", updatedAt: "2026-01-15T00:00:00.000Z" }],
  access: { restricted: true },
  generatedAt: "2026-08-20T00:00:00.000Z",
};

describe("getPublicTrustPortal", () => {
  const originalEnv = process.env.COMP_API_URL;

  beforeEach(() => {
    process.env.COMP_API_URL = "https://comp.internal.example.com";
  });

  afterEach(() => {
    process.env.COMP_API_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  it("fetches the public trust portal payload from the configured Comp instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPublicTrustPortal("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://comp.internal.example.com/v1/trust-portal/public/acme",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it("encodes the friendlyUrl in the request path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPublicTrustPortal("weird/tenant name");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://comp.internal.example.com/v1/trust-portal/public/weird%2Ftenant%20name",
      expect.anything()
    );
  });

  it("returns null on a 404 instead of throwing — no published portal for this tenant", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "not found" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPublicTrustPortal("unknown-tenant");
    expect(result).toBeNull();
  });

  it("throws on non-404 error responses instead of silently returning null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicTrustPortal("acme")).rejects.toThrow();
  });

  it("throws a clear error when COMP_API_URL is not configured", async () => {
    delete process.env.COMP_API_URL;
    await expect(getPublicTrustPortal("acme")).rejects.toThrow(/COMP_API_URL/);
  });
});

describe("getTrustAccessRequestUrl", () => {
  it("builds the request-access endpoint URL for a tenant", () => {
    expect(getTrustAccessRequestUrl("https://comp.example.com", "acme")).toBe(
      "https://comp.example.com/v1/trust-access/acme/requests"
    );
  });

  it("strips a trailing slash from the base URL", () => {
    expect(getTrustAccessRequestUrl("https://comp.example.com/", "acme")).toBe(
      "https://comp.example.com/v1/trust-access/acme/requests"
    );
  });

  it("encodes the friendlyUrl", () => {
    expect(getTrustAccessRequestUrl("https://comp.example.com", "weird tenant")).toBe(
      "https://comp.example.com/v1/trust-access/weird%20tenant/requests"
    );
  });
});
