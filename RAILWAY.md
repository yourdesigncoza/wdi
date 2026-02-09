# Railway Deployment Reference — WillCraft SA

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Railway Project                     │
│                  willcraft-sa                        │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐                │
│  │   frontend    │   │   backend    │                │
│  │  nginx:alpine │──▶│ python:3.13  │                │
│  │  port: $PORT  │   │ port: $PORT  │                │
│  └──────────────┘   └──────┬───────┘                │
│                            │                         │
│                     ┌──────▼───────┐                │
│                     │   Postgres   │                │
│                     │  (managed)   │                │
│                     │  + volume    │                │
│                     └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

## Service URLs

| Service  | Public URL                                              | Internal URL                    |
|----------|--------------------------------------------------------|---------------------------------|
| Frontend | https://frontend-production-dbe3.up.railway.app        | frontend.railway.internal       |
| Backend  | https://backend-production-2d9cb.up.railway.app        | backend.railway.internal        |
| Postgres | N/A (internal only)                                     | postgres.railway.internal:5432  |

## Project IDs

| Resource    | ID                                     |
|-------------|----------------------------------------|
| Project     | `3e2d4b8f-8cde-4fef-9f0f-ed1e46d64a52` |
| Backend     | `b75497ae-1a3b-4287-a666-40dcee8f38b7` |
| Frontend    | `3e623683-a560-4535-bfa4-2b9404983248` |
| Environment | `1d47ffd0-cade-4bd3-aa96-85b682aaa98b` (production) |

## GitHub Auto-Deploy

Both services are connected to `yourdesigncoza/wdi` on the `main` branch.

| Service  | Root Directory | Trigger             |
|----------|---------------|----------------------|
| Backend  | `/backend`    | Push to main (backend/ changes) |
| Frontend | `/frontend`   | Push to main (frontend/ changes) |

Pushing to `main` triggers auto-deploy. No CLI commands needed for normal deploys.

## Manual CLI Deploy

For deploying local changes without pushing to GitHub:

```bash
# Deploy backend
railway up backend/ --path-as-root --service backend --detach

# Deploy frontend
railway up frontend/ --path-as-root --service frontend --detach

# Monitor status
railway service status --service backend
railway service status --service frontend

# View logs
railway service logs --service backend
railway service logs --service frontend

# Redeploy latest (without new upload)
railway service redeploy --service backend
railway service redeploy --service frontend
```

**Important:** Always run `railway up` from the repo root (`/opt/lampp/htdocs/wdi`). The `--path-as-root` flag tells Railway to treat the subdirectory as the build root, not the monorepo root.

## Environment Variables

### Backend

| Variable             | Source         | Description                                |
|---------------------|----------------|--------------------------------------------|
| `DATABASE_URL`      | Postgres ref   | `${{Postgres.DATABASE_URL}}` — auto-set    |
| `SECRET_KEY`        | Manual         | 64-char hex for JWT signing                |
| `OPENAI_API_KEY`    | Manual         | OpenAI API key for conversation AI         |
| `GEMINI_API_KEY`    | Manual         | Google Gemini key for verification layer   |
| `CLERK_JWKS_URL`    | Manual         | Clerk JWKS endpoint for JWT verification   |
| `ALLOWED_ORIGINS`   | Manual         | CORS origins (comma-separated)             |
| `DEBUG`             | Manual         | `false` in production                      |
| `PAYFAST_SANDBOX`   | Manual         | `true` until production PayFast onboarding |
| `PAYFAST_RETURN_URL`| Manual         | Frontend payment return page URL            |
| `PAYFAST_CANCEL_URL`| Manual         | Frontend payment cancel page URL            |
| `PAYFAST_NOTIFY_URL`| Manual         | Backend ITN webhook URL                     |
| `MAIL_SUPPRESS_SEND`| Manual         | `true` until SMTP configured               |

Railway auto-injects: `PORT`, `RAILWAY_*` variables.

