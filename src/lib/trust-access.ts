/**
 * Client for Comp's token-gated trust-access endpoints.
 *
 * Every call here is made SERVER-SIDE with the visitor's token. The token is
 * the credential, so it stays on the server and out of any client bundle, and
 * the browser is never handed a Comp URL directly.
 */
import { getCompApiUrl } from "./comp";

export type NdaStatus = "pending" | "signed" | "void" | "expired";

export interface NdaView {
  id: string;
  organizationName: string;
  friendlyUrl: string | null;
  faviconUrl: string | null;
  requesterName: string;
  requesterEmail: string;
  expiresAt: string;
  portalUrl: string | null;
  status: NdaStatus;
  message?: string;
}

export interface GrantView {
  organizationName: string;
  friendlyUrl: string | null;
  faviconUrl: string | null;
  securityQuestionnaireEnabled: boolean;
  expiresAt: string;
  subjectEmail: string;
  ndaPdfUrl: string | null;
}

export interface GatedPolicy {
  id: string;
  name: string;
  description: string | null;
  lastPublishedAt: string | null;
  updatedAt: string;
}

export interface GatedDocument {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GatedComplianceResource {
  framework: string | null;
  customFrameworkId: string | null;
  customFrameworkName: string | null;
  fileName: string;
  fileSize: number | null;
  updatedAt: string;
}

/** A token that is unknown, revoked or expired. Callers render 404, never a stack trace. */
export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

function tokenPath(token: string, suffix = ""): string {
  return `${getCompApiUrl()}/v1/trust-access/access/${encodeURIComponent(token)}${suffix}`;
}

/**
 * Comp answers 404 for an unknown token but 400 for one that is revoked or
 * expired. Both mean "no access" to a visitor, and distinguishing them in the
 * UI would tell an attacker which tokens once existed, so they collapse here.
 */
async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (response.status === 404 || response.status === 400) {
    throw new AccessDeniedError("Access link is not valid");
  }

  if (!response.ok) {
    throw new Error(`Comp API returned ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

export async function getNda(token: string): Promise<NdaView> {
  return getJson<NdaView>(
    `${getCompApiUrl()}/v1/trust-access/nda/${encodeURIComponent(token)}`
  );
}

export async function signNda(
  token: string,
  name: string,
  email: string
): Promise<{ portalUrl: string | null }> {
  const response = await fetch(
    `${getCompApiUrl()}/v1/trust-access/nda/${encodeURIComponent(token)}/sign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, accept: true }),
      cache: "no-store",
    }
  );

  if (response.status === 404 || response.status === 400) {
    throw new AccessDeniedError("NDA signing link is not valid");
  }

  if (!response.ok) {
    throw new Error(`Comp API returned ${response.status} signing the NDA`);
  }

  const body = (await response.json()) as { portalUrl?: string | null };
  return { portalUrl: body.portalUrl ?? null };
}

export async function getGrant(token: string): Promise<GrantView> {
  return getJson<GrantView>(tokenPath(token));
}

export async function getGatedPolicies(token: string): Promise<GatedPolicy[]> {
  return getJson<GatedPolicy[]>(tokenPath(token, "/policies"));
}

export async function getGatedDocuments(token: string): Promise<GatedDocument[]> {
  return getJson<GatedDocument[]>(tokenPath(token, "/documents"));
}

export async function getGatedComplianceResources(
  token: string
): Promise<GatedComplianceResource[]> {
  return getJson<GatedComplianceResource[]>(
    tokenPath(token, "/compliance-resources")
  );
}

export type DownloadKind = "policy" | "document" | "framework" | "custom-framework";

/** Maps a download to the Comp endpoint that mints its signed URL. */
export function downloadEndpoint(
  token: string,
  kind: DownloadKind,
  id: string
): string {
  const t = encodeURIComponent(token);
  const i = encodeURIComponent(id);
  const base = `${getCompApiUrl()}/v1/trust-access/access/${t}`;

  switch (kind) {
    case "policy":
      return `${base}/policies/${i}/download`;
    case "document":
      return `${base}/documents/${i}`;
    case "framework":
      return `${base}/compliance-resources/${i}`;
    case "custom-framework":
      return `${base}/compliance-resources/custom/${i}`;
  }
}

export async function getSignedDownload(
  token: string,
  kind: DownloadKind,
  id: string
): Promise<{ signedUrl: string; fileName: string }> {
  return getJson<{ signedUrl: string; fileName: string }>(
    downloadEndpoint(token, kind, id)
  );
}
