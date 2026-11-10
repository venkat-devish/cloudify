# Cloudify

**Next.js** diagram UI + **Spring Boot** API: drag AWS icons, connect with left/right handles, validate against Terraform Registry references, preview generated `infra/*.tf`, and open a **GitHub pull request** when configured. **GitHub Actions** runs plan on the PR and apply after merge.

## Run

```bash
# API
cd apps/api && mvn spring-boot:run

# Web
cd apps/web && npm run dev
```

## GitHub PR (personal / infra target repo)

1. Create a GitHub repo (e.g. `your-user/cloudify-infra`) with an empty or minimal `main` branch.
2. Optional: copy [`templates/github-actions/terraform-aws.yml`](templates/github-actions/terraform-aws.yml) manually — Cloudify **adds this workflow on the PR branch** when `GITHUB_ENABLED=true`.
3. Add repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
4. Optional: create environment **cloudify-aws** with required reviewers for apply gating.
5. Configure the API:

```bash
export GITHUB_TOKEN=ghp_...          # classic PAT with repo scope, or fine-grained Contents + Pull requests
export GITHUB_ENABLED=true
export GITHUB_OWNER=your-github-user
export GITHUB_REPOSITORY=cloudify-infra
export GITHUB_DEFAULT_BRANCH=main    # optional
```

Edit [`apps/api/src/main/resources/application.yml`](apps/api/src/main/resources/application.yml) defaults if you prefer not to use env vars.

## Terraform apply (optional, local API)

In `application.yml` set `cloudify.terraform.allow-apply: true` and export AWS credentials. Production apply should stay in **GitHub Actions** after merge.

## Editor UX

- **Drag** resources from the left palette onto the canvas.
- Connect **right handle → left handle** between nodes.
- Recent projects and drafts in `localStorage`.

## API highlights

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/sessions/{id}/analyze` | Suggestions + `docReferences` |
| `POST /api/v1/sessions/{id}/terraform/run?apply=false` | Local terraform CLI (optional) |
| `POST /api/v1/sessions/{id}/pull-request` | Push `infra/*` + create PR (if `GITHUB_ENABLED`) |

## Terraform timing

- Wizard: preview + copy HCL only
- GitHub PR: Actions **init**, **validate**, **plan**
- After merge to `main`: **plan** + **apply** (environment approval)

## Editor cache

Recent projects and drafts: `localStorage` (`cloudify:recent-projects`, `cloudify:draft:{project}`).
