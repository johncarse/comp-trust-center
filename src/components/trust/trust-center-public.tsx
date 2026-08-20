"use client";

import { useState } from "react";
import { FileText, Mail, ShieldCheck } from "lucide-react";
import type { PublicTrustPortalResponse } from "@/lib/comp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequestDocumentDialog } from "@/components/trust/request-document-dialog";

type Props = {
  portal: PublicTrustPortalResponse;
  friendlyUrl: string;
  compApiUrl: string;
};

export function TrustCenterPublic({ portal, friendlyUrl, compApiUrl }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  function handleRequest(policyName: string) {
    setSelectedPolicy(policyName);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/80 px-6 py-5 text-slate-900 shadow-sm">
        <div className="flex items-center gap-4">
          {portal.branding.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portal.branding.faviconUrl}
              alt=""
              className="h-10 w-10 rounded-lg border border-slate-200 object-contain"
            />
          )}
          <div>
            <h1 className="text-3xl font-semibold">
              {portal.organization.name} Trust Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Transparency about security, compliance, and infrastructure in one place.
            </p>
          </div>
        </div>
      </div>

      {portal.frameworks.length > 0 && (
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-slate-900">
              Certifications & frameworks
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {portal.frameworks.map((framework) => (
              <Badge key={framework.id} variant="outline">
                {framework.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-slate-900">
            Policies
          </CardTitle>
          <FileText className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          {portal.access.restricted && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Access requests are accepted from company email addresses only.
            </p>
          )}
          {portal.policies.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No policies have been published yet.
            </p>
          )}
          {portal.policies.map((policy) => (
            <div
              key={policy.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
            >
              <div>
                <p className="font-medium text-slate-900">{policy.name}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {policy.updatedAt.slice(0, 10)}
                </p>
              </div>
              <Button onClick={() => handleRequest(policy.name)}>
                Request access
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <RequestDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policyName={selectedPolicy}
        organizationName={portal.organization.name}
        friendlyUrl={friendlyUrl}
        compApiUrl={compApiUrl}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
        {portal.contact.email && (
          <a
            className="inline-flex items-center gap-2 hover:underline"
            href={`mailto:${portal.contact.email}`}
          >
            <Mail className="h-4 w-4" />
            {portal.contact.email}
          </a>
        )}
        {portal.contact.privacyPolicyUrl && (
          <a
            className="hover:underline"
            href={portal.contact.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy policy
          </a>
        )}
      </footer>
    </div>
  );
}
