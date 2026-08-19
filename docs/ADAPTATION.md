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

## Remove

| Path | Why |
|---|---|
| `src/app/admin/**`, `src/app/builder/**`, `src/app/login/**` | Comp's own admin UI owns settings, documents, badges and the request queue |
| `src/app/api/auth/**` (next-auth) | No admin surface here means no admin login |
| `src/app/api/trust-config/**`, `src/lib/trust-config*.ts` | Content comes from Comp, not a YAML document |
| `src/app/api/requests/**`, `src/lib/request-store.ts` | Comp already stores and reviews access requests |
| `src/lib/supabase.ts` | No database of our own |
| `data/requests.json` | Ditto |

Dropped dependencies: `@supabase/supabase-js`, `next-auth`, `js-yaml`, `nanoid`.

## Add

**A Comp API client** (`src/lib/comp.ts`) wrapping:

- `GET /v1/trust-portal/public/{friendlyUrl}` — portal content: organization identity,
  framework badges, **published** policy list, subprocessors, contact. *This endpoint does
  not exist upstream yet; it is the one change required on the Comp side, and its payload
  is the contract between the two projects.*
- `POST /v1/trust-access/{friendlyUrl}/requests` — visitor requests access (exists).
- `GET /v1/trust-access/nda/{token}`, `POST /v1/trust-access/nda/{token}/sign` — NDA
  (exists).
- `GET /v1/trust-access/access/{token}`, `/policies`, `/policies/{id}/download`,
  `/policies/download-all-zip` — granted reviewer views (exist).

**Tenant resolution** (`src/lib/tenant.ts`): map `Host` → `friendlyUrl` from configuration,
so one deployment serves every tenant in a Comp install. Unknown hosts get a 404 rather
than a default tenant.

## Invariants worth testing

- No draft or unpublished policy content is ever reachable through this app.
- A mismatched `Host` cannot surface another organization's data.
- The app holds no credentials for Comp's authenticated API — only public routes and
  visitor-supplied tokens.
