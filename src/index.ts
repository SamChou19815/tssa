/* eslint-disable no-console */

import partitionProjectChangedModulePaths from './changed-modules-partition';
import { getTopologicallyOrderedTransitiveDependencyChainFromTSModules } from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';

const analyzeForProject = (projectDirectory: string, changedPaths: readonly string[]): void => {
  console.log(`-- Analyzing ${projectDirectory} --`);

  const forwardDependencyGraph = buildDependencyGraph(projectDirectory);
  const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
    forwardDependencyGraph
  );

  if (changedPaths.length === 0) {
    console.log(`Nothing is changed for ${projectDirectory}.`);
    return;
  }
  const forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
    forwardDependencyGraph,
    changedPaths
  );
  const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
    reverseDependencyGraph,
    changedPaths
  );

  console.log(forwardDependencyChain);
  console.log(reverseDependencyChain);
  console.log(`-- Finished analysis on ${projectDirectory} --`);
  console.log();
};

const main = (): void => {
  const projects: string[] = [];
  const changedPaths: string[] = [];

  let processedAllProjectsPath = false;
  process.argv.slice(2).forEach((processArgument) => {
    if (processedAllProjectsPath) {
      changedPaths.push(processArgument);
    } else if (processArgument === '--') {
      processedAllProjectsPath = true;
    } else {
      projects.push(processArgument);
    }
  });

  const projectAndChangedPaths = partitionProjectChangedModulePaths(projects, changedPaths);
  projectAndChangedPaths.forEach(({ projectPath, changedModulePaths }) =>
    analyzeForProject(projectPath, changedModulePaths)
  );
};

main();
