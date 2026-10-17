#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export AWS_PROFILE="${AWS_PROFILE:-lya2}"
export AWS_REGION="${AWS_REGION:-eu-central-1}"
export AWS_PAGER=""
repository="map-lo/karakter-hp-2026"
account="035932132046"
bucket="karakter-homepage-preview-$account"
stack="karakter-github-actions"
site="http://$bucket.s3-website.$AWS_REGION.amazonaws.com"

actual_account="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$actual_account" != "$account" ]]; then
  echo "Refusing to configure deployment in AWS account $actual_account; expected $account." >&2
  exit 1
fi
gh api "repos/$repository" --jq '.permissions.admin' | grep -qx true

aws cloudformation deploy --stack-name "$stack" \
  --template-file infra/github-actions.yml --capabilities CAPABILITY_IAM \
  --parameter-overrides "BucketName=$bucket" "Repository=$repository" \
  --no-fail-on-empty-changeset

for environment in production staging; do
  gh api --method PUT "repos/$repository/environments/$environment" --input - <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
  policy_count="$(gh api "repos/$repository/environments/$environment/deployment-branch-policies" \
    --jq '[.branch_policies[] | select(.name == "main" and .type == "branch")] | length')"
  if [[ "$policy_count" == 0 ]]; then
    gh api --method POST "repos/$repository/environments/$environment/deployment-branch-policies" \
      -f name=main -f type=branch
  fi
  if [[ "$environment" == production ]]; then
    output="ProductionRoleArn"
  else
    output="StagingRoleArn"
  fi
  role="$(aws cloudformation describe-stacks --stack-name "$stack" \
    --query "Stacks[0].Outputs[?OutputKey=='$output'].OutputValue | [0]" --output text)"
  if [[ "$role" != arn:aws:iam::"$account":role/* ]]; then
    echo "CloudFormation did not return the expected deployment role." >&2
    exit 1
  fi
  gh variable set AWS_ROLE_ARN --repo "$repository" --env "$environment" --body "$role"
done

gh variable set AWS_REGION --repo "$repository" --body "$AWS_REGION"
gh variable set AWS_ACCOUNT_ID --repo "$repository" --body "$account"
gh variable set S3_BUCKET --repo "$repository" --body "$bucket"
gh variable set SITE_URL --repo "$repository" --body "$site"
printf '\nConfigured GitHub OIDC deployments to %s (no AWS access-key secrets).\n' "$site"
