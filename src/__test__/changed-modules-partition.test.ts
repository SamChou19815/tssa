import partitionProjectChangedModulePaths from '../changed-modules-partition';

it('partitionProjectChangedModulePaths works on single root.', () => {
  expect(
    partitionProjectChangedModulePaths(['.'], ['src/foo.ts', 'src/bar.ts'], (it) => it)
  ).toEqual([
    {
      projectPath: '.',
      changedModulePaths: ['src/foo.ts', 'src/bar.ts'],
    },
  ]);
});

it('partitionProjectChangedModulePaths works on multi-workspaces.', () => {
  expect(
    partitionProjectChangedModulePaths(
      ['packages/foo', 'packages/bar'],
      ['packages/foo/foo.ts', 'packages/bar/bar.ts'],
      (it) => it
    )
  ).toEqual([
    {
      projectPath: 'packages/foo',
      changedModulePaths: ['foo.ts'],
    },
    {
      projectPath: 'packages/bar',
      changedModulePaths: ['bar.ts'],
    },
  ]);
});
