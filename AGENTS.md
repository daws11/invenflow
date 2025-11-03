# Repository Guidelines

## Project Structure & Module Organization
- Root workspace tracks shared tooling (`pnpm-workspace.yaml`, `pnpm-lock.yaml`) and setup playbooks (`SETUP.md`, `DATABASE_SETUP.md`, `API_TEST.md`, `DEMO.md`).
- `packages/backend` holds the Express + Drizzle API. Source lives in `src/`, compiled assets land in `dist/` and should stay untracked.
- `packages/frontend` contains the Vite-powered React app with Tailwind styles under `src/styles/`. Build artifacts are emitted to `dist/`.
- `packages/shared` centralizes TypeScript domain schemas consumed by both app tiers. Keep cross-cutting utilities here to avoid circular dependencies.
- Environment examples (e.g., `.env.example`) sit beside the services that require them; copy to `.env` during setup.

## Build, Test, and Development Commands
- `pnpm install` installs workspace dependencies; run after pulling new packages.
- `pnpm dev` launches frontend and backend watchers in parallel.
- `pnpm --filter backend dev` / `pnpm --filter frontend dev` start each service independently for focused debugging.
- `pnpm build` performs a recursive TypeScript compile and Vite bundle; ensure it stays green before tagging releases.
- `pnpm lint` and `pnpm format` enforce ESLint and Prettier settings; run `pnpm format` before committing large refactors.
- Database helpers: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio` wrap Drizzle CLI tasks described in `DATABASE_SETUP.md`.

## Coding Style & Naming Conventions
- TypeScript is the default across the repo; prefer ES module imports and explicit return types on exported functions.
- Prettier enforces two-space indentation, semicolons in backend files, and single quotes; avoid manual overrides unless justified.
- Name React components and shared types with `PascalCase`, hooks with `useCamelCase`, and files with their primary export (`KanbanBoard.tsx`).
- Keep environment-specific configuration in `config/` or `env/` modules; do not inline secrets.

## Testing Guidelines
- An automated test runner is not wired yet; new work should introduce tests alongside the feature (`packages/<module>/src/__tests__/`).
- Favor Vitest for frontend and shared utilities, and a lightweight integration harness (e.g., Supertest + Vitest) for the API.
- Target 80% statement coverage per module; document gaps in the pull request if coverage falls short.
- Record manual smoke steps in `DEMO.md` until suites exist, and update those notes when workflows change.

## Commit & Pull Request Guidelines
- Existing history uses short imperative summaries (e.g., `first commit`); continue with present-tense commands under 72 characters.
- Group changes logically per package, and prefix optional scope hints (`backend: add kanban routes`) to clarify impact.
- Pull requests should link relevant issues, describe migration or seed impacts, and include screenshots or curl examples for UI/API changes.
- Verify `pnpm build`, `pnpm lint`, and any added tests locally before requesting review; paste the command outputs or coverage excerpts in the PR body.

## Environment & Database Notes
- Follow `SETUP.md` for local prerequisites and workspace bootstrapping.
- Database workflows rely on PostgreSQL; keep schema migrations in `packages/backend/drizzle/` and run `pnpm db:migrate` after editing.
- Never commit `.env` files or connection strings. Share secrets via the team vault and document required keys inside `.env.example`.
