# Adapting the Kodus trust center to Comp AI

The upstream project is a YAML-driven trust page with its own Supabase-backed storage and
admin. Comp AI already *is* the admin and the database, so the adaptation is mostly
subtraction plus one new client.

## Keep

| Path | Why |
|---|---|
| `src/components/trust/trust-center-public.tsx` | The public page — hero, commitments, metrics, compliance cards, policies, documents, subprocessors, FAQs, contacts |
| `src/components/trust/request-document-dialog.tsx` | Maps onto Comp's access-request flow |
| `src/components/ui/**` | shadcn/Radix primitives the page is built from |
| `src/app/layout.tsx`, `src/app/page.tsx`, styles | App shell and theming |

## Remove — done

| Path | Why |
|---|---|
| `src/app/admin/**`, `src/app/builder/**`, `src/app/login/**` | Comp's own admin UI owns settings, documents, badges and the request queue |
| `src/app/api/auth/**` (next-auth), `src/middleware.ts`, `src/lib/auth*.ts`, `src/lib/require-admin.ts`, `src/components/auth/**` | No admin surface here means no admin login |
| `src/app/api/trust-config/**`, `src/lib/trust-config*.ts` | Content comes from Comp, not a YAML document |
| `src/app/api/requests/**`, `src/lib/request-store.ts` | Comp already stores and reviews access requests |
| `src/lib/supabase.ts` | No database of our own |
| `data/requests.json` | Ditto |
| `src/components/trust/trust-center-preview.tsx`, `src/components/trust/builder-panel.tsx` | YAML-schema-coupled renderer/editor with no remaining callers once the builder and admin UI were removed |

Dropped dependencies: `@supabase/supabase-js`, `next-auth`, `js-yaml`, `nanoid`.

## Add — done

**A Comp API client** (`src/lib/comp.ts`) wrapping:

- `GET /v1/trust-portal/public/{friendlyUrl}` — portal content: organization identity,
  branding, contact, enabled frameworks, published policy list, and access restriction
  state. Returns `null` on a 404 so the caller renders a clean not-found page instead of
  crashing.
- `getTrustAccessRequestUrl()` builds the `POST /v1/trust-access/{friendlyUrl}/requests`
  URL the request-access dialog posts to directly from the browser (no proxying backend
  route in this app).

The NDA and token-gated reviewer views (`/v1/trust-access/nda/{token}`,
`/v1/trust-access/access/{token}/**`) are a later slice and are intentionally not wired up
yet.

**Tenant resolution** (`src/lib/tenant.ts`): map `Host` → `friendlyUrl` from the
`TRUST_TENANTS` env var, so one deployment serves every tenant in a Comp install. An
unmapped `Host` always resolves to `null` — there is no default-tenant fallback.

**Wiring** (`src/app/page.tsx`): resolves the tenant from the request `Host` header,
fetches the portal payload server-side, and renders organization name, favicon, framework
badges, the published policy list (name + updatedAt), contact email, and privacy policy
link. When `access.restricted` is true, the page tells visitors requests are accepted from
company email addresses only. An unresolved tenant or a 404 from Comp renders
`src/app/not-found.tsx`.

## Invariants worth testing

- No draft or unpublished policy content is ever reachable through this app.
- A mismatched `Host` cannot surface another organization's data.
- The app holds no credentials for Comp's authenticated API — only public routes and
  visitor-supplied tokens.
