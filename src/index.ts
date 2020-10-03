#!/usr/bin/env node

import getTSSAResultString from './api';
import commentOnPullRequest from './github-pull-request-comment';

const analysisResultString = getTSSAResultString(process.argv.slice(2));

if (process.env.CI && process.env.GITHUB_TOKEN) {
  commentOnPullRequest('[tssa]\n\n', analysisResultString);
} else {
  // eslint-disable-next-line no-console
  console.log(analysisResultString);
}
