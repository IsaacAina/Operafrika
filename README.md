# Operafrika

A business operating system for African SMEs that run one or more branches under a single owner. Operafrika replaces manual notebooks and paper invoices with one system that tracks sales, income, expenses, stock, staff, and customers per branch, and lets owners and staff ask an AI assistant plain questions about their own business data.

The initial market is Nigeria.

## Current status

Early development. The landing page, legal views, and the SME login and signup screens are built. The product routes (`/app`, `/admin`, `/founder`) are scaffolded placeholders. There is no database connection yet: the infrastructure tier decision is deferred, so no persistent database has been created or connected.

## Stack

- Next.js 14 (App Router)
- TypeScript
- React 18
- Prisma + PostgreSQL (planned, not yet connected)
- PGVector (planned, for unstructured content search)
- Gemini free tier (planned, as the AI provider)
- Flutterwave, locked for V2 payment collection — not built in the MVP

## Getting started

Requires Node.js 18.17 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Route | Purpose |
| --- | --- |
| `/` | Public landing page, with `/?view=privacy` and `/?view=terms` legal views |
| `/app` | SME product route group (owners, managers, staff) |
| `/app/login`, `/app/signup` | SME authentication screens |
| `/admin` | Platform Admin Console route group |
| `/founder` | Founder Dashboard route group |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build with type checking |
| `npm run start` | Serve the production build |
| `npm run lint` | Run Next.js linting |
| `npm run tokens:build` | Convert the Figma Tokens Studio export (`design-tokens.tokens.json`) into `styles/tokens.css` |
| `npm run tokens:check` | Verify `styles/tokens.css` is in sync with the token source, without writing |
| `node scripts/regenerate-favicons.mjs` | Regenerate the raster favicon and logo files from `public/icon.svg` |

## Project structure

```
app/
  page.tsx              Landing page
  landing-nav.tsx       Landing header with the mobile menu
  legal.tsx             Privacy policy and terms of service views
  globals.css           Landing and auth page styles
  (sme)/app/            SME product route group
  (platform)/admin/     Platform Admin Console route group
  (platform)/founder/   Founder Dashboard route group
styles/                 Design tokens (tokens.css, layout-tokens.css)
scripts/                Token build and favicon generation scripts
public/                 Icons and logo assets
docs/                   Product requirements document
.agent/rules/           Project rules the agent must follow
```

The PRD defines three route groups. SME accounts may only reach `/app`; platform accounts may only reach `/admin` and `/founder`.

## Design tokens

Colors, spacing, typography, radii, and layout values come from `styles/tokens.css`, generated from `design-tokens.tokens.json`. Edit the JSON source and run `npm run tokens:build`, or check sync with `npm run tokens:check`. Never hand-edit `styles/tokens.css`.

## Documentation

- `docs/Operafrika-PRD-v6.md` — full product requirements document
- `AGENTS.md` — summary of the PRD and how to work in this repository
- `.agent/rules/` — detailed rules for schema, authorization, audit logging, platform boundary, AI and vector search, payments, analytics, business model, compliance, and command execution

## Security model

Authorization is the core system requirement, enforced in two independent layers: every protected request resolves the user, business, role, and branch access from the server session, and PostgreSQL Row Level Security checks the query again at the database level. Values sent from the client are never trusted. Hiding actions in the UI is for usability only and is never a security boundary.

## License

Not yet published.
