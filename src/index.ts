/* eslint-disable no-console */
import {
  getTopologicallyOrderedTransitiveDependencyChainFromTSModules,
  getGlobalTopologicallyOrderedTransitiveDependencyChain,
} from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';

function main(): void {
  const projectDirectory = process.argv[2];
  const queryPaths = process.argv.slice(3);

  if (typeof projectDirectory !== 'string') {
    console.error('project must be a string!');
    return;
  }

  const forwardDependencyGraph = buildDependencyGraph(projectDirectory);
  const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
    forwardDependencyGraph
  );

  let forwardDependencyChain: readonly string[];
  let reverseDependencyChain: readonly string[];
  if (queryPaths.length > 0) {
    forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      forwardDependencyGraph,
      queryPaths
    );
    reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      reverseDependencyGraph,
      queryPaths
    );
  } else {
    forwardDependencyChain = getGlobalTopologicallyOrderedTransitiveDependencyChain(
      forwardDependencyGraph
    );
    reverseDependencyChain = getGlobalTopologicallyOrderedTransitiveDependencyChain(
      reverseDependencyGraph
    );
  }

  console.log(forwardDependencyChain);
  console.log(reverseDependencyChain);
}

main();
