"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignForm({
  defaultName,
  defaultEmail,
  action,
}: {
  defaultName: string;
  defaultEmail: string;
  action: (formData: FormData) => Promise<{ error: string } | void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await action(formData);
        // A successful sign redirects, so reaching here means it failed.
        setPending(false);
        if (result?.error) setError(result.error);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="accept"
          required
          className="mt-1"
          aria-describedby="accept-help"
        />
        <span id="accept-help">
          I have read the non-disclosure agreement and agree to its terms on
          behalf of myself and my organization.
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing…" : "Sign and continue"}
      </Button>
    </form>
  );
}
