# tssa

![Build Status](https://github.com/SamChou19815/tssa/workflows/CI/badge.svg)

TypeScript Static Analyzer

## Getting Started

```bash
# Clone this repository
cd tssa
yarn
yarn build
# using output from git
yarn start path/1/to/ts/project/to/analyze path/2/to/ts/project/to/analyze -- $(git diff HEAD^ HEAD --name-only)
```
