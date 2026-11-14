# Fast deploy

## Option A — Vercel only (~3 min, recommended)

The web app runs the full workflow in the browser when **no API URL** is configured.

1. [vercel.com/new](https://vercel.com/new) → import **cloudify**.
2. **Root Directory:** `apps/web`
3. Do **not** set `NEXT_PUBLIC_API_URL` (or set `NEXT_PUBLIC_MOCK_API=true` to force in-browser mode).
4. Deploy → share the URL. Users can drag/drop on `/create`, run the wizard, and open **Pull request** on step 4.

Optional env:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GITHUB_OWNER` | Compare URL owner (default `venkat-devish`) |
| `NEXT_PUBLIC_GITHUB_REPOSITORY` | Compare URL repo (default `cloudify`) |

Local dev with a real API: keep `apps/web/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8080` and `NEXT_PUBLIC_MOCK_API=false`.

---

## Option B — Vercel + Render (live Spring API)

See root `render.yaml`. Deploy API on Render, set `NEXT_PUBLIC_API_URL` on Vercel, and `CLOUDIFY_CORS_ORIGINS` on Render.