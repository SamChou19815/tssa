import buildDependencyGraph from './dependency-graph-builder';
import simplifyDependencyGraphWithDroppedExtensions from './dependency-graph-simplifier';
import type { Graph } from './dependency-graph-types';

const performDependencyAnalysisForProject = (projectDirectory: string): Graph =>
  simplifyDependencyGraphWithDroppedExtensions(buildDependencyGraph(projectDirectory));

export default performDependencyAnalysisForProject;
