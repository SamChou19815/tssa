# tssa

![Build Status](https://github.com/SamChou19815/tssa/workflows/CI/badge.svg)

TypeScript Static Analyzer

## Getting Started

```bash
yarn add --dev @dev-sam/tssa
yarn tssa path/1/to/ts/project/to/analyze path/2/to/ts/project/to/analyze -- $(git diff HEAD^ HEAD --name-only)
```
