#!/usr/bin/env node

import { getPullRequestDiff, commentOnPullRequest } from './github-operations';
import getTSSAResult from './main-analyzer';
import { tssaResultToString } from './tssa-result';

const getStandardIn = async (): Promise<string> =>
  new Promise((resolve) => {
    let content = '';
    process.stdin.resume();
    process.stdin.on('data', (buffer) => {
      content += buffer.toString();
    });
    process.stdin.on('end', () => resolve(content));
  });

const main = async () => {
  const onCI = Boolean(process.env.CI);
  const analysisResultString = tssaResultToString(
    getTSSAResult(process.argv.slice(2), onCI ? await getPullRequestDiff() : await getStandardIn())
  );

  // eslint-disable-next-line no-console
  console.log(analysisResultString);

  if (onCI) {
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  }
};

main();
