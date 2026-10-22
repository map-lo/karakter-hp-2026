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
4. Edit and save. Changes are commits; a `main` save triggers validation and
   deployment. For review first, edit a content branch and open a pull request into `main`.
5. Check the **Validate and publish** Actions run before considering the change live.
   A saved commit is not a successful publication. Failed validation/builds do not deploy.

Editors need repository access; confirm organization policies and the hosted CMS access model
before inviting them. The CMS interface lives separately from S3; there is no `/admin` route.
Pages CMS authorization is a manual account step, not something the repository config can do.

Under **Company details**, set the optional **Spotify playlist URL** and **Apple Music
playlist URL** fields. Leave either field blank to hide its homepage icon; the two links
are independent. Non-empty values must be HTTP or HTTPS URLs.

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

## GitHub Actions deployment

| Event | Result |
| --- | --- |
| Push or merge into `main` | Test, type-check, build, publish to private S3, and invalidate CloudFront |
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

The **Karakter** member account `544709547144` belongs to organization `o-2d7aspvqv0`,
managed by account `035932132046`. Its root email is `stefan+karakter@loveyourartist.de`.
Both production and staging now use the member account, in `eu-central-1`.
The previous public S3 preview resources in the management account are left intact;
GitHub no longer publishes there.

[infra/github-actions.yml](./infra/github-actions.yml) manages the
`karakter-github-actions` CloudFormation stack: two private, encrypted S3 buckets, two
CloudFront distributions, an Origin Access Control, directory-index routing function,
GitHub OIDC provider, isolated deployment roles, and the Route 53 hosted zone.
All S3 public access is blocked. Each bucket permits reads only from its own CloudFront
distribution; staging exposes only `pr-*/` objects. Viewers are redirected to HTTPS,
and CloudFront signs HTTPS origin requests. Unknown routes are not rewritten to the homepage.
Buckets and the hosted zone are retained on stack deletion.

| Resource | Value |
| --- | --- |
| Production | <https://dsk9324ext.cloudfront.net> |
| Production bucket | `karakter-homepage-production-544709547144` |
| Production distribution | `E294DZFE2GGRD7` |
| Staging | <https://d2xrjj8i3globn.cloudfront.net/pr-N/> |
| Staging bucket | `karakter-homepage-staging-544709547144` |
| Staging distribution | `E1HHELYCUEPLSK` |
| Route 53 zone | `Z030739431M5X8J5MUKZQ` |

The setup script reads GitHub's actual OIDC
subject prefix, including immutable owner/repository IDs when enabled, rather than assuming
the older name-only subject. Custom subject templates require an explicit trust-policy update.
To provision/update these resources and configure GitHub (requires member-account
administrator access and GitHub repository admin access):

```sh
aws configure sso --profile karakter-hp
aws sso login --profile karakter-hp
bash scripts/setup-github-deploy.sh
```

`karakter-hp` uses IAM Identity Center directly with account `544709547144`,
permission set `AdministratorAccess`, and shared SSO session `loveyourartist`
(start URL `https://d-99676f68fd.awsapps.com/start/#`, SSO region `eu-central-1`).
It stores no permanent access keys. The unrelated standalone account uses the local
profile `karakter-legacy` and is not used for this site.
Secure the member root account with MFA/recovery controls and review AWS billing
alerts separately; creating the member account does not configure these controls.

The script sets these **repository Actions variables**:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | `eu-central-1` |
| `AWS_ACCOUNT_ID` | `544709547144` |
| `S3_BUCKET` | `karakter-homepage-production-544709547144` |
| `SITE_URL` | Production URL (CloudFront initially; custom domain after activation), without trailing slash |
| `STAGING_SITE_URL` | Staging CloudFront URL, without trailing slash |

Each environment has its own `AWS_ROLE_ARN`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `S3_BUCKET`,
and `CLOUDFRONT_DISTRIBUTION_ID` variables. **No permanent AWS access keys
or other deployment secrets are needed.** Missing settings fail the workflow rather than
silently skipping deployment. `workflow_dispatch` on **Validate and publish** allows manual
recovery on `main`; other refs cannot build or deploy.

Uploads put content-hashed `_astro` assets first with immutable caching, then HTML and uploads
with `no-cache`. Sync never deletes old assets, preserving in-flight pages; preview cleanup
removes the exact `pr-N/` prefix, including its assets, without affecting `pr-N0/` or
production in the other bucket. Publishing invalidates `/*` for production or the exact
`/pr-N/*` path for staging and waits for completion. Cleanup also invalidates the deleted
preview. Each role can invalidate only its own distribution. CloudFront's minimum cache
TTL is zero, respecting HTML's `no-cache` and hashed assets' immutable cache headers.
Invalidation failures fail the workflow rather than reporting publication success.
Deleted production routes/uploads need deliberate cleanup. S3 uploads are not an atomic
whole-site switch: a failed deployment can partially update files; re-run a known-good
revision to recover. Only deploy content intended to be public.

### Local deployment

