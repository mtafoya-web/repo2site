# Share Service

Repo2Site publishes public portfolios from a safe stored snapshot, never from live editor state.

## Architecture

The publish flow is:

1. Builder preview + overrides
2. `buildFinalPortfolio(...)`
3. public snapshot sanitization + validation
4. share service publish
5. public page render from stored snapshot at `/u/{slug}`

This keeps editor-only state, pending AI suggestions, and internal tool UI out of the public route.

## Backends

The share service lives in [lib/share-store.ts](/home/tafoy/projects/repo2site/lib/share-store.ts) and resolves a storage driver from environment variables.

- Production-first path: Upstash Redis REST
- Local fallback: filesystem JSON records under `.repo2site-data/shares`

Environment variables:

- `REPO2SITE_SHARE_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- optional `NEXT_PUBLIC_APP_URL` for canonical public URLs

If Upstash variables are missing, Repo2Site falls back to the local filesystem driver for development.

## Record model

Published shares store:

- `id`
- `slug`
- `schemaVersion`
- `snapshotVersion`
- `status`
- `owner`
- `portfolio`
- `metadata`
- `createdAt`
- `updatedAt`
- `publishedAt`
- `viewCount`

The current schema version is `2`. Legacy filesystem records from the earlier JSON-only share store are migrated on read into the new shape.

## Migration notes

Older local share JSON files contained only:

- `slug`
- `ownerKey`
- `portfolio`
- `createdAt`
- `updatedAt`
- `viewCount`

The new service upgrades those records automatically by adding an `id`, owner shape, metadata, schema versions, and status.

## Share behavior

Direct share intents:

- LinkedIn
- X
- Facebook
- WhatsApp
- Telegram
- Reddit
- Email

Fallback share flows:

- Instagram
- TikTok
- Discord

Those platforms do not offer dependable public web share intents for simple portfolio links, so Repo2Site gives users the next best flow:

- copy link
- copy caption
- preview OG image
- open the platform in a new tab when that helps

## View counting

View counts are approximate.

- Filesystem driver deduplicates by a hashed viewer hint per day
- Upstash driver uses a short-lived per-viewer key before incrementing

This avoids obvious repeated self-refresh inflation without trying to claim exact unique analytics.
