# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router (routes, layouts, global styles, favicon).
- `src/components`: UI components (shadcn/radix primitives under `ui/`) and app-specific components.
- `src/hooks` and `src/lib`: Reusable hooks/utilities.
- `src/ai`: OpenAI client (`openai.ts`) and flows under `flows/`.
- `docs/`: Design and product docs (see `docs/blueprint.md`).
- Path alias: `@/*` → `src/*` (see `tsconfig.json`). Example: `import { cn } from '@/lib/utils'`.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js locally on `http://localhost:9002` (Turbopack).
- `npm run build`: Production build (`.next`).
- `npm start`: Run the built app.
- `npm run lint`: Lint with Next.js ESLint config.
- `npm run typecheck`: TypeScript type-check (no emit).

## Coding Style & Naming Conventions
- Language: TypeScript, React (function components + hooks), Next.js App Router.
- Files: kebab-case (e.g., `prediction-form.tsx`); components export PascalCase.
- Indentation: 2 spaces; keep lines < 100 chars where reasonable.
- Styling: Tailwind CSS; prefer utility classes + `clsx`/`cva` patterns.
- Linting: Fix issues flagged by `npm run lint`; keep `strict` TS types.

## Testing Guidelines
- No unit test framework is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Suggested conventions: `*.test.ts`/`*.test.tsx` colocated with source or under `tests/`.
- Aim for fast tests on hooks (`src/hooks`) and pure utils (`src/lib`).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Commits: small, scoped, and descriptive. Example: `feat(flow): add character-match prompt tuning`.
- PRs: include summary, linked issues, screenshots for UI changes, and steps to validate (commands + routes touched).

## Security & Configuration Tips
- Environment: use `.env.local` and set `OPENAI_API_KEY`; never commit secrets.
- Images: remote images allowed from `placehold.co` (see `next.config.ts`).
- Deployment: see `apphosting.yaml` for Firebase App Hosting sizing.
- When adding AI flows, keep logic in `src/ai/flows/*` and document inputs/outputs in the PR.
