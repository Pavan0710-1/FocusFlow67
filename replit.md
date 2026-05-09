# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## MindClear Features

- **Splash screen** — animated logo screen on every app launch
- **Onboarding** — 4-slide intro flow shown once after first sign-in
- **Dark / Light / System theme** — fully functional, persisted in settings
- **Accessibility settings** — text size (S/M/L), high contrast, reduce motion
- **ARIA throughout** — labels, roles, live regions, skip-to-content link, form `<label>` associations
- **Focus-visible ring** — keyboard navigation supported across all interactive elements
- State storage key upgraded to `mindclear_v3` (auto-migrates from v2)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
