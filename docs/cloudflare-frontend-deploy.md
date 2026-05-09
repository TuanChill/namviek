# Deploy Frontend to Cloudflare Pages

This guide deploys the Vite frontend in `apps/web` to Cloudflare Pages using direct upload and a GitHub Actions CD pipeline.

## 1) Create a Cloudflare Pages project

1. Open Cloudflare dashboard.
2. Go to Workers & Pages.
3. Create a new Pages project.
4. Use any temporary source for creation (or create it once from dashboard).
5. Keep the project name. You will need it for CI as `CLOUDFLARE_PAGES_PROJECT`.

## 2) Create credentials for CI

Create an API token with permission:

- Account -> Cloudflare Pages: Edit

Collect:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 3) Configure GitHub secrets and variable

In your GitHub repository settings:

- Add secret `CLOUDFLARE_API_TOKEN`
- Add secret `CLOUDFLARE_ACCOUNT_ID`
- Add variable `CLOUDFLARE_PAGES_PROJECT`

## 4) Use the included workflow

Workflow file:

- `.github/workflows/deploy-web-cloudflare.yml`

Behavior:

- Triggers on push to `main` when frontend or shared workspace files change.
- Builds `apps/web` with `pnpm --filter web build`.
- Deploys `apps/web/dist` with Wrangler:

```bash
wrangler pages deploy apps/web/dist --project-name=<your-pages-project>
```

## 5) Optional: one-click Deploy to Cloudflare button

Markdown snippet:

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/<your-org>/<your-repo>/tree/main/apps/web)
```

Notes:

- Replace `<your-org>/<your-repo>`.
- The repository must be public for smooth one-click onboarding.

## References

- Cloudflare Pages direct upload CI guide: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- Wrangler Action: https://github.com/cloudflare/wrangler-action
