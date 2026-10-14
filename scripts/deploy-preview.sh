#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

bucket="karakter-homepage-preview-035932132046"
aws_args=(--profile lya2 --region eu-central-1 --no-cli-pager)
site="http://$bucket.s3-website.eu-central-1.amazonaws.com"

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Detached HEAD: check out a branch before deploying." >&2
  exit 1
fi

aws s3api head-bucket --bucket "$bucket" --expected-bucket-owner 035932132046 "${aws_args[@]}"

if [[ "$branch" == "main" ]]; then
  npm run build
  aws s3 sync dist/ "s3://$bucket/" --cache-control "no-cache" "${aws_args[@]}"
  printf '\nPreview: %s\n' "$site"
  exit 0
fi

# Branch previews live in a subfolder named after the (URL-safe) branch name.
folder="$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g')"

ASTRO_BASE="/$folder" npm run build

# Refuse folder names that would overwrite top-level paths of the main site.
if [[ -e "dist/$folder" ]]; then
  echo "Branch folder '$folder' collides with a top-level site path; rename the branch." >&2
  exit 1
fi

aws s3 sync dist/ "s3://$bucket/$folder/" --delete --cache-control "no-cache" "${aws_args[@]}"
printf '\nPreview (%s): %s/%s/\n' "$branch" "$site" "$folder"
