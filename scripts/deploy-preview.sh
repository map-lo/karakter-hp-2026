#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

bucket="karakter-homepage-preview-035932132046"
aws_args=(--profile lya2 --region eu-central-1 --no-cli-pager)

aws s3api head-bucket --bucket "$bucket" --expected-bucket-owner 035932132046 "${aws_args[@]}"
npm run build
aws s3 sync dist/ "s3://$bucket/" --cache-control "no-cache" "${aws_args[@]}"

printf '\nPreview: http://%s.s3-website.eu-central-1.amazonaws.com\n' "$bucket"
