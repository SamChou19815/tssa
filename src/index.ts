#!/usr/bin/env node

import { readFileSync } from 'fs';

import { getPullRequestDiff, commentOnPullRequest } from './github-operations';
import getTSSAResult from './main-analyzer';
import { tssaResultToString } from './tssa-result';

const main = async () => {
  const onCI = Boolean(process.env.CI);
  const analysisResultString = tssaResultToString(
    getTSSAResult(
      process.argv.slice(2),
      onCI ? await getPullRequestDiff() : readFileSync(process.stdin.fd).toString()
    )
  );

  // eslint-disable-next-line no-console
  console.log(analysisResultString);

  if (onCI) {
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  }
};

main();
