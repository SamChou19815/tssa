/* eslint-disable no-console */
import {
  getTopologicallyOrderedTransitiveDependencyChainFromTSModules,
  getGlobalTopologicallyOrderedTransitiveDependencyChain,
} from './dependency-graph-analyzer';
import buildDependencyGraph from './dependency-graph-builder';

function main(): void {
  const projectDirectory = process.argv[2];
  const queryPaths = process.argv.slice(3);

  if (typeof projectDirectory !== 'string') {
    console.error('project must be a string!');
    return;
  }

  const graph = buildDependencyGraph(projectDirectory);
  const dependencyChain =
    queryPaths.length > 0
      ? getTopologicallyOrderedTransitiveDependencyChainFromTSModules(graph, queryPaths)
      : getGlobalTopologicallyOrderedTransitiveDependencyChain(graph);

  console.log(graph);
  console.log(dependencyChain);
}

main();
