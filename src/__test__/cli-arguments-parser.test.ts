import parseCommandLineArguments from '../cli-arguments-parser';

it('parseCommandLineArguments works', () => {
  expect(
    parseCommandLineArguments(['project1', 'project2', '--', 'a.ts', 'b.css', 'c.scss', 'd.tsx'])
  ).toEqual({
    projects: ['project1', 'project2'],
    changedTSPaths: ['a.ts', 'd.tsx'],
    changedCssPaths: ['b.css', 'c.scss'],
  });
});
