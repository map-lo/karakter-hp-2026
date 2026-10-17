const { stageTarget } = require('./stage-request.cjs');

async function cleanupTargets({ github, context }) {
  const repository = `${context.repo.owner}/${context.repo.repo}`;
  let pulls;
  if (context.eventName === 'pull_request_target' && context.payload.action === 'closed') {
    pulls = [context.payload.pull_request];
  } else if (context.eventName === 'delete' && context.payload.ref_type === 'branch' && context.payload.ref !== 'main') {
    pulls = await github.paginate(github.rest.pulls.list, {
      ...context.repo, state: 'all', head: `${context.repo.owner}:${context.payload.ref}`, per_page: 100
    });
    pulls = pulls.filter((pr) => pr.head.ref === context.payload.ref);
  } else {
    throw new Error('Unexpected cleanup event; refusing to select staging folders.');
  }
  return [...new Set(pulls
    .filter((pr) => pr.head.repo?.full_name === repository && pr.head.ref !== 'main')
    .map((pr) => {
      stageTarget(pr.number);
      return pr.number;
    }))];
}

async function assertCleanupAllowed({ github, context, number }) {
  stageTarget(number);
  const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number: number });
  if (pr.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}` || pr.head.ref === 'main') {
    throw new Error('Cleanup may only remove previews for non-main PRs from this repository.');
  }
  if (pr.state === 'open') {
    // A deleted branch can be recreated before the cleanup job starts.
    try {
      await github.rest.repos.getBranch({ ...context.repo, branch: pr.head.ref });
    } catch (error) {
      if (error.status === 404) return;
      throw error;
    }
    throw new Error('The PR is open and its branch exists; refusing to delete an active preview.');
  }
}

module.exports = { cleanupTargets, assertCleanupAllowed };
