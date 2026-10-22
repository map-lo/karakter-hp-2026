#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export AWS_ACCOUNT_ID="544709547144"
export AWS_PROFILE="${AWS_PROFILE:-karakter-org}"
export AWS_REGION="eu-central-1"
export AWS_PAGER=""
export S3_BUCKET CLOUDFRONT_DISTRIBUTION_ID
stack="karakter-github-actions"
output_value() {
  local value
  value="$(aws cloudformation describe-stacks --stack-name "$stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text)"
  if [[ -z "$value" || "$value" == None ]]; then
    echo "Missing CloudFormation output: $1" >&2
    return 1
  fi
  printf '%s' "$value"
}
actual_account="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$actual_account" != "$AWS_ACCOUNT_ID" ]]; then
  echo "Refusing to deploy to AWS account $actual_account; expected $AWS_ACCOUNT_ID." >&2
  exit 1
fi
branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Detached HEAD: check out a branch before deploying." >&2
  exit 1
fi

if [[ "$branch" == "main" ]]; then
  unset S3_PREFIX ASTRO_BASE
  S3_BUCKET="$(output_value ProductionBucketName)"
  CLOUDFRONT_DISTRIBUTION_ID="$(output_value ProductionDistributionId)"
  site="$(output_value ProductionWebsiteUrl)"
  npm run build
  bash scripts/deploy-site.sh
  printf '\nProduction: %s/\n' "$site"
  exit 0
fi

pr="$(gh pr view "$branch" --repo map-lo/karakter-hp-2026 --json number,state \
  --jq 'if .state == "OPEN" then .number else error("Local staging requires an open pull request") end')"
S3_BUCKET="$(output_value StagingBucketName)"
CLOUDFRONT_DISTRIBUTION_ID="$(output_value StagingDistributionId)"
site="$(output_value StagingWebsiteUrl)"
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
