import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccessDeniedError,
  downloadEndpoint,
  getGatedPolicies,
  getGrant,
  getNda,
  getSignedDownload,
  signNda,
} from "@/lib/trust-access";

const originalEnv = process.env.COMP_API_URL;

beforeEach(() => {
  process.env.COMP_API_URL = "https://comp.internal.example.com";
});

afterEach(() => {
  process.env.COMP_API_URL = originalEnv;
  vi.restoreAllMocks();
});

function mockResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("downloadEndpoint", () => {
  it("routes each download kind to its own Comp endpoint", () => {
    expect(downloadEndpoint("tok", "policy", "p1")).toBe(
      "https://comp.internal.example.com/v1/trust-access/access/tok/policies/p1/download"
    );
    expect(downloadEndpoint("tok", "document", "d1")).toBe(
      "https://comp.internal.example.com/v1/trust-access/access/tok/documents/d1"
    );
    expect(downloadEndpoint("tok", "framework", "soc2")).toBe(
      "https://comp.internal.example.com/v1/trust-access/access/tok/compliance-resources/soc2"
    );
    expect(downloadEndpoint("tok", "custom-framework", "cf1")).toBe(
      "https://comp.internal.example.com/v1/trust-access/access/tok/compliance-resources/custom/cf1"
    );
  });

  it("encodes a token containing url-significant characters", () => {
    expect(downloadEndpoint("a/b?c", "document", "d/1")).toContain(
      "access/a%2Fb%3Fc/documents/d%2F1"
    );
  });
});

describe("access failures", () => {
  it("collapses an unknown token and a revoked one into the same error", async () => {
    // Comp answers 404 for unknown and 400 for revoked/expired. Telling those
    // apart in the UI would reveal which tokens once existed.
    for (const status of [404, 400]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(status));
      await expect(getGrant("tok")).rejects.toBeInstanceOf(AccessDeniedError);
    }
  });

  it("does not disguise a genuine server fault as denied access", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(500));
    await expect(getGrant("tok")).rejects.not.toBeInstanceOf(AccessDeniedError);
  });
});

describe("getNda", () => {
  it("returns the signing status so the page can branch on it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(200, {
        id: "n1",
        organizationName: "Acme",
        requesterName: "Dana",
        requesterEmail: "dana@example.com",
        status: "pending",
      })
    );
    await expect(getNda("tok")).resolves.toMatchObject({ status: "pending" });
  });
});

describe("signNda", () => {
  it("posts the acceptance and returns where to send the signer next", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        mockResponse(200, { portalUrl: "https://trust.example.com/access/abc" })
      );

    await expect(signNda("tok", "Dana", "dana@example.com")).resolves.toEqual({
      portalUrl: "https://trust.example.com/access/abc",
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/trust-access/nda/tok/sign");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Dana",
      email: "dana@example.com",
      accept: true,
    });
  });

  it("reports a revoked signing link as denied rather than a crash", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(400));
    await expect(signNda("tok", "Dana", "dana@example.com")).rejects.toBeInstanceOf(
      AccessDeniedError
    );
  });
});

describe("gated content", () => {
  it("requests policies under the token's own path", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse(200, []));
    await getGatedPolicies("tok");
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://comp.internal.example.com/v1/trust-access/access/tok/policies"
    );
  });

  it("never caches gated reads", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse(200, []));
    await getGatedPolicies("tok");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.cache).toBe("no-store");
  });

  it("returns the signed url and filename for a download", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(200, { signedUrl: "https://s3/x", fileName: "SOC2.pdf" })
    );
    await expect(getSignedDownload("tok", "document", "d1")).resolves.toEqual({
      signedUrl: "https://s3/x",
      fileName: "SOC2.pdf",
    });
  });
});
