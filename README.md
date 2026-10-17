# Karakter Worldwide

Minimal homepage for the artist management Karakter Worldwide, built with Astro and Tailwind CSS.

## Content

Content is repository-owned and editable through [Pages CMS](https://app.pagescms.org).
The public website remains a static Astro build; no CMS database or application server is needed.

| Content | Canonical file | Website |
| --- | --- | --- |
| Artist roster | [`src/data/artists.json`](./src/data/artists.json) | Homepage roster and release associations |
| Shared company details / links | [`src/data/site.json`](./src/data/site.json) | Homepage icons and shared layout footer |
| About | [`src/content/pages/about.md`](./src/content/pages/about.md) | `/about` |
| Privacy | [`src/content/pages/privacy.md`](./src/content/pages/privacy.md) | `/privacy` |
| Imprint | [`src/content/pages/imprint.md`](./src/content/pages/imprint.md) | `/imprint` |
| Imported catalogue | [`src/data/releases.json`](./src/data/releases.json) | Source data, not edited by hand |
| Release corrections / manual entries | [`src/data/release-editorial.json`](./src/data/release-editorial.json) | Merged with imported catalogue at build time |

Markdown pages have required `title` and `description` frontmatter. Their bodies support
headings, paragraphs, links, lists, and emphasis, rendered with Astro content collections.
Two trailing spaces preserve a line break inside an address or contact block.
Page bodies are independent editorial copy: changing shared company settings does not
rewrite company details mentioned in About or legal text. Update those documents explicitly.
The existing legal wording was preserved during migration, including the Squarespace reference.

### Connecting Pages CMS

1. Push this branch/configuration to GitHub.
2. Open [Pages CMS](https://app.pagescms.org), sign in, and authorize access to this repository.
   For a private repository or organization, approve only the necessary repository access.
3. Select the repository and the branch to edit. Pages CMS reads [`.pages.yml`](./.pages.yml).
4. Edit and save. Changes are commits; a `main` save triggers validation and
   deployment. For review first, edit a content branch and open a pull request into `main`.
5. Check the **Validate and publish** Actions run before considering the change live.
   A saved commit is not a successful publication. Failed validation/builds do not deploy.

Editors need repository access; confirm organization policies and the hosted CMS access model
before inviting them. The CMS interface lives separately from S3; there is no `/admin` route.
Pages CMS authorization is a manual account step, not something the repository config can do.

The website always sorts the roster alphabetically by artist name, ignoring case and accents,
regardless of CMS list order. Keep artist IDs stable when renaming an artist. Optional iTunes artist
IDs configure imports; artists without one remain valid roster members.
Remove or reassign an artist's imported/manual releases before deleting the artist.
Validation deliberately rejects orphan references.

Uploads go to [`public/uploads`](./public/uploads) and are stored as `/uploads/...` references.
Both release-card components apply the Astro base path, including branch previews.
External artwork URLs remain supported. Rich-text page media uploads are disabled to keep
the text pages focused; release artwork is uploaded using its dedicated image field.

## Releases

The homepage grid shows every release in [`src/data/releases.json`](./src/data/releases.json),
newest first. That file is a committed cache so builds stay offline safe. Refresh it with:

```sh
npm run releases
```

[`scripts/fetch-releases.mjs`](./scripts/fetch-releases.mjs) reads the roster's releases from the
public iTunes Search API (no key needed). It imports albums only, collapses later editions,
and preserves provider collection IDs as `itunes-<collectionId>`. Source artist IDs live on
roster entries, not in code, because names such as `Mine` and `LOTTE` are ambiguous.
Artists without a source ID are explicitly skipped.

Imports fail on source errors, empty artist catalogues, potentially truncated results,
invalid records, or stale editorial references. The cache is replaced atomically only after
the complete candidate validates; failed imports leave the committed cache untouched.
Unexpected removals are blocked. After reviewing intentional roster/catalogue changes, use:

```sh
npm run releases -- --allow-removals
```

An override for a removed import must also be removed or migrated to a manual entry.
The removal flag never bypasses reference/content validation.

### Editorial changes

In Pages CMS, **Imported releases** is a read-only reference. Copy a release's ID into
**Release corrections**, then fill only the fields to override. `hidden: true` hides it.
Blank optional title/date/artwork/kind fields retain source values; an explicitly blank
label or link clears that field. A blank link falls back to the artist website.
Deleting an override restores imported values.

**Manual releases** require a unique `manual-...` ID, an existing artist ID, title,
kind, date and artwork. Label/link are optional. Imports never write the editorial file.
All visible releases sort newest first, including future-dated records as before.
`createPlaceholder()` in [`src/lib/releases.ts`](./src/lib/releases.ts) provides the existing
inline SVG fallback for unavailable artwork.

The **Refresh release catalogue** Actions workflow runs weekly or manually, validates and
builds the candidate, and opens a pull request rather than publishing automatically. Enable
GitHub Actions' permission to create pull requests in repository settings for this workflow.
Its bot-created PR may not trigger another Actions run with `GITHUB_TOKEN`; validation is
performed in the refresh workflow itself. Merging by a user triggers the normal `main` build.

## Structure

```text
src/
├── components/       # ReleaseCard, Prose
├── content/pages/    # Markdown page bodies and metadata
├── layouts/          # Layout with header + footer
├── data/             # cached release data
├── lib/              # content and release access
├── pages/            # index, about, privacy, imprint
└── styles/global.css # Tailwind theme, typography utilities
```

## Styling

Use Tailwind utilities for layout, spacing, typography, and responsive styles.
Shared colors and typography utilities live in [`src/styles/global.css`](./src/styles/global.css).
Light ink, the wall background, and info-page surfaces share the bright, cool
white `#F7FAFF`.
The homepage canvas uses the light background, including during scroll overshoot;
the artist aside owns its dark background. Info pages retain their dark outer canvas.
For repeated patterns, use scoped classes with `@apply` in `@layer components`,
referencing the global stylesheet with `@reference` so theme utilities are available.
Keep custom CSS for details that are clearer without utilities, such as SVG stroke settings.
The homepage retains its 1024px desktop and 420px small-screen breakpoints.
The logo uses explicit proportional dimensions and a transform-based wordmark overlay
to keep its placement consistent in Safari/iPhone and Chromium. Below 1024px, site
links appear only in the bottom footer; desktop keeps them in the fixed artist panel.
The title and SVG share a viewport-height-based scale with a fixed size ratio;
that shared scale is capped to fit the available panel width on every screen.
The SVG logo's solid shapes use unequal colour bands from top to bottom, with a
shared SVG gradient keeping all paths aligned.

Temporary homepage palette controls are available as independent query parameters:

- `logoColor`: solid SVG logo colour (replaces the gradient; formerly `color`).
- `bgColor`: first-column background. When `logoColor` is not supplied, the
  gradient's final band becomes black (`#000000`) on bright backgrounds and
  stays cream (`#F5F5E8`) on dark backgrounds. Brightness uses weighted RGB
  (299 red, 587 green, 114 blue), with a threshold of 128 out of 255;
  alpha digits do not affect this classification.
- `textColor`: all first-column text and contact icons, including hover/focus states,
  preserving the liner-note and site-link opacity levels. `highlightColor` takes
  precedence for hover/focus when supplied.
- `pageColor`: page canvas, right-column and mobile-footer backgrounds, including
  the background visible during scroll overshoot. Does not change text or panel colours.
- `highlightColor`: homepage link text and contact icons on hover/focus, and the
  text-selection background. Selection text retains its default dark colour.
- `sleeveColor`: vinyl sleeve background, also visible through the transparent grid gaps.
  The outer shadow uses a darker mix of this colour. There is no inset shading,
  and the sleeve and release covers have no borders.

For example: `/?logoColor=ff0066&bgColor=202020&textColor=f7faff&sleeveColor=d9b8a0&pageColor=f7faff&highlightColor=e43d30`.
Values accept 3, 4, 6, or 8 hex digits. The `#` is optional but must be URL-encoded
as `%23` when included. Missing values keep the defaults; invalid values keep the
defaults and log a console warning. The old `color` parameter is no longer used.
These client-side controls also work in static production builds and are intended
for quick palette experiments, not a permanent user-facing feature.

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run validate:content` | Validate schemas, IDs, references, page metadata and local artwork |
| `npm run check` | Type-check Astro and TypeScript |
| `npm test` | Run content, importer, CMS configuration and routing tests |
| `npm run preview` | Preview the production build locally        |
| `npm run releases`| Refresh `src/data/releases.json` from iTunes |
| `npm run deploy:preview` | Build and upload the public S3 preview |

## GitHub Actions deployment

| Event | Result |
| --- | --- |
| Push or merge into `main` | Test, type-check, build, and publish to the S3 website root |
| Push to another branch / open or update a PR | No build or deployment |
| Comment exactly `/stage` on an open PR | Test, type-check, build the PR head commit, publish to `/pr-<number>/` in the dedicated staging bucket, and reply with the URL |
| Close/merge a PR or delete its branch | Delete only that PR's preview folder |

Staging requires a same-repository, non-`main` PR and a commenter with write/maintain/admin
access. Forks and read-only commenters cannot trigger builds. PR-number folders are stable
across branch renames, safe for arbitrary branch names (including slashes), and unique even
when a deleted branch name is reused. Each `/stage` resolves the current immutable commit;
later pushes do not update its preview automatically. If the PR changes during the build,
the deploy fails explicitly: comment `/stage` again.

Workflows: [publish](./.github/workflows/publish.yml),
[stage](./.github/workflows/stage.yml), and [cleanup](./.github/workflows/stage-cleanup.yml).
Build jobs do not receive AWS credentials. Deployment and cleanup run trusted default-branch
code, never PR scripts, with short-lived GitHub OIDC credentials. The `production` and
`staging` environments accept only `main` workflow refs (the comment/cleanup workflows run
from the default branch). The production role has no access to the staging bucket, and
staging/cleanup credentials have no access to the production bucket. Staging can only
write/delete `pr-*/` objects. Deployment and cleanup share a per-PR lock and re-check the PR
before changing S3, so a late build cannot recreate a closed/deleted preview.
Cleanup is idempotent, includes every PR associated with a deleted branch, and refuses to
delete a preview if the PR was reopened and its branch exists again. A failed cleanup is
visible in Actions and can be re-run.

### AWS/GitHub configuration

The existing AWS account `035932132046` and production bucket below are used. All previews
share a separate bucket, `karakter-homepage-staging-035932132046`, with its own public S3
website. No CloudFront distribution or DNS changes are made. The GitHub OIDC provider must
already exist in AWS with audience `sts.amazonaws.com`.
[infra/github-actions.yml](./infra/github-actions.yml) manages the staging bucket, its public
read policy (only `pr-*/` objects), and two narrowly scoped IAM roles in the
`karakter-github-actions` CloudFormation stack. The staging bucket is retained if the stack
is deleted, avoiding accidental data loss. The setup script reads GitHub's actual OIDC
subject prefix, including immutable owner/repository IDs when enabled, rather than assuming
the older name-only subject. Custom subject templates require an explicit trust-policy update.
To provision/update these resources and configure
GitHub (requires AWS IAM/CloudFormation and GitHub repository admin access):

```sh
aws sso login --profile lya2
bash scripts/setup-github-deploy.sh
```

The script sets these **repository Actions variables**:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | `eu-central-1` |
| `AWS_ACCOUNT_ID` | `035932132046` |
| `S3_BUCKET` | `karakter-homepage-preview-035932132046` |
| `SITE_URL` | S3 website origin below, without trailing slash |
| `STAGING_SITE_URL` | `http://karakter-homepage-staging-035932132046.s3-website.eu-central-1.amazonaws.com` |

Each environment also has its own `AWS_ROLE_ARN` variable; `staging` overrides `S3_BUCKET`
with the dedicated staging bucket name. **No permanent AWS access keys
or other deployment secrets are needed.** Missing settings fail the workflow rather than
silently skipping deployment. `workflow_dispatch` on **Validate and publish** allows manual
recovery on `main`; other refs cannot build or deploy.

Uploads put content-hashed `_astro` assets first with immutable caching, then HTML and uploads
with `no-cache`. Sync never deletes old assets, preserving in-flight pages; preview cleanup
removes the exact `pr-N/` prefix, including its assets, without affecting `pr-N0/` or
production in the other bucket.
Deleted production routes/uploads need deliberate cleanup. S3 uploads are not an atomic
whole-site switch: a failed deployment can partially update files; re-run a known-good
revision to recover. Only deploy content intended to be public.

For future HTTPS hosting, use a private S3 REST origin with CloudFront Origin Access Control
and a certificate/domain. [scripts/cloudfront-rewrite.js](./scripts/cloudfront-rewrite.js)
can map directory routes to `index.html`; CI would also need scoped invalidation permissions
and an invalidation step. The current deployment intentionally targets the existing HTTP site.

## AWS preview

The main site is hosted at:

http://karakter-homepage-preview-035932132046.s3-website.eu-central-1.amazonaws.com

The S3 bucket `karakter-homepage-preview-035932132046` is in `eu-central-1`
and uses the local AWS CLI profile `lya2`. Sign in first if the SSO session has expired:

```sh
aws sso login --profile lya2
npm run deploy:preview
```

[`scripts/deploy-preview.sh`](./scripts/deploy-preview.sh) verifies the bucket owner,
builds the static site, and uses the same upload script as CI. Pages use `Cache-Control: no-cache`
so browsers revalidate content when the preview changes; hashed assets are immutable.
Only deploy content intended to be public.

The target depends on the current Git branch:

- On `main`, the site is synced to the bucket root (the URL above).
- On any other branch, an open PR is required (`gh` must be authenticated). The site is
  built with `ASTRO_BASE=/pr-<number>` and synced to that exact subfolder in the **staging**
  bucket, matching CI: `http://karakter-homepage-staging-035932132046.s3-website.eu-central-1.amazonaws.com/pr-<number>/`.
  Closing the PR or deleting the branch cleans up this folder via GitHub Actions.

Because of this, internal links and public assets must go through `url()` from
[`src/lib/url.ts`](./src/lib/url.ts) (or `import.meta.env.BASE_URL`) instead of hard-coded `/` paths.

This is an HTTP-only, publicly readable preview with AWS storage and request charges.
Public ACLs remain blocked; anonymous reads are granted by the bucket policy, not ACLs.
The website serves `index.html`, including the generated page directories.
For HTTPS, use CloudFront with a private S3 bucket instead.
