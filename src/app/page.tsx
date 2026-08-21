import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TrustCenterPublic } from "@/components/trust/trust-center-public";
import {
  getBrowserCompApiUrl,
  getPublicTrustPortal,
  getTrustOverview,
  getTrustVendors,
} from "@/lib/comp";
import { resolveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const loadPortal = cache(async () => {
  const headersList = await headers();
  const host = headersList.get("host");
  const friendlyUrl = resolveTenant(host, process.env.TRUST_TENANTS);

  if (!friendlyUrl) {
    notFound();
  }

  const portal = await getPublicTrustPortal(friendlyUrl);

  if (!portal) {
    notFound();
  }

  // Fetched in parallel and independently degradable: these sections are
  // additive, so a failure in one must not take down the page.
  const [overview, vendors] = await Promise.all([
    getTrustOverview(friendlyUrl),
    getTrustVendors(friendlyUrl),
  ]);

  return { portal, friendlyUrl, overview, vendors };
});

export async function generateMetadata(): Promise<Metadata> {
  const { portal } = await loadPortal();
  return {
    title: `${portal.organization.name} | Trust Center`,
    icons: portal.branding.faviconUrl
      ? { icon: portal.branding.faviconUrl }
      : undefined,
  };
}

export default async function Home() {
  const { portal, friendlyUrl, overview, vendors } = await loadPortal();
  const compApiUrl = getBrowserCompApiUrl();

  return (
    <main className="min-h-screen bg-[--tc-bg] px-6 py-16 text-[--tc-ink]">
      <TrustCenterPublic
        portal={portal}
        friendlyUrl={friendlyUrl}
        compApiUrl={compApiUrl}
        overview={overview}
        vendors={vendors}
      />
    </main>
  );
}
