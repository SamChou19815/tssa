import { Octokit } from '@octokit/rest';

const getOctokit = (githubToken: string): Octokit =>
  new Octokit({
    auth: `token ${githubToken}`,
    userAgent: 'cornell-dti/big-diff-warning',
  });

const commentOnPullRequest = async (
  userLogin: string,
  githubToken: string,
  prefix: string,
  comment: string
): Promise<void> => {
  const ownerAndRepository = process.env.GITHUB_REPOSITORY?.split('/');
  const githubPullRequestNumber = process.env.GITHUB_PR_NUMBER;
  if (ownerAndRepository == null || githubPullRequestNumber == null) throw new Error();
  const [owner, repo] = ownerAndRepository;
  const number = parseInt(githubPullRequestNumber, 10);
  const octokit = getOctokit(githubToken);
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: number,
  });
  const existingCommentFromThisPackage = comments.find(
    (existingComment) =>
      existingComment.user.login === userLogin && existingComment.body.startsWith(prefix)
  );
  const body = `${prefix} ${comment}`;
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

export default commentOnPullRequest;
