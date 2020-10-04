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

## Contributing

In order for your changes to be accepted, you need to pass all the CI tests. This implies:

- Your code compiles;
- Your code passes Prettier and ESLint;
- Your code passes existing tests and new tests.

You are encouraged to test your changes locally instead of waiting on CI results. You must write
unit tests for your added pure functions whenever possible.

You can also test your changes on tssa itself. For example, you can create a test branch `test123`,
do some changes in `test123` and commit. Then you can run `git diff master test123 | yarn start .`,
which will give you the diff analysis result on your change in `test123`. Remember that you need to
run `yarn build` before `yarn start` to ensure that you are always using the latest compiled code!

What's even more important is that you test your changes against real complex monorepos. To do that,
you need to run `yarn bundle` to produce a self-contained `index.js` inside `bin`. Then you can copy
`index.js` into the root of the monorepo, and run the test by
`git diff master test123 | node index.js monorepo-package-1 monorepo-package-2 ...`. Note that the
root of the monorepo must has `typescript` as either `devDependency` or `dependency`, since the
bundled `index.js` doesn't bundle TypeScript.
