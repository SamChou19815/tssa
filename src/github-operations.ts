import { Octokit } from '@octokit/rest';

const getOctokit = (): Octokit =>
  new Octokit({
    auth: `token ${process.env.GITHUB_TOKEN}`,
    userAgent: 'developer-sam',
  });

type PullRequest = {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
};

const getPullRequest = (): PullRequest => {
  const ownerAndRepository = process.env.GITHUB_REPOSITORY?.split('/');
  const githubPullRequestNumber = process.env.GITHUB_PR_NUMBER;
  if (ownerAndRepository == null || githubPullRequestNumber == null) throw new Error();
  const [owner, repo] = ownerAndRepository;
  const number = parseInt(githubPullRequestNumber, 10);

  return { owner, repo, number };
};

export const getPullRequestDiff = async (): Promise<string> => {
  const { owner, repo, number } = getPullRequest();
  const octokit = getOctokit();
  const { data: diff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: number,
    headers: { accept: 'application/vnd.github.v3.diff' },
  });
  // The type definition cannot understand using `vnd.github.v3.diff` will return a diff string.
  return (diff as unknown) as string;
};

export const commentOnPullRequest = async (prefix: string, comment: string): Promise<void> => {
  const { owner, repo, number } = getPullRequest();
  const octokit = getOctokit();
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: number,
  });
  const existingCommentFromThisPackage = comments.find((existingComment) =>
    existingComment.body.startsWith(prefix)
  );
  const body = `${prefix}${comment}`;
  if (existingCommentFromThisPackage == null) {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });
    return;
  }
  await octokit.issues.updateComment({
    owner,
    repo,
    comment_id: existingCommentFromThisPackage.id,
    body,
  });
};
