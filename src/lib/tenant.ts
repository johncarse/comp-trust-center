/**
 * Resolves the Comp `friendlyUrl` for an inbound request's Host header.
 *
 * TRUST_TENANTS format: "host1=friendlyUrl1,host2=friendlyUrl2".
 * An unmapped host always resolves to null — there is no default tenant,
 * because serving one org's data on another org's hostname is the worst
 * failure mode this app can have.
 */
export function resolveTenant(
  host: string | null | undefined,
  tenantsConfig: string | undefined
): string | null {
  if (!host || !tenantsConfig) {
    return null;
  }

  const normalizedHost = host.split(":")[0].trim().toLowerCase();
  if (!normalizedHost) {
    return null;
  }

  for (const entry of tenantsConfig.split(",")) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) continue;

    const separatorIndex = trimmedEntry.indexOf("=");
    if (separatorIndex === -1) continue;

    const entryHost = trimmedEntry.slice(0, separatorIndex).trim().toLowerCase();
    const friendlyUrl = trimmedEntry.slice(separatorIndex + 1).trim();

    if (entryHost === normalizedHost && friendlyUrl) {
      return friendlyUrl;
    }
  }

  return null;
}
