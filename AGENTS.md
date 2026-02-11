# Ring

Application mobile iOS & Android avec API backend.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Mobile**: Expo 52, React Native, expo-router, TanStack React Query
- **Backend**: Bun, oRPC 1.x (fetch adapter), Prisma 6, PostgreSQL
- **Shared**: Zod schemas partagés front/back (`@ring/shared`)
- **Linting/Format**: Biome

## Structure

```
apps/api/          → Backend Bun + oRPC + Prisma
apps/mobile/       → App Expo + React Native
packages/shared/   → Schémas Zod & types TypeScript partagés
```

## Commandes

```bash
pnpm dev              # Lance API + mobile en parallèle
pnpm build            # Build tous les packages
pnpm lint             # Lint via Biome
pnpm format           # Format via Biome
pnpm typecheck        # Vérification TypeScript
pnpm db:generate      # Générer le client Prisma
pnpm db:push          # Pousser le schéma vers PostgreSQL
pnpm db:studio        # Ouvrir Prisma Studio
```

## Architecture

### oRPC (API)

- Les procédures sont définies dans `apps/api/src/router.ts` avec `os.input().output().handler()`
- Le serveur Bun utilise `RPCHandler` de `@orpc/server/fetch` avec le préfixe `/rpc`
- Le type `Router` est exporté pour typer le client mobile

### Client mobile

- Le client oRPC typé est dans `apps/mobile/src/lib/orpc.ts`
- Utilise `RPCLink` + `createTanstackQueryUtils` pour intégrer React Query
- Les routes Expo sont dans `apps/mobile/app/` (file-based routing)

### Package partagé

- Les schémas Zod dans `packages/shared/src/schemas/` servent de source de vérité
- Ils sont utilisés pour la validation côté API et l'inférence de types côté mobile
- Importer depuis `@ring/shared` ou `@ring/shared/schemas`

## Conventions

- **Langage**: TypeScript strict partout
- **Formatting**: Biome — single quotes, pas de semicolons, indent 2 espaces, max 100 chars/ligne
- **Imports**: Biome organise les imports automatiquement
- **Schémas**: Toujours définir les schémas Zod dans `@ring/shared`, pas dans les apps
- **Procédures oRPC**: Utiliser `.input()` avec un schéma Zod, `.output()` quand la validation de sortie est nécessaire
- **Router oRPC**: Simple objet JS imbriqué, pas de `createRouter()`
- **DB**: Toujours passer par le client Prisma (`apps/api/src/db.ts`)
- **Env vars mobile**: Préfixer avec `EXPO_PUBLIC_` pour les exposer côté client
