import buildDependencyGraph from './dependency-graph-builder';
import simplifyDependencyGraphWithDroppedExtensions from './simplifier';
import { Graph } from './types';

const performDependencyAnalysisForProject = (projectDirectory: string): Graph =>
  simplifyDependencyGraphWithDroppedExtensions(buildDependencyGraph(projectDirectory));

export default performDependencyAnalysisForProject;