The backend `config.py` uses `pydantic-settings` with env var loading. The `DATABASE_URL` validator auto-converts `postgresql://` to `postgresql+asyncpg://` for asyncpg compatibility.

### Frontend

| Variable                       | Source  | Description                              |
|-------------------------------|---------|------------------------------------------|
| `VITE_API_URL`                | Manual  | Backend public URL (baked in at build time) |
| `VITE_CLERK_PUBLISHABLE_KEY`  | Manual  | Clerk authentication publishable key (baked in at build time) |

All `VITE_*` variables are **build-time** variables. They're passed as Docker build ARGs in the Dockerfile and embedded into the JS bundle by Vite. Changing any of them requires a rebuild. If you add a new `VITE_*` env var, you must also add a corresponding `ARG` + `ENV` line in `frontend/Dockerfile`.

## Dockerfiles

### Backend (`backend/Dockerfile`)

- Base: `python:3.13-slim`
- Installs WeasyPrint system deps (cairo, pango, gdk-pixbuf)
- Installs Python deps from `requirements.txt`
- Entry: `start.sh` (runs `alembic upgrade head`, seeds clause library, then `uvicorn` with `--proxy-headers --forwarded-allow-ips='*'`)

### Frontend (`frontend/Dockerfile`)

- Stage 1 (build): `node:22-alpine` — `npm ci` + `npm run build` (Vite)
- Stage 2 (serve): `nginx:alpine` — serves `/app/dist` with SPA fallback
- `nginx.conf` uses `$PORT` env substitution at runtime via `envsubst`

## Database

Railway-managed PostgreSQL with persistent volume (`postgres-volume`).

- Internal host: `postgres.railway.internal:5432`
- Database name: `railway`
- Migrations: Alembic, auto-run on backend deploy via `start.sh`
- Clause seeding: `python -m scripts.seed_clauses` runs after migrations (idempotent, skips existing)

### Connecting Locally

```bash
# Open psql shell
railway connect Postgres

# Or get connection string
railway variable list --service backend --kv | grep DATABASE_URL
```

## Health Check

```bash
# Backend health
curl https://backend-production-2d9cb.up.railway.app/api/health
# Expected: {"status":"healthy","version":"0.1.0"}

# Frontend
curl -s -o /dev/null -w "%{http_code}" https://frontend-production-dbe3.up.railway.app
# Expected: 200
```

## Troubleshooting

### Build fails with "Railpack could not determine how to build"

Railway's auto-detector (Railpack) sees the monorepo root instead of the service subdirectory. Ensure:
- Root Directory is set to `/backend` or `/frontend` in service Settings → Source
- When using CLI: always use `--path-as-root` flag

### Frontend TS build errors

TypeScript must compile cleanly (`npx tsc -b --noEmit`) before deploying. Railway runs `tsc -b && vite build` in the Dockerfile. Check locally first.

### Database connection fails

The backend expects `DATABASE_URL` in `postgresql://` or `postgresql+asyncpg://` format. The `config.py` validator auto-converts. Ensure the variable references `${{Postgres.DATABASE_URL}}` in Railway.

### CORS errors / 500 showing as CORS

Update `ALLOWED_ORIGINS` on the backend service to include the frontend URL. Comma-separated, no trailing slashes.

**Note:** When the backend returns a 500 error, CORS headers may not be included in the error response. The browser will report this as a CORS error, but the real problem is a backend crash. Always check `railway service logs --service backend` first.

### Mixed Content errors (http:// requests blocked)

Railway terminates TLS at the proxy, so uvicorn sees internal HTTP connections. Without `--proxy-headers`, any redirect Starlette generates (e.g. trailing-slash redirects) will use `http://` in the Location header, which browsers block as Mixed Content.

