import type { Graph } from './dependency-graph-types';

export const getDependenciesFromTSModules = (
  graph: Graph,
  tsModules: readonly string[]
): readonly string[] => {
  const set = new Set<string>();
  tsModules.forEach((tsModule) => graph[tsModule]?.forEach((dependency) => set.add(dependency)));
  return Array.from(set);
};

const getDependencyChainForTSModule = (graph: Graph, tsModule: string): readonly string[] => {
  const dependencyChain: string[] = [];
  const parentChain: string[] = [];
  const parentSet = new Set<string>();
  const allVisited = new Set<string>();

  const visit = (node: string): void => {
    // Check cyclic dependencies.
    if (allVisited.has(node)) {
      if (!parentSet.has(node)) {
        // We reach the end of the chain because we have visited it before.
        return;
      }
      parentChain.push(node);
      const firstIndex = parentChain.indexOf(node);
      const cyclicDependencyChain = parentChain.slice(firstIndex, parentChain.length).join(' -> ');
      // eslint-disable-next-line no-console
      console.error(`Cyclic dependency detected: ${cyclicDependencyChain}`);
      return;
    }

    // Visit dependencies
    const moduleDependencies = graph[node] ?? [];
    allVisited.add(node);
    parentChain.push(node);
    parentSet.add(node);
    moduleDependencies.forEach(visit);
    parentSet.delete(node);
    parentChain.pop();
    dependencyChain.push(node);
  };

  visit(tsModule);
  return dependencyChain;
};

export const getTopologicallyOrderedTransitiveDependencyChainFromTSModules = (
  graph: Graph,
  tsModules: readonly string[]
): readonly string[] => {
  const sorted: string[] = [];
  const set = new Set<string>();

  tsModules.forEach((tsModule) => {
    const oneDependencyChainSorted = getDependencyChainForTSModule(graph, tsModule);
    oneDependencyChainSorted.forEach((moduleName) => {
      if (!set.has(moduleName)) {
        sorted.push(moduleName);
        set.add(moduleName);
      }
    });
  });

  return sorted;
};

export const getGlobalTopologicallyOrderedTransitiveDependencyChain = (
  graph: Graph
): readonly string[] =>
  getTopologicallyOrderedTransitiveDependencyChainFromTSModules(graph, Object.keys(graph));
