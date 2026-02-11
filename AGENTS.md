# Ring

Mobile iOS & Android app with API backend.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces (ESM throughout)
- **Mobile**: Expo 54, React Native 0.83, expo-router, TanStack React Query
- **Backend**: Bun, oRPC 1.x (fetch adapter), Prisma 7, PostgreSQL
- **Shared**: Zod 4 schemas shared front/back (`@ring/shared`)
- **UI tokens**: `@ring/ui` — theme object + Lucide icons
- **Linting/Format**: Biome (no ESLint, no Prettier)
- **Typecheck**: `tsgo` (native TypeScript compiler `@typescript/native-preview`)
- **Git hooks**: Lefthook (lint + format + typecheck on pre-commit)

## Structure

```
apps/api/            Backend Bun + oRPC + Prisma
apps/mobile/         Expo + React Native app
apps/mockup/         HTML mockups & design specs
packages/shared/     Zod schemas & TypeScript types
packages/ui/         Theme tokens + Lucide icon re-exports
```

## Commands

```bash
pnpm dev                  # API + mobile in parallel (turbo)
pnpm build                # Build all packages
pnpm lint                 # Biome lint (all workspaces)
pnpm lint:fix             # Biome lint --write
pnpm format               # Biome format --write
pnpm typecheck            # tsgo --noEmit (all workspaces)
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to PostgreSQL
pnpm db:test              # Smoke test: Testcontainers + health check
pnpm db:studio            # Open Prisma Studio
```

### Run a single workspace

```bash
pnpm --filter @ring/api typecheck
pnpm --filter @ring/mobile lint
pnpm --filter @ring/shared lint:fix
```

### Lint/format a single file

```bash
npx @biomejs/biome check --write path/to/file.ts
npx @biomejs/biome format --write path/to/file.ts
```

## Code Style (Biome)

- **Indent**: 2 spaces
- **Line width**: 100 characters max
- **Quotes**: single quotes
- **Semicolons**: as needed (omit trailing semicolons)
- **Imports**: auto-organized by Biome (`organizeImports: "on"`)
- **Unused imports/vars**: warn

Run `pnpm lint:fix` or `pnpm format` to auto-fix. Lefthook enforces on commit.

## TypeScript

- **Strict mode** everywhere (`strict: true`)
- **`noUncheckedIndexedAccess: true`** in base config
- **Module resolution**: `bundler`
- API uses `.js` extensions in relative imports (ESM convention): `import { db } from './db.js'`
- Mobile uses `@/*` path alias mapped to `./src/*`
- Shared/UI packages are consumed as raw `.ts` source (no build step)

## Import Order

Biome organizes imports automatically. The convention:

```ts
// 1. External packages (alphabetical)
import { os } from '@orpc/server'
import { z } from 'zod'

// 2. Workspace packages (mixed alphabetically with externals)
import { theme } from '@ring/ui'
import type { User } from '@ring/shared'

// 3. Local imports (aliased @/ or relative ./)
import { db } from './db.js'
import { orpc } from '@/lib/orpc'
```

Use inline `type` keyword for type-only imports: `import type { User } from '@ring/shared'`.

## Naming Conventions

| What                | Convention          | Example                          |
|---------------------|---------------------|----------------------------------|
| Files               | kebab-case          | `query-client.ts`                |
| Variables/functions | camelCase           | `queryClient`, `getUser()`       |
| Types/schemas       | PascalCase          | `UserSchema`, `CreateUser`       |
| React components    | PascalCase          | `LoginScreen`, `RootLayout`      |
| Constants           | UPPER_SNAKE_CASE    | `MAX_RETRIES`, `API_URL`         |
| Prisma models       | PascalCase          | `User`                           |
| DB columns          | snake_case via @map | `created_at`, `updated_at`       |
| DB tables           | plural via @@map    | `users`                          |
| oRPC procedures     | camelCase           | `listUsers`, `createUser`        |
| Router keys         | camelCase nested    | `router.user.list`               |

## Exports

- **Named exports** everywhere — no default exports
- **Exception**: Expo route components must use `export default function`
- Barrel re-exports in `packages/*/src/index.ts`

## Architecture

### oRPC (API)

- Procedures in `apps/api/src/router.ts`: `os.input(ZodSchema).output(ZodSchema).handler()`
- Server uses `RPCHandler` from `@orpc/server/fetch` at `/rpc` prefix
- `Router` type exported for typed mobile client
- Global error interceptor via `onError()` — no try/catch in handlers
- Errors from Prisma propagate to oRPC automatically

### Mobile (Expo)

- oRPC typed client: `apps/mobile/src/lib/orpc.ts`
- Uses `RPCLink` + `createTanstackQueryUtils` for React Query integration
- File-based routing: `apps/mobile/app/` (expo-router)
- Styling: `StyleSheet.create()` with theme tokens from `@ring/ui` — **no NativeWind/Tailwind**
- Auth: AsyncStorage-based (`apps/mobile/src/lib/auth.ts`)
- Two API call patterns:
  - `useQuery(orpc.user.list.queryOptions({ input }))` for queries
  - `useMutation({ mutationFn: () => client.auth.login(input) })` for mutations

### Shared Package

- Zod schemas in `packages/shared/src/schemas/` are the source of truth
- Used for validation on API and type inference on mobile
- Import from `@ring/shared` or `@ring/shared/schemas`

### UI Package

- Theme object in `packages/ui/src/theme.ts` — design tokens (colors, spacing, radii)
- Lucide icons re-exported from `packages/ui/src/lib/icons.ts`
- No component library — just tokens and icons

## Database (Prisma)

- Prisma 7 with `@prisma/adapter-pg` (native PostgreSQL driver)
- Client singleton in `apps/api/src/db.ts`
- Schema push (`db:push`), no migrations
- Generated client in `apps/api/prisma/generated/` (gitignored)
- UUID primary keys: `@id @default(uuid())`
- Timestamps: `createdAt @default(now())`, `updatedAt @updatedAt`
- Always use `@map("snake_case")` for columns, `@@map("plural")` for tables

## Key Rules

- **Schemas**: Always define Zod schemas in `@ring/shared`, never in apps
- **oRPC router**: Plain nested JS object, no `createRouter()`
- **DB access**: Always through `db` from `apps/api/src/db.ts`
- **Mobile env vars**: Prefix with `EXPO_PUBLIC_` to expose client-side
- **No NativeWind**: Use `StyleSheet.create()` + `theme` from `@ring/ui`
- **No test framework** yet — only `pnpm db:test` (smoke test via Testcontainers)
- **Pre-commit hooks**: Lefthook runs lint + format + typecheck automatically
