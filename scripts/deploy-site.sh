#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
: "${S3_BUCKET:?Set S3_BUCKET}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"

prefix="${S3_PREFIX:-}"
if [[ -n "$prefix" ]]; then
  if [[ ! "$prefix" =~ ^pr-[1-9][0-9]*$ ]]; then
    echo "Refusing an invalid staging prefix: $prefix" >&2
    exit 1
  fi
  prefix="$prefix/"
fi

aws s3api head-bucket --bucket "$S3_BUCKET" --expected-bucket-owner "$AWS_ACCOUNT_ID"
aws s3 sync dist/_astro/ "s3://$S3_BUCKET/${prefix}_astro/" \
  --cache-control "public,max-age=31536000,immutable" --no-progress
# Keep old assets until explicit preview cleanup, so in-flight pages still work.
aws s3 sync dist/ "s3://$S3_BUCKET/$prefix" \
  --exclude "_astro/*" \
  --cache-control "no-cache" --no-progress
bash scripts/invalidate-site.sh "/${prefix}*"
