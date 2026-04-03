# Production Runtime Guardrails

Repo2Site now fails fast in production deployments when critical runtime configuration is missing.

## What is enforced

- `NEXT_PUBLIC_APP_URL`
- `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN`
- `REPO2SITE_SHARE_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## When it is enforced

The guard only activates when either of these flags indicate a real production deployment:

- `VERCEL_ENV=production`
- `REPO2SITE_RUNTIME_ENV=production`

That keeps local development and preview work flexible while preventing production from silently falling back to filesystem-backed share/template storage.

## Storage behavior

- Local development can still use `.repo2site-data/*` as a fallback.
- Production now requires Upstash-backed durable storage for shares and templates.

## Why this matters

Without this guard, a production deployment could appear healthy while actually writing share/template state to ephemeral local disk, which is unsafe for multi-instance or serverless deployments.
