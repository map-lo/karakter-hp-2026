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
| Releases | [`src/data/releases.json`](./src/data/releases.json) | Homepage release grid |

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
4. Edit and save. Changes are commits; a `main` save triggers validation and, if enabled,
   deployment. For review first, edit a content branch and open a pull request into `main`.
5. Check the **Validate and publish** Actions run before considering the change live.
   A saved commit is not a successful publication. Failed validation/builds do not deploy.

Editors need repository access; confirm organization policies and the hosted CMS access model
before inviting them. The CMS interface lives separately from S3; there is no `/admin` route.
Pages CMS authorization is a manual account step, not something the repository config can do.

The website always sorts the roster alphabetically by artist name, ignoring case and accents,
regardless of CMS list order. Keep artist IDs stable when renaming an artist.
Remove or reassign an artist's releases before deleting the artist.
Validation deliberately rejects orphan references.

Uploads go to [`public/uploads`](./public/uploads) and are stored as `/uploads/...` references.
Both release-card components apply the Astro base path, including branch previews. Rich-text page media uploads are disabled to keep
the text pages focused; release artwork is uploaded using its dedicated image field.

## Releases

Releases are fully hand-managed in Pages CMS under **Releases**, stored in
[`src/data/releases.json`](./src/data/releases.json). There is no automatic import.

Each release has:

| Field | Notes |
| --- | --- |
| Show release on website (`visible`) | Defaults to on. Turning it off hides the whole release without deleting it. |
| Artist ID (`artistId`) | Stable ID from the Artist roster. Unknown IDs fail validation. |
| Title, kind, release date | Required. Kind is `album`, `ep` or `single`. |
| Label, release link (`url`) | Optional. A blank link falls back to the artist website. |
| Artwork upload (`artwork`) **or** artwork URL (`artworkUrl`) | Exactly one is required. |

The website sorts releases strictly by release date, newest first (including future dates).
Releases on the same date are ordered by title. The CMS list order is ignored.

Uploaded artwork is served as-is: there is no resizing service. Covers display at most
about 110 px wide, so upload square images of about **600 × 600 px**, JPG or WebP,
ideally under 150 KB. The CMS shows this guidance next to the field; it is not enforced.
Validation checks that uploaded files exist, including for hidden releases.
`createPlaceholder()` in [`src/lib/releases.ts`](./src/lib/releases.ts) provides the inline
SVG fallback for artwork that fails to load.

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
| `npm test` | Run content, CMS configuration and routing tests |
| `npm run preview` | Preview the production build locally        |
| `npm run deploy:preview` | Build and upload the public S3 preview |

## Production: private S3 + CloudFront

[`.github/workflows/publish.yml`](./.github/workflows/publish.yml) validates pull requests and
`main` changes, runs tests/type-checks, and builds a downloadable static site artifact.
Deployment is **off by default**; no AWS resources are created by these workflows.

To enable it:

1. Create a private S3 bucket and a CloudFront distribution with an S3 **REST origin**
   and Origin Access Control. Keep S3 public access blocked and restrict the bucket policy
   to that distribution. Set up the domain/TLS certificate separately.
2. Publish [`scripts/cloudfront-rewrite.js`](./scripts/cloudfront-rewrite.js) as a CloudFront
   Function using JavaScript runtime 2.0 and associate it with the site's **viewer-request** event. It maps `/about`
   and `/about/` to `/about/index.html` without rewriting asset paths.
3. Create an AWS role for GitHub OIDC. Restrict its trust to this repository's `production`
   environment (`repo:map-lo/karakter-hp-2026:environment:production`) and audience
   `sts.amazonaws.com`. Give it only bucket listing/object read-write access for this site,
   plus `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` for its distribution.
   No long-lived AWS access keys belong in GitHub or the repository.
4. Create the GitHub `production` environment, restrict deployment branches to `main`,
   and optionally require approval.
5. Configure these **repository Actions variables**:

   | Variable | Value |
   | --- | --- |
   | `DEPLOY_ENABLED` | `true` only once infrastructure and permissions are ready |
   | `AWS_REGION` | Bucket region, e.g. `eu-central-1` |
   | `AWS_ROLE_ARN` | OIDC deployment role ARN |
   | `AWS_ACCOUNT_ID` | Expected 12-digit bucket-owning AWS account ID |
   | `S3_BUCKET` | Production bucket name, without `s3://` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | Production distribution ID |

6. Run **Validate and publish** on `main` and check both the build and deployment jobs.
   Verify `/`, `/about`, `/privacy`, `/imprint` and artwork over HTTPS.

Deployment uploads content-hashed `_astro` assets first with immutable caching, then HTML
and uploads with revalidation, and waits for CloudFront invalidation. Configure CloudFront
cache policies with minimum TTL **0** so origin `no-cache` is respected. S3 sync intentionally
does not delete old assets, avoiding broken in-flight pages. Deleted routes/uploads therefore
need deliberate cleanup; do not upload confidential material. S3 uploads are not an atomic
whole-site switch: a failed deployment can partially update files. Re-run a known-good
revision's workflow to recover; enable bucket versioning for additional recovery options.

Use content branches/PRs for approval; this configuration does not implement automatic
CloudFront preview deployments or a separate draft database. The existing local branch
preview command below remains available.

## AWS preview

The preview is hosted at:

http://karakter-homepage-preview-035932132046.s3-website.eu-central-1.amazonaws.com

The S3 bucket `karakter-homepage-preview-035932132046` is in `eu-central-1`
and uses the local AWS CLI profile `lya2`. Sign in first if the SSO session has expired:

```sh
aws sso login --profile lya2
npm run deploy:preview
```

[`scripts/deploy-preview.sh`](./scripts/deploy-preview.sh) verifies the bucket owner,
builds the static site, and syncs `dist/` to the bucket. Uploads use `Cache-Control: no-cache`
so browsers revalidate content when the preview changes. Sync does not delete older files.
Only deploy content intended to be public.

The target depends on the current Git branch:

- On `main`, the site is synced to the bucket root (the URL above).
- On any other branch, the site is built with `ASTRO_BASE=/<branch>` and synced to a
  `<branch>/` subfolder, e.g. `.../feature-x/`. The folder name is the lowercased branch name
  with unsafe characters replaced by `-`. Branch syncs use `--delete`, scoped to that folder.

Because of this, internal links and public assets must go through `url()` from
[`src/lib/url.ts`](./src/lib/url.ts) (or `import.meta.env.BASE_URL`) instead of hard-coded `/` paths.

This is an HTTP-only, publicly readable preview with AWS storage and request charges.
Public ACLs remain blocked; anonymous reads are granted by the bucket policy, not ACLs.
The website serves `index.html`, including the generated page directories.
For HTTPS, use CloudFront with a private S3 bucket instead.
