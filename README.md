# comp-trust-center

A self-hosted **trust center for [Comp AI](https://github.com/trycompai/comp)** — the
public-facing trust portal that the upstream project does not ship.

## Why this exists

Comp AI is AGPL-licensed and self-hostable, and it contains almost all of a trust
portal already: access requests, NDA signing and countersigning, time-limited token
grants, per-document and bulk downloads, approve/deny/revoke workflows, framework
badges, and document management. All of it is reachable over its public API at
`/v1/trust-access/*`, which is genuinely unauthenticated for the visitor-facing routes.

What upstream keeps proprietary is the **renderer** — the page a customer's security
reviewer actually looks at. It lives in their hosted `trust.inc` SaaS. In a self-hosted
install:

- the "your portal is live at `trust.inc/<slug>`" link in the admin UI is a hardcoded
  string pointing at their SaaS, which has never heard of your organization;
- the custom-domain feature is an API client for **Vercel** — it attaches your domain to
  *their* Vercel project, so it cannot work for anyone else;
- `Trust.status = 'published'` is a flag in your database with no reader.

This project is that missing reader. Point it at your own Comp instance and serve it on
your own domain.

## Status

**Scaffolding.** The tree is currently a verbatim import of
[kodustech/trust-center](https://github.com/kodustech/trust-center) (MIT), which provides
an excellent public trust page. The adaptation — replacing its YAML + Supabase content
layer with reads against a Comp AI instance, and adding Host-based multi-tenancy — is
described in [`docs/ADAPTATION.md`](docs/ADAPTATION.md) and is in progress.

Not yet usable as-is against Comp. Watch the issues.

## Design

```
  visitor
    │
    ▼
comp-trust-center  ──── GET  /v1/trust-portal/public/{friendlyUrl}   (portal content)
 (this project)    ──── POST /v1/trust-access/{friendlyUrl}/requests (access request)
                   ──── GET  /v1/trust-access/access/{token}/...     (granted downloads)
    │
    ▼
your Comp AI instance (source of truth: policies, badges, grants, NDAs)
```

The portal is a **renderer with no database of its own**. Content is whatever your Comp
instance says it is, so the page cannot drift from your actual compliance state — the
failure mode of every hand-maintained trust page.

One deployment serves multiple tenants: the organization is resolved from the request's
`Host` header, so `trust.example.com` and `trust.othercorp.com` can be the same pod
backed by two organizations in one Comp install.

## Licensing

MIT. Derived from [kodustech/trust-center](https://github.com/kodustech/trust-center)
(MIT, © 2025 Kodus) — their copyright is preserved in `LICENSE` and their component work
is the basis of the public page.

This project talks to Comp AI over HTTP and contains **no** Comp AI code, so it is not a
derivative work of that AGPL codebase and carries no AGPL obligations. If you modify Comp
AI itself, the AGPL applies to those changes, not to this.

Comp AI is a trademark of Comp AI, Inc. This project is not affiliated with or endorsed by
Comp AI, Inc. or Kodus.
