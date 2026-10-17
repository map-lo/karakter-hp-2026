#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export S3_BUCKET="karakter-homepage-preview-035932132046"
export AWS_ACCOUNT_ID="035932132046"
export AWS_PROFILE="${AWS_PROFILE:-lya2}"
export AWS_REGION="eu-central-1"
export AWS_PAGER=""
branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Detached HEAD: check out a branch before deploying." >&2
  exit 1
fi

if [[ "$branch" == "main" ]]; then
  unset S3_PREFIX ASTRO_BASE
  npm run build
  bash scripts/deploy-site.sh
  printf '\nPreview: http://%s.s3-website.eu-central-1.amazonaws.com/\n' "$S3_BUCKET"
  exit 0
fi

pr="$(gh pr view "$branch" --repo map-lo/karakter-hp-2026 --json number,state \
  --jq 'if .state == "OPEN" then .number else error("Local staging requires an open pull request") end')"
export S3_BUCKET="karakter-homepage-staging-$AWS_ACCOUNT_ID"
site="http://$S3_BUCKET.s3-website.eu-central-1.amazonaws.com"
target="$(node -e '
  const { stageTarget } = require("./scripts/stage-request.cjs");
  const { prefix, base } = stageTarget(Number(process.argv[1]));
  console.log(prefix + "\n" + base);
' "$pr")"
export S3_PREFIX="${target%%$'\n'*}"
export ASTRO_BASE="${target#*$'\n'}"
npm run build
bash scripts/deploy-site.sh
printf '\nPreview (%s): %s%s/\n' "$branch" "$site" "$ASTRO_BASE"
