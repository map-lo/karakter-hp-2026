#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
path="${1:?Supply an invalidation path}"
if [[ "$path" != '/*' && ! "$path" =~ ^/pr-[1-9][0-9]*/\*$ ]]; then
  echo "Refusing an invalid CloudFront invalidation path: $path" >&2
  exit 1
fi
invalidation="$(aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "$path" \
  --query Invalidation.Id --output text)"
if [[ -z "$invalidation" || "$invalidation" == None ]]; then
  echo "CloudFront did not return an invalidation ID." >&2
  exit 1
fi
aws cloudfront wait invalidation-completed \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --id "$invalidation"
