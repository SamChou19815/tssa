import dependencyChainBuilder from './dependency-graph-analyzer';
import buildDependencyGraph from './dependency-graph-builder';
import simplifyDependencyGraphWithDroppedExtensions from './dependency-graph-simplifier';
import type { Graph } from './dependency-graph-types';

type DependencyAnalysisResult = {
  readonly graph: Graph;
  readonly dependencyChain: readonly string[];
};

const performDependencyAnalysisForProject = (
  projectDirectory: string
): DependencyAnalysisResult => {
  const rawGraph = buildDependencyGraph(projectDirectory);
  return {
    graph: simplifyDependencyGraphWithDroppedExtensions(rawGraph),
    dependencyChain: dependencyChainBuilder(rawGraph),
  };
};

export default performDependencyAnalysisForProject;
