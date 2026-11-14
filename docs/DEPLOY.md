# Fast free deploy (canvas + workflow + demo PR)

**Stack:** [Vercel](https://vercel.com) (UI) + [Render](https://render.com) (API). No GitHub token required on the API.

## 1. API on Render (~5 min)

1. Push this repo to GitHub if needed.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect repo (uses root `render.yaml`).
   - Or **New Web Service** → Docker, **Root Directory** `apps/api`, Dockerfile `Dockerfile`.
3. Wait for deploy; copy the URL, e.g. `https://cloudify-api-xxxx.onrender.com`.
4. **Environment** on the service:
   - `GITHUB_ENABLED` = `false` (default in blueprint)
   - `VISION_PROVIDER` = `mock`
   - `CLOUDIFY_CORS_ORIGINS` = leave empty for now (set after Vercel step)

Free tier sleeps after idle — first load may take ~60s.

## 2. Web on Vercel (~3 min)

1. [vercel.com/new](https://vercel.com/new) → import the same GitHub repo.
2. **Root Directory:** `apps/web`
3. **Environment variable:**
   - `NEXT_PUBLIC_API_URL` = `https://cloudify-api-xxxx.onrender.com` (no trailing slash)
4. Deploy; copy the site URL, e.g. `https://cloudify-xxx.vercel.app`.

## 3. Wire CORS (required)

On Render → **cloudify-api** → **Environment**:

```
CLOUDIFY_CORS_ORIGINS=https://cloudify-xxx.vercel.app
```

Add preview URLs comma-separated if you use Vercel previews:

```
CLOUDIFY_CORS_ORIGINS=https://cloudify-xxx.vercel.app,https://cloudify-xxx-git-main-venkat-devish.vercel.app
```

Save → **Manual Deploy** if needed.

## 4. Smoke test

1. Open the Vercel URL → **Create** → drag SNS/SQS (or any resources) → connect → **Continue**.
2. Workflow steps 1–3 → step 4 **Delivery** → **Open pull request (demo)** + branch name.

If the wizard fails with a network error: check `NEXT_PUBLIC_API_URL` and `CLOUDIFY_CORS_ORIGINS`.

## Local parity

```bash
cd apps/api && mvn spring-boot:run
cd apps/web && npm run dev
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```