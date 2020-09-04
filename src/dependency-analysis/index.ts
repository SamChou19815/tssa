import buildGraph from './dependency-graph-builder';
import simplify from './simplifier';
import { buildDirectoryDependencyGraph, dependencyChainBuilder } from './dependency-analyzer';
import outputGraph from './graphviz-helper';
import { Graph } from './types';

type Options = {
  readonly projectDirectory: string;
  readonly doesOutputGraph: boolean;
  readonly doesCheckCyclicDependencies: boolean;
};

export default ({
  projectDirectory,
  doesOutputGraph = false,
  doesCheckCyclicDependencies = false,
}: Options): [Graph, Graph] => {
  const rawGraph = buildGraph(projectDirectory);
  if (doesCheckCyclicDependencies) {
    dependencyChainBuilder(rawGraph);
  }
  const moduleDependencyGraph = simplify(rawGraph);
  const directoryDependencyGraph = simplify(buildDirectoryDependencyGraph(rawGraph));
  if (doesOutputGraph) {
    outputGraph(moduleDependencyGraph, 'module-graph.png');
    outputGraph(directoryDependencyGraph, 'directory-graph.png');
  }
  return [moduleDependencyGraph, directoryDependencyGraph];
};
