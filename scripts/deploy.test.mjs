import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { stageTarget, resolveStageRequest, assertStageDeployable } from './stage-request.cjs';
import { cleanupTargets, assertCleanupAllowed } from './stage-cleanup.cjs';

test('staging paths are stable, unique PR folders without branch name collisions', () => {
  assert.deepEqual(stageTarget(2), {
    prefix: 'pr-2', base: '/pr-2'
  });
  assert.notEqual(stageTarget(2).prefix, stageTarget(20).prefix);
  for (const number of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', '../main']) {
    assert.throws(() => stageTarget(number), /Invalid pull request number/);
  }
});

function stageFixture({ permission = 'write', state = 'open', repo = 'map-lo/karakter-hp-2026', branch = 'feature/header', branchError, sha = 'a'.repeat(40) } = {}) {
  const outputs = {};
  let pullReads = 0;
  return {
    outputs,
    get pullReads() { return pullReads; },
    github: { rest: {
      repos: {
        getCollaboratorPermissionLevel: async () => ({ data: { permission } }),
        getBranch: async () => {
          if (branchError) throw branchError;
          return { data: { name: branch } };
        }
      },
      pulls: { get: async () => {
        pullReads++;
        return { data: { state, head: {
          repo: repo ? { full_name: repo } : null,
          ref: branch, sha
        } } };
      } }
    } },
    context: {
      repo: { owner: 'map-lo', repo: 'karakter-hp-2026' },
      issue: { number: 2 }, payload: { comment: { user: { login: 'editor' } } }
    },
    core: { setOutput: (name, value) => { outputs[name] = value; } }
  };
}

test('staging resolves an authorized PR to an immutable commit and exact prefix', async () => {
  for (const permission of ['write', 'maintain', 'admin']) {
    const fixture = stageFixture({ permission });
    await resolveStageRequest(fixture);
    assert.deepEqual(fixture.outputs, {
      sha: 'a'.repeat(40), prefix: 'pr-2', base: '/pr-2'
    });
  }
});

test('read-only commenters, forks, deleted forks, closed PRs and main are refused', async () => {
  for (const permission of ['read', 'triage', 'none']) {
    const fixture = stageFixture({ permission });
    await assert.rejects(resolveStageRequest(fixture), /write access/);
    assert.equal(fixture.pullReads, 0);
    assert.deepEqual(fixture.outputs, {});
  }
  for (const options of [{ repo: 'outsider/fork' }, { repo: null }, { state: 'closed' }, { branch: 'main' }, { sha: 'invalid' }]) {
    const fixture = stageFixture(options);
    await assert.rejects(resolveStageRequest(fixture));
    assert.deepEqual(fixture.outputs, {});
  }
});

test('late builds cannot recreate closed/deleted previews or publish stale commits', async () => {
  const sha = 'a'.repeat(40);
  await assertStageDeployable({ ...stageFixture(), sha });
  for (const options of [
    { state: 'closed' }, { branchError: Object.assign(new Error('Deleted branch'), { status: 404 }) },
    { repo: 'outsider/fork' }, { sha: 'b'.repeat(40) }
  ]) {
    await assert.rejects(assertStageDeployable({ ...stageFixture(options), sha }));
  }
});

test('cleanup resolves only exact same-repository PRs for closed PR and branch-delete events', async () => {
  const repo = { owner: 'map-lo', repo: 'karakter-hp-2026' };
  const pr = (number, ref, full_name = 'map-lo/karakter-hp-2026') => ({
    number, head: { ref, repo: { full_name } }
  });
  const context = { repo, eventName: 'pull_request_target',
    payload: { action: 'closed', pull_request: pr(2, 'feature/header') } };
  assert.deepEqual(await cleanupTargets({ context }), [2]);
  context.payload.pull_request = pr(2, 'feature/header', 'outsider/fork');
  assert.deepEqual(await cleanupTargets({ context }), []);
  context.eventName = 'delete';
  context.payload = { ref_type: 'branch', ref: 'feature/header' };
  const github = {
    rest: { pulls: { list: () => {} } },
    paginate: async (_method, parameters) => {
      assert.equal(parameters.head, 'map-lo:feature/header');
      assert.equal(parameters.state, 'all');
      return [pr(2, 'feature/header'), pr(20, 'feature/header'), pr(3, 'feature'),
        pr(4, 'feature/header', 'outsider/fork'), pr(2, 'feature/header')];
    }
  };
  assert.deepEqual(await cleanupTargets({ github, context }), [2, 20]);
  for (const payload of [{ ref_type: 'tag', ref: 'feature/header' }, { ref_type: 'branch', ref: 'main' }]) {
    await assert.rejects(cleanupTargets({ github, context: { ...context, payload } }), /Unexpected cleanup event/);
  }
});

