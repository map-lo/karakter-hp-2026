function stageTarget(number) {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error('Invalid pull request number; refusing an unsafe staging path.');
  }
  return { prefix: `stage/pr-${number}`, base: `/stage/pr-${number}` };
}

function assertStagePullRequest(pr, repository) {
  if (pr.state !== 'open' || pr.head.repo?.full_name !== repository || pr.head.ref === 'main') {
    throw new Error('Staging requires an open, non-main pull request from this repository; forks are not deployed.');
  }
}

async function resolveStageRequest({ github, context, core }) {
  const permission = await github.rest.repos.getCollaboratorPermissionLevel({
    ...context.repo, username: context.payload.comment.user.login
  });
  if (!['admin', 'maintain', 'write'].includes(permission.data.permission)) {
    throw new Error('Only collaborators with write access may request staging.');
  }
  const { data: pr } = await github.rest.pulls.get({
    ...context.repo, pull_number: context.issue.number
  });
  const repository = `${context.repo.owner}/${context.repo.repo}`;
  assertStagePullRequest(pr, repository);
  if (!/^[a-f0-9]{40}$/.test(pr.head.sha)) {
    throw new Error('GitHub did not return a valid PR commit SHA.');
  }
  const target = stageTarget(context.issue.number);
  core.setOutput('sha', pr.head.sha);
  core.setOutput('prefix', target.prefix);
  core.setOutput('base', target.base);
}

async function assertStageDeployable({ github, context, sha }) {
  const { data: pr } = await github.rest.pulls.get({
    ...context.repo, pull_number: context.issue.number
  });
  assertStagePullRequest(pr, `${context.repo.owner}/${context.repo.repo}`);
  if (pr.head.sha !== sha) {
    throw new Error('The PR changed during the build. Comment /stage again to stage the new commit.');
  }
  await github.rest.repos.getBranch({ ...context.repo, branch: pr.head.ref });
}

module.exports = { stageTarget, resolveStageRequest, assertStageDeployable };
