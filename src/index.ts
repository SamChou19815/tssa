#!/usr/bin/env node

import { readFileSync } from 'fs';

import getTSSAResultString from './api';
import { getPullRequestDiff, commentOnPullRequest } from './github-operations';

const main = async () => {
  if (process.env.CI && process.env.GITHUB_TOKEN) {
    const analysisResultString = getTSSAResultString(
      process.argv.slice(2),
      await getPullRequestDiff()
    );
    // eslint-disable-next-line no-console
    console.log(analysisResultString);
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  } else {
    const analysisResultString = getTSSAResultString(
      process.argv.slice(2),
      readFileSync(process.stdin.fd).toString()
    );
    // eslint-disable-next-line no-console
    console.log(analysisResultString);
  }
};

main();
