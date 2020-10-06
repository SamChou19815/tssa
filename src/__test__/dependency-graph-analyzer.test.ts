import {
  getDependenciesFromTSModules,
  getTopologicallyOrderedTransitiveDependencyChainFromTSModules,
  getGlobalTopologicallyOrderedTransitiveDependencyChain,
} from '../dependency-graph-analyzer';

it('getDependenciesFromTSModules works.', () => {
  expect(getDependenciesFromTSModules({ a: ['b', 'c'], d: ['b', 'c'] }, ['a', 'c', 'e'])).toEqual([
    'b',
    'c',
  ]);
});

it('getTopologicallyOrderedTransitiveDependencyChainFromTSModules works.', () => {
  expect(
    getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      { a: ['b', 'e'], d: ['b', 'c', 'a'], f: ['g'] },
      ['d', 'f']
    )
  ).toEqual({ d: ['b', 'c', 'e', 'a'], f: ['g'] });
});

it('getGlobalTopologicallyOrderedTransitiveDependencyChain works.', () => {
  expect(
    getGlobalTopologicallyOrderedTransitiveDependencyChain({
      a: ['b', 'e'],
      d: ['b', 'c', 'a'],
      f: ['g'],
    })
  ).toEqual({
    a: ['b', 'e'],
    d: ['b', 'c', 'e', 'a'],
    f: ['g'],
  });
});
