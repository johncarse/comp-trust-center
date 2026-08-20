import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TrustCenterPublic } from "@/components/trust/trust-center-public";
import { getPublicTrustPortal } from "@/lib/comp";
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

  return { portal, friendlyUrl };
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
  const { portal, friendlyUrl } = await loadPortal();
  const compApiUrl = process.env.COMP_API_URL ?? "";

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-10 text-slate-900 transition-colors">
      <TrustCenterPublic
        portal={portal}
        friendlyUrl={friendlyUrl}
        compApiUrl={compApiUrl}
      />
    </main>
  );
}
