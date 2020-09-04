import { Graph } from './types';

const constructDependencyChain = (
  graph: Graph,
  node: string,
  dependencyChain: string[],
  parentChain: string[],
  parentSet: Set<string>,
  allVisited: Set<string>,
  cyclicDependencyProblems: string[]
): void => {
  // Check cyclic dependencies
  if (allVisited.has(node)) {
    if (!parentSet.has(node)) {
      // We reach the end of the chain because we have visited it before.
      return;
    }
    parentChain.push(node);
    const firstIndex = parentChain.findIndex((parentNode) => parentNode === node);
    const cyclicDependencyChain = parentChain.slice(firstIndex).join(' -> ');
    cyclicDependencyProblems.push(cyclicDependencyChain);
    return;
  }
  const dependencies = graph[node] ?? [];
  // Visit dependencies
  allVisited.add(node);
  parentChain.push(node);
  parentSet.add(node);
  dependencies.forEach((dependencyNode) =>
    constructDependencyChain(
      graph,
      dependencyNode,
      dependencyChain,
      parentChain,
      parentSet,
      allVisited,
      cyclicDependencyProblems
    )
  );
  parentSet.delete(node);
  parentChain.pop();
  dependencyChain.push(node);
};

const dependencyChainBuilder = (graph: Graph): readonly string[] => {
  const importedCounter = new Map<string, number>();
  Object.entries(graph).forEach(([key, imports]) => {
    importedCounter.set(key, importedCounter.get(key) ?? 0);
    imports.forEach((oneImport) => {
      importedCounter.set(oneImport, (importedCounter.get(oneImport) ?? 0) + 1);
    });
  });
  const dependencyChain: string[] = [];
  const cyclicDependencyProblems: string[] = [];
  const allVisited: Set<string> = new Set();
  importedCounter.forEach((count, node) => {
    if (count === 0) {
      constructDependencyChain(
        graph,
        node,
        dependencyChain,
        [],
        new Set(),
        allVisited,
        cyclicDependencyProblems
      );
    }
  });
  Object.keys(graph).forEach((node) => {
    if (!allVisited.has(node)) {
      constructDependencyChain(
        graph,
        node,
        dependencyChain,
        [],
        new Set(),
        allVisited,
        cyclicDependencyProblems
      );
    }
  });
  if (cyclicDependencyProblems.length > 0) {
    throw new Error(`Cyclic dependencies: ${cyclicDependencyProblems.join(', ')}`);
  }
  return dependencyChain;
};

export default dependencyChainBuilder;
