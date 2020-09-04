import { getGlobalTopologicallyOrderedTransitiveDependencyChain } from './dependency-graph-analyzer';
import buildDependencyGraph from './dependency-graph-builder';
import type { Graph } from './dependency-graph-types';

type DependencyAnalysisResult = {
  readonly graph: Graph;
  readonly dependencyChain: readonly string[];
};

const performDependencyAnalysisForProject = (
  projectDirectory: string
): DependencyAnalysisResult => {
  const graph = buildDependencyGraph(projectDirectory);
  const dependencyChain = getGlobalTopologicallyOrderedTransitiveDependencyChain(graph);
  return { graph, dependencyChain };
};

export default performDependencyAnalysisForProject;