test('cleanup refuses active or reopened PRs, tolerates already-deleted branches, and surfaces API errors', async () => {
  await assertCleanupAllowed({ ...stageFixture({ state: 'closed' }), number: 2 });
  await assertCleanupAllowed({
    ...stageFixture({ branchError: Object.assign(new Error('Gone'), { status: 404 }) }), number: 2
  });
  await assert.rejects(assertCleanupAllowed({ ...stageFixture(), number: 2 }), /active preview/);
  await assert.rejects(assertCleanupAllowed({
    ...stageFixture({ branchError: Object.assign(new Error('Rate limited'), { status: 403 }) }), number: 2
  }), /Rate limited/);
  await assert.rejects(assertCleanupAllowed({ ...stageFixture({ repo: 'outsider/fork' }), number: 2 }));
});

test('workflow triggers and credential boundaries match the deployment contract', () => {
  const production = parse(readFileSync(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8'));
  const staging = parse(readFileSync(new URL('../.github/workflows/stage.yml', import.meta.url), 'utf8'));
  const cleanup = parse(readFileSync(new URL('../.github/workflows/stage-cleanup.yml', import.meta.url), 'utf8'));
  assert.deepEqual(production.on, { push: { branches: ['main'] }, workflow_dispatch: null });
  assert.deepEqual(staging.on, { issue_comment: { types: ['created'] } });
  assert.equal(staging.jobs.request.if, "github.event.issue.pull_request && github.event.comment.body == '/stage'");
  assert.equal(production.jobs.deploy.environment, 'production');
  assert.equal(staging.jobs.deploy.environment.name, 'staging');
  assert.equal(staging.jobs.build.permissions, undefined);
  assert.deepEqual(staging.permissions, { contents: 'read' });
  assert.equal(staging.jobs.deploy.permissions['id-token'], 'write');
  assert.equal(staging.jobs.build.steps[0].with.ref, '${{ needs.request.outputs.sha }}');
  assert.equal(staging.jobs.deploy.steps[0].with.ref, undefined);
  assert.equal(staging.jobs.deploy.steps[0].with['persist-credentials'], false);
  assert.equal(production.jobs.deploy.if.includes('DEPLOY_ENABLED'), false);
  assert.equal(staging.jobs.deploy.environment.url, '${{ vars.STAGING_SITE_URL }}${{ needs.request.outputs.base }}/');
  assert.equal(staging.jobs.report.steps[0].env.PREVIEW_URL, '${{ vars.STAGING_SITE_URL }}${{ needs.request.outputs.base }}/');
  assert.deepEqual(cleanup.on, { pull_request_target: { types: ['closed'] }, delete: null });
  assert.equal(cleanup.jobs.cleanup.concurrency.group, 'stage-pr-${{ matrix.pr }}');
  assert.equal(staging.jobs.deploy.concurrency.group, 'stage-pr-${{ github.event.issue.number }}');
  for (const job of Object.values(cleanup.jobs)) {
    assert.equal(job.steps[0].with.ref, '${{ github.event.repository.default_branch }}');
    assert.equal(job.steps[0].with['persist-credentials'], false);
  }
});

test('infrastructure isolates buckets and supports immutable GitHub OIDC subject prefixes', () => {
  const infrastructure = parse(readFileSync(new URL('../infra/github-actions.yml', import.meta.url), 'utf8'), {
    customTags: ['!Sub', '!Ref', '!GetAtt'].map((tag) => ({ tag, resolve: (value) => value }))
  });
  for (const [name, environment] of [['ProductionRole', 'production'], ['StagingRole', 'staging']]) {
    const role = infrastructure.Resources[name].Properties;
    const trust = role.AssumeRolePolicyDocument.Statement[0];
    assert.equal(trust.Condition.StringEquals['token.actions.githubusercontent.com:aud'], 'sts.amazonaws.com');
    assert.equal(trust.Condition.StringEquals['token.actions.githubusercontent.com:sub'],
      `\${OidcSubjectPrefix}:environment:${environment}`);
    const policy = role.Policies[0].PolicyDocument.Statement;
    assert.equal(policy.length, 2);
    if (environment === 'production') {
      assert.equal(policy[1].Resource, 'arn:${AWS::Partition}:s3:::${BucketName}/*');
      assert.ok(!policy[1].Action.includes('s3:DeleteObject'));
    } else {
      assert.equal(policy[0].Resource, 'StagingBucket.Arn');
      assert.equal(policy[1].Resource, '${StagingBucket.Arn}/pr-*/*');
      assert.ok(policy[1].Action.includes('s3:DeleteObject'));
    }
  }
  const bucket = infrastructure.Resources.StagingBucket.Properties;
  assert.equal(bucket.PublicAccessBlockConfiguration.BlockPublicAcls, true);
  assert.equal(bucket.OwnershipControls.Rules[0].ObjectOwnership, 'BucketOwnerEnforced');
  const publicRead = infrastructure.Resources.StagingBucketPolicy.Properties.PolicyDocument.Statement[0];
  assert.equal(publicRead.Action, 's3:GetObject');
  assert.equal(publicRead.Resource, '${StagingBucket.Arn}/pr-*/*');
});

test('S3 publication scopes uploads, preserves old assets and cleans only exact PR folders', () => {
  const directory = mkdtempSync(join(tmpdir(), 'karakter-deploy-'));
  try {
    const log = join(directory, 'calls.jsonl');
    const aws = join(directory, 'aws');
    writeFileSync(aws, `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.AWS_TEST_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');\n`);
    chmodSync(aws, 0o755);
    const run = (prefix) => spawnSync('bash', ['scripts/deploy-site.sh'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`,
        AWS_TEST_LOG: log, S3_BUCKET: 'test-bucket', AWS_ACCOUNT_ID: '123456789012', S3_PREFIX: prefix }
    });
    for (const prefix of ['', 'pr-2', 'pr-20']) {
      writeFileSync(log, '');
      const result = run(prefix);
      assert.equal(result.status, 0, result.stderr);
      const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(calls.length, 3);
      assert.deepEqual(calls[0], ['s3api', 'head-bucket', '--bucket', 'test-bucket', '--expected-bucket-owner', '123456789012']);
      const destination = `s3://test-bucket/${prefix ? `${prefix}/` : ''}`;
      assert.equal(calls[1][3], `${destination}_astro/`);
      assert.equal(calls[2][3], destination);
      assert.ok(calls.every((args) => !args.includes('--delete')));
    }
    for (const prefix of ['other', '/', '../main', 'pr-2/../pr-20', 'pr-2/', 'pr-0']) {
      writeFileSync(log, '');
      assert.notEqual(run(prefix).status, 0);
      assert.equal(readFileSync(log, 'utf8'), '');
    }
    const cleanup = (number) => spawnSync('bash', ['scripts/cleanup-stage.sh'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`,
        AWS_TEST_LOG: log, S3_BUCKET: 'test-bucket', AWS_ACCOUNT_ID: '123456789012', PR_NUMBER: number }
    });
    for (const number of ['2', '20']) {
      writeFileSync(log, '');
      const result = cleanup(number);
      assert.equal(result.status, 0, result.stderr);
      const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(calls.length, 2);
      assert.ok(calls[0].includes('--expected-bucket-owner'));
      assert.deepEqual(calls[1], ['s3', 'rm', `s3://test-bucket/pr-${number}/`, '--recursive', '--only-show-errors']);
    }
    for (const number of ['', '0', '-1', '2/../pr-20', '2;echo unsafe']) {
      writeFileSync(log, '');
      assert.notEqual(cleanup(number).status, 0);
      assert.equal(readFileSync(log, 'utf8'), '');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
