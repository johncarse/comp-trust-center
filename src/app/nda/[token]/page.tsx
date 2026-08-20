import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { AccessDeniedError, getNda, signNda } from "@/lib/trust-access";
import { SignForm } from "./sign-form";

export const dynamic = "force-dynamic";

const load = cache(async (token: string) => {
  try {
    return await getNda(token);
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
  const nda = await load(token);
  return {
    title: `${nda.organizationName} | Non-disclosure agreement`,
    robots: { index: false, follow: false },
  };
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12 text-slate-900">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

export default async function NdaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const nda = await load(token);

  if (nda.status === "expired" || nda.status === "void") {
    return (
      <Shell title={`${nda.organizationName}`}>
        <p className="mt-3 text-slate-600">
          {nda.message ??
            "This non-disclosure agreement link is no longer valid."}
        </p>
        <p className="mt-6 text-sm text-slate-500">
          Request access again from the trust center to receive a new link.
        </p>
      </Shell>
    );
  }

  if (nda.status === "signed") {
    return (
      <Shell title={nda.organizationName}>
        <p className="mt-3 text-slate-600">
          This agreement has already been signed.
        </p>
        {nda.portalUrl ? (
          <p className="mt-6">
            <a
              className="font-medium underline underline-offset-4"
              href={nda.portalUrl}
            >
              Continue to your documents
            </a>
          </p>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            Check your email for the access link.
          </p>
        )}
      </Shell>
    );
  }

  async function sign(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name || !email) {
      return { error: "Name and email are required." };
    }

    let portalUrl: string | null;
    try {
      ({ portalUrl } = await signNda(token, name, email));
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return { error: "This signing link is no longer valid." };
      }
      return { error: "The agreement could not be signed. Please try again." };
    }

    // Comp emails the access link as well; redirecting straight there saves
    // the visitor a round trip through their inbox.
    redirect(portalUrl ?? `/nda/${encodeURIComponent(token)}`);
  }

  return (
    <Shell title={`Non-disclosure agreement`}>
      <p className="mt-3 text-slate-600">
        {nda.organizationName} requires a signed non-disclosure agreement before
        releasing its security documents.
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Requested by {nda.requesterName} ({nda.requesterEmail}).
      </p>
      <SignForm
        defaultName={nda.requesterName}
        defaultEmail={nda.requesterEmail}
        action={sign}
      />
    </Shell>
  );
}
