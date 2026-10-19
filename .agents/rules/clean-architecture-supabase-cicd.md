# Architecture & CI/CD Rules

## 1. Clean Code Architecture
- **Separation of Concerns**:
  - **Domain / Entities**: Define core data models, types, and validation schemas (e.g. Zod schemas) independently from framework logic.
  - **Data Access / Repository Layer**: Encapsulate Supabase and database interactions (e.g., Drizzle ORM queries, Supabase client calls). Never mix direct database calls directly into UI presentation components.
  - **Service / Use Case Layer**: Business logic, orchestrations, and transactions belong in dedicated service modules or server actions.
  - **Presentation Layer**: React components should strictly focus on rendering UI and handling user interaction events, delegating business logic to hooks or server actions.
- **SOLID & Clean Principles**:
  - Keep functions small, focused, and single-purpose.
  - Use clear, descriptive naming conventions.
  - Strongly type API inputs, outputs, database schemas, and function returns with TypeScript.
  - Handle errors gracefully with clear error boundaries, standard response formats, and proper logging.

---

## 2. Supabase Migrations & Auto CI/CD Pipeline
- **Migration Discipline**:
  - Never make untracked manual schema changes in remote Supabase environments.
  - All database schema modifications must be scripted as versioned migration files under `supabase/migrations/` (or via Drizzle Kit schema migrations).
  - Migrations must be idempotent, safe, and backwards-compatible whenever feasible.
- **Automated CI/CD Workflow**:
  - **Pull Requests (CI)**:
    - Validate linting and TypeScript compilation (`npm run lint`, `tsc --noEmit`).
    - Test or dry-run database migrations using the Supabase CLI (`supabase db lint` or test against local/ephemeral Supabase DB).
  - **Deployment / Main Branch (CD)**:
    - Automatically apply pending migrations to the target Supabase project via GitHub Actions using the official `supabase/setup-cli` action and `supabase db push`.
    - Provide required repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD`.
