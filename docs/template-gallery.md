# Community Template Gallery

Repo2Site templates are presentation presets, not personal portfolio clones.

## How starter templates are generated

Starter templates are not hand-built mock cards.

Each system template is generated from the same internal repo2site preview pipeline used for normal users:

1. load a real public GitHub profile from a well-known engineering ecosystem
2. run it through the shared preview generator
3. derive the resulting repository structure, README summaries, and tech stack
4. convert the result into a safe reusable template preset

This keeps starter templates grounded in real repository patterns while still applying only presentation-layer changes when a user remixes one.

## What templates include

Templates preserve:

- theme
- color mode
- density
- card style
- section layout
- section order
- section visibility

Templates also preserve the calmer editor-side presentation model around those settings:

- layout structure stays reusable
- personal content stays user-owned
- optional sections can remain hidden until the user intentionally expands or edits them

Templates do **not** replace:

- imported GitHub repositories
- project objects or project ordering
- personal name/headline/about content
- resume or cover-letter assets
- links, contact data, or profile identity

That makes template application safe: users keep their own portfolio content while borrowing a design system and layout structure.

## Data model

The template store keeps:

- `id`
- `slug`
- `schemaVersion`
- `status`
- `title`
- `description`
- `category`
- `tags`
- `previewImageUrl`
- `author`
- `preset`
- `likes`
- `remixes`
- `ratingAverage`
- `ratingsCount`
- `createdAt`
- `updatedAt`
- `publishedAt`

## Storage

Like the public sharing system, templates use an environment-driven storage backend:

- Production-first: Upstash Redis REST
- Local fallback: `.repo2site-data/templates`

Use the same Upstash variables already supported by the share service:

- `REPO2SITE_SHARE_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Engagement

Community interactions currently include:

- likes
- optional 1-5 star ratings
- remix/use counts

Duplicate likes are prevented per actor id. Today that actor id can come from a GitHub-backed session context or a local device identity. A future auth layer can replace that actor id source without changing the template store shape.
