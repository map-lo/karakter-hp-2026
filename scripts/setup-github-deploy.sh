#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export AWS_PROFILE="${AWS_PROFILE:-karakter-hp}"
export AWS_REGION="${AWS_REGION:-eu-central-1}"
export AWS_PAGER=""
repository="map-lo/karakter-hp-2026"
account="544709547144"
bucket="karakter-homepage-production-$account"
staging_bucket="karakter-homepage-staging-$account"
stack="karakter-github-actions"

actual_account="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$actual_account" != "$account" ]]; then
  echo "Refusing to configure deployment in AWS account $actual_account; expected $account." >&2
  exit 1
fi
gh api "repos/$repository" --jq '.permissions.admin' | grep -qx true
oidc_prefix="$(gh api "repos/$repository/actions/oidc/customization/sub" --jq '
  if .use_default != true then error("Custom OIDC subject templates require an explicit trust-policy update")
  elif .use_immutable_subject == true then .sub_claim_prefix
  else "repo:map-lo/karakter-hp-2026" end
')"
if [[ "$oidc_prefix" != repo:* ]]; then
  echo "GitHub did not return a valid OIDC repository subject prefix." >&2
  exit 1
fi

aws cloudformation deploy --stack-name "$stack" \
  --template-file infra/github-actions.yml --capabilities CAPABILITY_IAM \
  --parameter-overrides "BucketName=$bucket" "StagingBucketName=$staging_bucket" "OidcSubjectPrefix=$oidc_prefix" \
  --no-fail-on-empty-changeset

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

site="$(output_value ProductionWebsiteUrl)"
staging_site="$(output_value StagingWebsiteUrl)"
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
    environment_bucket="$bucket"
    distribution="$(output_value ProductionDistributionId)"
  else
    output="StagingRoleArn"
    environment_bucket="$staging_bucket"
    distribution="$(output_value StagingDistributionId)"
  fi
  role="$(output_value "$output")"
  if [[ "$role" != arn:aws:iam::"$account":role/* ]]; then
    echo "CloudFormation did not return the expected deployment role." >&2
    exit 1
  fi
  gh variable set AWS_ROLE_ARN --repo "$repository" --env "$environment" --body "$role"
  gh variable set AWS_ACCOUNT_ID --repo "$repository" --env "$environment" --body "$account"
  gh variable set AWS_REGION --repo "$repository" --env "$environment" --body "$AWS_REGION"
  gh variable set S3_BUCKET --repo "$repository" --env "$environment" --body "$environment_bucket"
  gh variable set CLOUDFRONT_DISTRIBUTION_ID --repo "$repository" --env "$environment" --body "$distribution"
done

gh variable set AWS_REGION --repo "$repository" --body "$AWS_REGION"
gh variable set AWS_ACCOUNT_ID --repo "$repository" --body "$account"
gh variable set S3_BUCKET --repo "$repository" --body "$bucket"
gh variable set SITE_URL --repo "$repository" --body "$site"
gh variable set STAGING_SITE_URL --repo "$repository" --body "$staging_site"
printf '\nConfigured GitHub OIDC (no AWS access-key secrets).\nProduction: %s\nStaging: %s/pr-<number>/\n' "$site" "$staging_site"
