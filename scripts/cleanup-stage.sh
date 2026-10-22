#!/usr/bin/env bash
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${PR_NUMBER:?Set PR_NUMBER}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
if [[ ! "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
  echo "Refusing to delete an invalid PR staging path." >&2
  exit 1
fi

aws s3api head-bucket --bucket "$S3_BUCKET" --expected-bucket-owner "$AWS_ACCOUNT_ID"
aws s3 rm "s3://$S3_BUCKET/pr-$PR_NUMBER/" --recursive --only-show-errors
bash "$(dirname "$0")/invalidate-site.sh" "/pr-$PR_NUMBER/*"
printf 'Removed preview pr-%s/ (already-absent previews are safe).\n' "$PR_NUMBER"
