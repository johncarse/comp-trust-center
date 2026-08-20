import { describe, expect, it } from "vitest";
import { resolveTenant } from "@/lib/tenant";

describe("resolveTenant", () => {
  const tenants = "trust.acme.com=acme,trust.globex.com=globex";

  it("resolves the friendlyUrl for a configured host", () => {
    expect(resolveTenant("trust.acme.com", tenants)).toBe("acme");
    expect(resolveTenant("trust.globex.com", tenants)).toBe("globex");
  });

  it("ignores a port suffix on the Host header", () => {
    expect(resolveTenant("trust.acme.com:3000", tenants)).toBe("acme");
  });

  it("matches case-insensitively", () => {
    expect(resolveTenant("TRUST.ACME.COM", tenants)).toBe("acme");
  });

  it("returns null for an unknown host, never a default tenant", () => {
    expect(resolveTenant("evil.example.com", tenants)).toBeNull();
  });

  it("returns null when no host header is present", () => {
    expect(resolveTenant(null, tenants)).toBeNull();
    expect(resolveTenant(undefined, tenants)).toBeNull();
  });

  it("returns null when TRUST_TENANTS is not configured, never a default", () => {
    expect(resolveTenant("trust.acme.com", undefined)).toBeNull();
    expect(resolveTenant("trust.acme.com", "")).toBeNull();
  });

  it("skips malformed entries instead of throwing", () => {
    const malformed = "not-a-pair,trust.acme.com=acme";
    expect(resolveTenant("trust.acme.com", malformed)).toBe("acme");
    expect(resolveTenant("not-a-pair", malformed)).toBeNull();
  });

  it("never falls back to the first configured tenant for an unmatched host", () => {
    const single = "trust.acme.com=acme";
    expect(resolveTenant("trust.globex.com", single)).toBeNull();
  });
});
