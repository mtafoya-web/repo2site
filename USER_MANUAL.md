# Repo2Site User Manual

## What Repo2Site Does

Repo2Site helps you turn real GitHub work into a portfolio site. Instead of starting from a blank template, you begin with a public GitHub profile and optionally add a resume or other public sources to improve the draft. From there, you can edit the content, change the design, remix templates, publish a public page, or export a ZIP bundle.

The builder is designed to stay focused. Most controls stay quiet until you hover, select a section, or open the customize drawer.

## Getting Started

1. Open the builder at `/builder`.
2. If the walkthrough appears, use it or skip it.
3. Paste a public GitHub profile URL.
4. Click `Load GitHub`.
5. Review the generated preview.

Optional:

- Upload a PDF resume or cover letter for better personalization.
- Use AI suggestions if you want help improving wording and structure.

## Basic Workflow

### 1. Upload a Resume

Use this if you want the app to generate stronger summaries and profile details.

How to do it:

1. Click `Upload Resume`.
2. Select a PDF file.
3. Wait for the file to finish importing.

What happens:

- Repo2Site extracts text from uploaded PDF files.
- The file is used as enrichment context for suggestions.
- Resume content should support your portfolio, not replace your GitHub-backed project work.

Tips:

- Use a text-based PDF.
- Scanned or image-only PDFs may fail to import useful text.

### 2. Import a GitHub Profile

This is the main starting point.

How to do it:

1. Paste a public GitHub profile URL into the input.
2. Click `Load GitHub`.

Expected result:

- A portfolio draft appears in the live preview.
- Repo2Site selects featured repositories.
- README excerpts and README images may be pulled into projects when available.
- A theme is chosen automatically based on detected profile/repository signals.

If import fails:

- Double-check that the URL is a public GitHub profile URL, not a repository URL.
- Try again later if GitHub rate limits are hit.

### 3. Use AI Enhancement

AI is optional. It is there to help improve wording, structure, and presentation.

How to do it:

1. Click `Enhance with AI`.
2. Wait for suggestions to load.
3. Review them carefully.
4. Accept individual suggestions or use `Accept All AI` if they fit your voice.

Important:

- Suggestions stay pending until you accept them.
- AI does not automatically overwrite your content.
- Use AI as a polish layer, not as a replacement for reviewing your own site.

### 4. Use the Editor

The editor lets you change the draft directly.

How to do it:

1. Click a section in the preview to focus it.
2. Use the quieter section controls that appear on hover or selection.
3. Open inline fields only where you want to make changes.
4. Use the `•••` menu for secondary actions like remove/hide when available.

What you can edit:

- hero text
- about text
- professional summary and profile details
- contact text and contact methods
- links and supporting documents
- project descriptions and project visuals

### 5. Edit Text Directly

If the generated draft is close but not right, edit it yourself first.

Good things to update:

- your headline
- your about summary
- professional/company/location fields
- project descriptions
- contact and links section intros

Best practice:

- Get the core story right manually before you rely on AI to polish it.
- Keep optional details hidden unless they add signal.

### 6. Change Themes and Colors

Use the design controls after the content feels solid.

How to do it:

1. Click the floating `≡` customize launcher.
2. Adjust:
   - theme
   - color mode
   - density
   - section layout
   - card style
   - custom palette

Expected result:

- Changes appear immediately in the preview.

### 7. Rearrange Sections and Components

Repo2Site lets you visually reorder content to highlight your strongest work first.

What you can do:

- drag sections
- drag project cards
- use section hover/focus controls for cleaner editing
- feature a different project
- hide or remove visible elements from the layout

Best practice:

- Put your strongest project first.
- Keep the page easy to scan.
- Avoid filling every optional field just because it exists.

### 8. Browse Templates

You can browse reusable presentation presets in the template gallery.

How to do it:

1. Click `Browse Templates`.
2. Review starter and community templates.
3. Click `Use Template` on the one you want.

What templates change:

- theme
- color mode
- density
- card style
- section layout/order/visibility

What templates do not replace:

- your imported GitHub projects
- your personal identity/content
- your resume or uploaded docs

### 9. Publish or Export

#### Export a ZIP

Use this when you want a static bundle of the finished site.

1. Click `Download Portfolio ZIP`.
2. Save the downloaded archive.

Expected result:

- You receive a ZIP with exported site files.

#### Publish a Public Share Link

Use this when you want a hosted public Repo2Site page.

1. Sign in with GitHub.
2. Click `Share Portfolio`.
3. Choose or confirm the public slug.
4. Publish the share link.

Expected result:

- You get a public URL under `/u/[slug]`.

## Walkthrough Controls

The walkthrough is optional and non-blocking.

You can:

- go to the next step
- go back to earlier steps
- skip the walkthrough
- dismiss it and resume later
- restart it from the help/walkthrough actions in the builder

## How the Cleaner Editor Works

- Click a section to focus it.
- Focused sections show the clearest editing affordances.
- Hover reveals secondary controls without keeping them on screen all the time.
- The customize drawer is for visual system changes.
- The preview is the main workspace for structure and content.

## Troubleshooting

### GitHub import is not working

Check:

- the URL is a public GitHub profile URL
- GitHub is reachable
- the profile is not private

Possible cause:

- GitHub rate limits
- invalid URL
- network issue

### Resume import did not help

Check:

- the file is a PDF
- it contains selectable text

Possible cause:

- scanned/image-only PDF
- file contains too little useful text

### AI enhancement is unavailable

Possible cause:

- AI is not configured for the deployment
- the server returned an OpenAI/API error

What to do:

- continue editing manually
- try again later if the service is temporarily unavailable

### Public share link is unavailable

Check:

- you are signed in with GitHub
- your slug is not already taken

Possible cause:

- missing auth session
- storage/configuration problem

### Templates are not loading

Possible cause:

- template gallery API failure
- storage issue

What to do:

- refresh the page
- try a different sort mode if available

## Common Mistakes

- pasting a repository URL instead of a GitHub profile URL
- expecting AI to rewrite everything automatically
- uploading an image-only resume PDF
- forgetting to review accepted AI text
- styling the page before fixing the actual content
- publishing before checking project order and links

## FAQ

### Does Repo2Site use my private repositories?

No. The main import flow is based on a public GitHub profile URL and public repository data.

### Do I need a resume?

No. Resume upload is optional.

### Will AI overwrite my site?

No. AI suggestions stay separate until you accept them.

### Do templates overwrite my content?

No. Templates are presentation presets, not personal-content replacements.

### Can I share my portfolio publicly?

Yes, if GitHub sign-in and share storage are configured in the environment.

### Can I export the final site?

Yes. The builder supports static ZIP export.