Prefer GitHub Actions for production. For a deliberate local deployment, sign in first:

```sh
aws sso login --profile karakter-hp
npm run deploy:preview
```

[`scripts/deploy-preview.sh`](./scripts/deploy-preview.sh) verifies the member account and
bucket owner, reads bucket/distribution URLs from CloudFormation, builds the site, and uses
the same upload/invalidation scripts as CI. Only deploy content intended to be public.

The target depends on the current Git branch:

- On `main`, the site is published to production.
- On any other branch, an open PR is required (`gh` must be authenticated). The site is
  built with `ASTRO_BASE=/pr-<number>` and synced to that exact subfolder in the **staging**
  bucket, matching CI: `https://d2xrjj8i3globn.cloudfront.net/pr-<number>/`.
  Closing the PR or deleting the branch cleans up this folder via GitHub Actions.

Because of this, internal links and public assets must go through `url()` from
[`src/lib/url.ts`](./src/lib/url.ts) (or `import.meta.env.BASE_URL`) instead of hard-coded `/` paths.

AWS storage, CDN requests/transfer, Route 53, and invalidations beyond the free allowance
can incur charges. PR previews are public through HTTPS, not authenticated/private previews.

### DNS migration: Hetzner to Route 53

The zone was created without changing the domain's registrar delegation. The initial
Route 53 records preserve the old Squarespace website, Google Workspace MX/SPF/DKIM/DMARC,
verification records, and other subdomains.
[infra/dns-records.json](./infra/dns-records.json) is the approved pre-cutover snapshot;
**do not reapply it after website cutover**, because it restores the Squarespace A/WWW records.
Hetzner's `gema` and `tours` CNAMEs point to themselves and were omitted with owner approval:
Route 53 rejects CNAME loops. The unusual existing Squarespace DKIM target is preserved
exactly, not silently corrected.

The Route 53 nameservers to set **at the domain registrar** are:

```text
ns-573.awsdns-07.net
ns-121.awsdns-15.com
ns-1523.awsdns-62.org
ns-1662.awsdns-15.co.uk
```

Changing NS records inside the old Hetzner zone alone does not change parent delegation.
Keep the old zone active during propagation. Before delegation, compare every migrated record
against Hetzner and verify that no parent DS/DNSSEC record exists (none was observed during
preparation); stale DS records would break validation. The previous website records have
an 86400-second TTL, so website cutover can take a day even after delegation propagates.

An ACM certificate was requested in **us-east-1** for `karakter-worldwide.com` and
`www.karakter-worldwide.com`:

```text
arn:aws:acm:us-east-1:544709547144:certificate/e5830794-e225-4b40-9e5d-56535d09f84e
```

[infra/dns-validation.json](./infra/dns-validation.json) contains its CNAMEs, already placed
in Route 53. They validate once the new zone is publicly delegated; alternatively add the
same CNAMEs at Hetzner to validate before delegation. Keep these records for automatic renewal.
**Do not point the website at CloudFront until ACM is issued and the distribution accepts
both hostnames.** The generated CloudFront HTTPS URL works independently of this migration.

After delegation (or adding validation CNAMEs at Hetzner), confirm ACM shows `ISSUED`:

```sh
aws acm describe-certificate --profile karakter-hp --region us-east-1 \
  --certificate-arn arn:aws:acm:us-east-1:544709547144:certificate/e5830794-e225-4b40-9e5d-56535d09f84e \
  --query Certificate.Status --output text
```

Only then attach the certificate/hostnames. CloudFormation waits for CloudFront deployment;
other parameter values are preserved:

```sh
aws cloudformation deploy --profile karakter-hp --region eu-central-1 \
  --stack-name karakter-github-actions --template-file infra/github-actions.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides CertificateArn=arn:aws:acm:us-east-1:544709547144:certificate/e5830794-e225-4b40-9e5d-56535d09f84e \
  --no-fail-on-empty-changeset

curl --fail --connect-to karakter-worldwide.com:443:dsk9324ext.cloudfront.net:443 \
  https://karakter-worldwide.com/
curl --fail --connect-to www.karakter-worldwide.com:443:dsk9324ext.cloudfront.net:443 \
  https://www.karakter-worldwide.com/
```

Once both HTTPS hostnames work, apply the **one-time atomic website cutover**:

```sh
aws route53 change-resource-record-sets --profile karakter-hp \
  --hosted-zone-id Z030739431M5X8J5MUKZQ --change-batch file://infra/dns-cutover.json
gh variable set SITE_URL --repo map-lo/karakter-hp-2026 --body https://karakter-worldwide.com
```

[infra/dns-cutover.json](./infra/dns-cutover.json) replaces only the apex A record and
old `www` CNAME with CloudFront A/AAAA aliases; mail and other subdomains remain unchanged.
It is intentionally one-time: its DELETE requires the exact old CNAME.
Verify public NS, both HTTPS hostnames, nested routes, and Google Workspace records after
propagation. After the certificate is attached, setup reads the custom production URL
from CloudFormation; subsequent setup runs preserve the activated hostname.
