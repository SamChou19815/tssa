# tssa

![Build Status](https://github.com/SamChou19815/tssa/workflows/CI/badge.svg)

TypeScript Static Analyzer

## Getting Started

```bash
# Clone this repository
cd tssa
yarn
yarn build
yarn start path/to/ts/project/to/analyze
# using output from git
yarn start path/to/ts/project/to/analyze $(git diff HEAD^ HEAD --name-only)
```
