import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  AccessDeniedError,
  getGatedComplianceResources,
  getGatedDocuments,
  getGatedPolicies,
  getGrant,
} from "@/lib/trust-access";

export const dynamic = "force-dynamic";

/**
 * The granted view is a route of its own rather than the public portal page
 * re-rendered with a token in hand. The content differs, and a single render
 * path that can conditionally hold grant data is one mistake away from
 * leaking it into an unauthenticated response.
 */
const load = cache(async (token: string) => {
  try {
    const grant = await getGrant(token);
    const [policies, documents, complianceResources] = await Promise.all([
      getGatedPolicies(token),
      getGatedDocuments(token),
      getGatedComplianceResources(token),
    ]);
    return { grant, policies, documents, complianceResources };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      notFound();
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const { grant } = await load(token);
  return {
    title: `${grant.organizationName} | Secure Documents`,
    // A grant URL must never reach a search index.
    robots: { index: false, follow: false },
  };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  // UTC on purpose: server-side timestamps must not shift a day for viewers
  // west of UTC. An access grant that expires 2026-09-19T00:00:00Z should not
  // read as expiring Sep 18.
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DownloadRow({
  href,
  name,
  meta,
}: {
  href: string;
  name: string;
  meta: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-slate-200 py-3 last:border-0">
      <div className="min-w-0">
        <a
          href={href}
          className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600"
        >
          {name}
        </a>
        <p className="mt-0.5 text-sm text-slate-500">{meta}</p>
      </div>
    </li>
  );
}

export default async function AccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { grant, policies, documents, complianceResources } = await load(token);
  const base = `/access/${encodeURIComponent(token)}/download`;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-slate-900">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {grant.organizationName}
        </h1>
        <p className="mt-1 text-slate-600">Secure document access</p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-500">
          <div>
            <dt className="inline">Granted to </dt>
            <dd className="inline font-medium text-slate-700">
              {grant.subjectEmail}
            </dd>
          </div>
          <div>
            <dt className="inline">Access expires </dt>
            <dd className="inline font-medium text-slate-700">
              {formatDate(grant.expiresAt)}
            </dd>
          </div>
        </dl>
      </header>

      {grant.ndaPdfUrl ? (
        <p className="mt-6 text-sm text-slate-600">
          Your signed NDA is on file.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Policies</h2>
        {policies.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No policies are available under this grant.
          </p>
        ) : (
          <ul className="mt-3">
            {policies.map((policy) => (
              <DownloadRow
                key={policy.id}
                href={`${base}/policy/${encodeURIComponent(policy.id)}`}
                name={policy.name}
                meta={`Updated ${formatDate(policy.lastPublishedAt ?? policy.updatedAt)}`}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Reports and certificates</h2>
        {documents.length === 0 && complianceResources.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No additional documents are available under this grant.
          </p>
        ) : (
          <ul className="mt-3">
            {documents.map((doc) => (
              <DownloadRow
                key={doc.id}
                href={`${base}/document/${encodeURIComponent(doc.id)}`}
                name={doc.name}
                meta={doc.description ?? `Added ${formatDate(doc.createdAt)}`}
              />
            ))}
            {complianceResources.map((resource) => {
              const isCustom = Boolean(resource.customFrameworkId);
              const id = isCustom
                ? resource.customFrameworkId!
                : (resource.framework ?? "");
              const label =
                resource.customFrameworkName ?? resource.framework ?? resource.fileName;
              return (
                <DownloadRow
                  key={`${label}-${resource.fileName}`}
                  href={`${base}/${isCustom ? "custom-framework" : "framework"}/${encodeURIComponent(id)}`}
                  name={label}
                  meta={`${resource.fileName} · updated ${formatDate(resource.updatedAt)}`}
                />
              );
            })}
          </ul>
        )}
      </section>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
        These materials are confidential and provided under the terms you
        accepted. This link is personal to you and expires on{" "}
        {formatDate(grant.expiresAt)}.
      </footer>
    </main>
  );
}
