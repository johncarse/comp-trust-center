import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustCenterPublic } from "@/components/trust/trust-center-public";
import type { PublicTrustPortalResponse } from "@/lib/comp";

const BASE_PORTAL: PublicTrustPortalResponse = {
  organization: { name: "Acme Inc", friendlyUrl: "acme" },
  branding: { faviconUrl: null },
  contact: { email: "trust@acme.com", privacyPolicyUrl: "https://acme.com/privacy" },
  frameworks: [
    { id: "soc2", label: "SOC 2 Type II" },
    { id: "iso27001", label: "ISO 27001" },
  ],
  policies: [
    { id: "p1", name: "Access Control Policy", updatedAt: "2026-01-15T00:00:00.000Z" },
  ],
  access: { restricted: true },
  generatedAt: "2026-08-20T00:00:00.000Z",
};

describe("TrustCenterPublic", () => {
  it("renders the organization name, framework badges, and policy list", () => {
    render(
      <TrustCenterPublic portal={BASE_PORTAL} friendlyUrl="acme" compApiUrl="https://comp.example.com" />
    );

    expect(screen.getByText(/Acme Inc/)).toBeInTheDocument();
    expect(screen.getByText("SOC 2 Type II")).toBeInTheDocument();
    expect(screen.getByText("ISO 27001")).toBeInTheDocument();
    expect(screen.getByText("Access Control Policy")).toBeInTheDocument();
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument();
  });

  it("renders the contact email and privacy policy link", () => {
    render(
      <TrustCenterPublic portal={BASE_PORTAL} friendlyUrl="acme" compApiUrl="https://comp.example.com" />
    );

    const emailLink = screen.getByRole("link", { name: /trust@acme\.com/ });
    expect(emailLink).toHaveAttribute("href", "mailto:trust@acme.com");

    const privacyLink = screen.getByRole("link", { name: /privacy/i });
    expect(privacyLink).toHaveAttribute("href", "https://acme.com/privacy");
  });

  it("tells visitors requests are limited to company email addresses when access is restricted", () => {
    render(
      <TrustCenterPublic portal={BASE_PORTAL} friendlyUrl="acme" compApiUrl="https://comp.example.com" />
    );

    expect(
      screen.getByText(/company email addresses only/i)
    ).toBeInTheDocument();
  });

  it("does not show the restricted-access notice when access is open", () => {
    const openPortal: PublicTrustPortalResponse = {
      ...BASE_PORTAL,
      access: { restricted: false },
    };

    render(
      <TrustCenterPublic portal={openPortal} friendlyUrl="acme" compApiUrl="https://comp.example.com" />
    );

    expect(
      screen.queryByText(/company email addresses only/i)
    ).not.toBeInTheDocument();
  });
});
