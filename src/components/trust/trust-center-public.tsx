"use client";

import { useState } from "react";
import type {
  PublicTrustPortalResponse,
  TrustCustomLink,
  TrustOverview,
  TrustVendor,
} from "@/lib/comp";
import { Markdown } from "@/lib/markdown";
import { RequestDocumentDialog } from "./request-document-dialog";

interface Props {
  portal: PublicTrustPortalResponse;
  friendlyUrl: string;
  compApiUrl: string;
  overview?: TrustOverview | null;
  vendors?: TrustVendor[];
  customLinks?: TrustCustomLink[];
}

function formatDate(value: string): string {
  // Formatted in UTC deliberately. These are server-side document timestamps,
  // and a policy stamped 2026-01-15T00:00:00Z would otherwise display as
  // Jan 14 to every viewer west of UTC — a wrong date on a compliance page.
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Only `certified` may read as a claim; `status` is progress, shown plainly. */
function FrameworkBadge({
  label,
  status,
  certified,
}: {
  label: string;
  status?: string;
  certified?: boolean;
}) {
  const note = certified
    ? null
    : status === "compliant" || status === "in_progress"
      ? "In progress"
      : null;

  return (
    <li className="flex items-baseline gap-2 border border-[var(--tc-rule)] px-3 py-2">
      <span className="text-sm font-medium text-[var(--tc-ink)]">{label}</span>
      {note ? (
        <span className="text-xs text-[var(--tc-faint)]">{note}</span>
      ) : certified ? (
        <span className="text-xs text-[var(--tc-accent)]">Certified</span>
      ) : null}
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--tc-rule)] pt-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tc-faint)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function TrustCenterPublic({
  portal,
  friendlyUrl,
  compApiUrl,
  overview,
  vendors = [],
  customLinks = [],
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  function handleRequest(policyName: string) {
    setSelectedPolicy(policyName);
    setDialogOpen(true);
  }

  const hasOverview = Boolean(overview?.content);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--tc-ink)]">
          {portal.organization.name}
        </h1>
        <p className="mt-2 text-[var(--tc-muted)]">Trust Center</p>
      </header>

      <div className="mt-12 space-y-10">
        {hasOverview ? (
          <Section title={overview?.title || "Security overview"}>
            <Markdown content={overview!.content!} />
          </Section>
        ) : null}

        {portal.frameworks.length > 0 ? (
          <Section title="Frameworks">
            <ul className="flex flex-wrap gap-2">
              {portal.frameworks.map((f) => (
                <FrameworkBadge
                  key={f.id}
                  label={f.label}
                  status={f.status}
                  certified={f.certified}
                />
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Policies">
          {portal.policies.length === 0 ? (
            <p className="text-sm text-[var(--tc-muted)]">
              No policies have been published yet. Use the request link below
              and we will respond directly.
            </p>
          ) : (
            <ul>
              {portal.policies.map((policy) => (
                <li
                  key={policy.id}
                  className="flex items-baseline justify-between gap-6 border-b border-[var(--tc-rule)] py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--tc-ink)]">{policy.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--tc-faint)]">
                      Updated {formatDate(policy.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequest(policy.name)}
                    className="shrink-0 text-sm text-[var(--tc-accent)] underline underline-offset-4"
                  >
                    Request
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {vendors.length > 0 ? (
          <Section title="Subprocessors">
            <ul>
              {vendors.map((vendor) => (
                <li
                  key={vendor.id}
                  className="border-b border-[var(--tc-rule)] py-3 last:border-0"
                >
                  <div className="flex items-baseline justify-between gap-6">
                    <p className="font-medium text-[var(--tc-ink)]">{vendor.name}</p>
                    {vendor.trustPortalUrl ? (
                      <a
                        href={vendor.trustPortalUrl}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                        className="shrink-0 text-sm text-[var(--tc-accent)] underline underline-offset-4"
                      >
                        Trust page
                      </a>
                    ) : vendor.website ? (
                      <a
                        href={vendor.website}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                        className="shrink-0 text-sm text-[var(--tc-faint)] underline underline-offset-4"
                      >
                        Website
                      </a>
                    ) : null}
                  </div>
                  {vendor.description ? (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--tc-muted)]">
                      {vendor.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {portal.contact.privacyPolicyUrl || customLinks.length > 0 ? (
          <Section title="Documents and policies">
            <ul>
              {/* The privacy policy is the one legal URL Comp models as a
                  first-class field; it belongs with the other documents
                  rather than under Contact, which is a way to reach us. */}
              {portal.contact.privacyPolicyUrl ? (
                <li className="border-b border-[var(--tc-rule)] py-3 last:border-0">
                  <a
                    href={portal.contact.privacyPolicyUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="font-medium text-[var(--tc-accent)] underline underline-offset-4"
                  >
                    Privacy Policy
                  </a>
                </li>
              ) : null}
              {customLinks.map((link) => (
                <li
                  key={link.id}
                  className="border-b border-[var(--tc-rule)] py-3 last:border-0"
                >
                  <a
                    href={link.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="font-medium text-[var(--tc-accent)] underline underline-offset-4"
                  >
                    {link.title}
                  </a>
                  {link.description ? (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--tc-muted)]">
                      {link.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {portal.contact.email ? (
          <Section title="Contact">
            <p className="text-sm text-[var(--tc-muted)]">
              Security questions or vulnerability reports:{" "}
              <a
                href={`mailto:${portal.contact.email}`}
                className="text-[var(--tc-accent)] underline underline-offset-4"
              >
                {portal.contact.email}
              </a>
            </p>
          </Section>
        ) : null}

        <Section title="Request documents">
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--tc-muted)]">
            Policies, reports and certificates are available under NDA. Request
            access and we will respond directly.
          </p>
          {portal.access.restricted ? (
            <p className="mt-2 max-w-2xl text-sm text-[var(--tc-faint)]">
              Requests are accepted from company email addresses only.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => handleRequest("Security documentation")}
            className="mt-4 border border-[var(--tc-ink)] px-4 py-2 text-sm font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-ink)] hover:text-[var(--tc-bg)]"
          >
            Request access
          </button>
        </Section>
      </div>

      <footer className="mt-16 border-t border-[var(--tc-rule)] pt-6 text-xs text-[var(--tc-faint)]">
        Last updated {formatDate(portal.generatedAt)}
      </footer>

      <RequestDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policyName={selectedPolicy}
        organizationName={portal.organization.name}
        friendlyUrl={friendlyUrl}
        compApiUrl={compApiUrl}
      />
    </div>
  );
}
