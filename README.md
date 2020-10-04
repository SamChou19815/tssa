# tssa

![Build Status](https://github.com/SamChou19815/tssa/workflows/CI/badge.svg)

TypeScript Static Analyzer

## Usage

```bash
yarn add --dev @dev-sam/tssa
# In Command Line
git diff HEAD^ HEAD | yarn tssa path/1/to/ts/project/to/analyze path/2/to/ts/project/to/analyze
# Inside a GitHub Action job triggered by pull request (tssa will auto-fetch PR diff)
GITHUB_TOKEN=<token> GITHUB_PR_NUMBER=<PR number> yarn tssa path/1/to/ts/project/to/analyze path/2/to/ts/project/to/analyze
```
