export interface PublicTrustPortalResponse {
  organization: { name: string; friendlyUrl: string };
  branding: { faviconUrl: string | null };
  contact: { email: string | null; privacyPolicyUrl: string | null };
  frameworks: Array<{
    id: string;
    label: string;
    /** started | in_progress | compliant — progress, NOT a certification claim. */
    status?: string;
    /** The org's published assertion. Only this may be rendered as certified. */
    certified?: boolean;
  }>;
  policies: Array<{ id: string; name: string; updatedAt: string }>;
  access: { restricted: boolean };
  generatedAt: string;
}

export function getCompApiUrl(): string {
  const url = process.env.COMP_API_URL;
  if (!url) {
    throw new Error("COMP_API_URL is not configured");
  }
  return url.replace(/\/+$/, "");
}

/**
 * Fetches the published trust portal for a tenant. A 404 from Comp means
 * there is no published portal for this tenant and resolves to null so
 * callers can render a clean 404 instead of crashing.
 */
export async function getPublicTrustPortal(
  friendlyUrl: string
): Promise<PublicTrustPortalResponse | null> {
  const baseUrl = getCompApiUrl();
  const response = await fetch(
    `${baseUrl}/v1/trust-portal/public/${encodeURIComponent(friendlyUrl)}`,
    { cache: "no-store" }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Comp API returned ${response.status} fetching trust portal for "${friendlyUrl}"`
    );
  }

  return (await response.json()) as PublicTrustPortalResponse;
}

/**
 * Base URL the BROWSER uses to reach Comp, read at request time.
 *
 * Deliberately NOT a NEXT_PUBLIC_ variable: Next inlines those at build time,
 * which would freeze one deployment's API URL into the image and make the
 * same image unusable for another tenant or environment. This is read
 * server-side in a force-dynamic route and handed to the client component as
 * a prop, so a plain runtime variable reaches the browser just as well while
 * staying configurable per deployment.
 */
export function getBrowserCompApiUrl(): string {
  const url = process.env.COMP_PUBLIC_API_URL;
  if (!url) {
    throw new Error("COMP_PUBLIC_API_URL is not configured");
  }
  return url.replace(/\/+$/, "");
}

/** Builds the visitor-facing access-request endpoint URL for a tenant. */
export function getTrustAccessRequestUrl(
  compApiBaseUrl: string,
  friendlyUrl: string
): string {
  const baseUrl = compApiBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/v1/trust-access/${encodeURIComponent(friendlyUrl)}/requests`;
}

export interface TrustOverview {
  title: string | null;
  content: string | null;
}

export interface TrustVendor {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  trustPortalUrl?: string | null;
}

/**
 * Public per-tenant reads that sit outside the aggregate portal payload.
 * Each degrades to a null/empty result rather than throwing: a trust page
 * missing its subprocessor list should still render everything else.
 */
async function getPublicSection<T>(
  friendlyUrl: string,
  section: string,
  fallback: T,
): Promise<T> {
  try {
    const response = await fetch(
      `${getCompApiUrl()}/v1/trust-access/${encodeURIComponent(friendlyUrl)}/${section}`,
      { cache: "no-store" },
    );
    if (!response.ok) return fallback;
    const body = await response.json();
    return (body ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function getTrustOverview(friendlyUrl: string): Promise<TrustOverview | null> {
  return getPublicSection<TrustOverview | null>(friendlyUrl, "overview", null);
}

export function getTrustVendors(friendlyUrl: string): Promise<TrustVendor[]> {
  return getPublicSection<TrustVendor[]>(friendlyUrl, "vendors", []);
}