**Fix:** `start.sh` must run uvicorn with `--proxy-headers --forwarded-allow-ips='*'` so it trusts Railway's `X-Forwarded-Proto: https` header. The frontend also has a defence-in-depth `http://` → `https://` upgrade in `config.ts` for the API base URL.

### 403 "consent_required" on all API calls

The POPIA consent cookie uses `SameSite=None` + `Secure=True` in production for cross-origin requests between Railway subdomains. If consent was granted but the cookie isn't sent, check that `DEBUG=false` is set on the backend (controls the cookie flags).

On Safari (including mobile), cross-origin cookies may be blocked by ITP. The frontend also sends the consent JWT via the `X-POPIA-Consent` header (stored in localStorage) as a fallback. The backend middleware checks both cookie and header.

### 401 "authentication_required" on specific endpoints

All frontend API calls must use the authenticated `useApi()` client (from `AuthApiContext`), never raw `fetch()`. The `useApi()` client automatically includes the Clerk Bearer token. Raw fetch calls will work in dev (when `CLERK_JWKS_URL` is empty and auth is skipped) but fail in production.

### 500 on DELETE /api/wills (foreign key violation)

If deleting a will that has associated payment records fails with `ForeignKeyViolationError`, the `payments.will_id` FK is missing `ondelete="CASCADE"`. Migration 009 fixes this. All foreign keys referencing `wills.id` must have an explicit `ondelete` clause (`CASCADE` for payments/conversations, `SET NULL` for additional_documents).

### Will PDF pages are blank (no clause content)

The clause library must be seeded in the database. The `start.sh` script runs `python -m scripts.seed_clauses` on every deploy (idempotent). If clauses are missing, the document service skips all clause rendering and the will body page is empty. Verify with: `railway connect Postgres` then `SELECT count(*) FROM clause;` (should be 12).

### 403 on will access + consent modal not showing for new users

**Symptom:** User B logs in after User A on the same browser. Consent modal doesn't appear. API calls to `/api/wills/{id}` return 403 ("You do not have permission to access this will"). The will wizard shows "This will no longer exists."

**Root cause:** localStorage is shared across all browser users. Two pieces of stale state leak between Clerk accounts:

1. **`popia_consent_token`** — The POPIA consent JWT has no `user_id` claim. When User B signs in, the old token is still valid → `ConsentProvider` thinks consent exists → modal skipped → User B never actually consents.
2. **`wdi-will-draft`** (Zustand will store) — Holds User A's `willId`. User B's requests pass POPIA (old token) and Clerk auth (new JWT), but `will_service._get_will_for_user()` checks ownership → `will.user_id != user_id` → 403.

**Fix (commit `9546651`):**

- `ConsentProvider.tsx`: Tracks `willcraft_last_user_id` in localStorage. When Clerk `user.id` changes, clears `popia_consent_token`, `wdi-will-draft`, and `additional-doc-storage`. Re-runs consent check on user change.
- `WillWizard.tsx`: Catches 403 (wrong owner) in addition to 404 (deleted) when validating willId on mount → resets store + redirects to dashboard.

**Prevention:** Any new Zustand persist store that holds user-specific data must have its localStorage key added to `clearStaleUserState()` in `ConsentProvider.tsx`.

### VITE_API_URL not updating

`VITE_API_URL` is baked in at build time. After changing it, you must trigger a rebuild (redeploy or push).

## Cost Management

Railway bills per usage (CPU, memory, network, disk). To reduce costs:
- The backend sleeps after inactivity (default Railway behavior for Hobby plan)
- Frontend is static nginx — minimal resource usage
- Postgres volume persists across deploys

## Custom Domain (Future)

To add a custom domain (e.g., `app.willcraft.co.za`):

1. Railway dashboard → service → Settings → Networking → Custom Domain
2. Add your domain
3. Create CNAME record pointing to the Railway domain
4. Update `ALLOWED_ORIGINS` on backend to include the new domain
5. Update `VITE_API_URL` on frontend if backend domain changes (triggers rebuild)
