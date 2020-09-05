/* eslint-disable no-console */

import { normalize } from 'path';

import partitionProjectChangedModulePaths from './changed-modules-partition';
import { getTopologicallyOrderedTransitiveDependencyChainFromTSModules } from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';

const analyzeForProject = (projectDirectory: string, changedPaths: readonly string[]): void => {
  console.log(`[tssa] Analyzing ${projectDirectory}...`);

  const forwardDependencyGraph = buildDependencyGraph(projectDirectory);
  const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
    forwardDependencyGraph
  );

  if (changedPaths.length === 0) {
    console.log(`[OK] Nothing is changed for ${projectDirectory}.`);
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
  console.log(`[tssa] Finished analysis on ${projectDirectory}.`);
  console.log();
};

const main = (): void => {
  const projects: string[] = [];
  const changedPaths: string[] = [];

  let processedAllProjectsPath = false;
  process.argv.slice(2).forEach((processArgument) => {
    if (processedAllProjectsPath) {
      changedPaths.push(normalize(processArgument));
    } else if (processArgument === '--') {
      processedAllProjectsPath = true;
    } else {
      projects.push(normalize(processArgument));
    }
  });

  const projectAndChangedPaths = partitionProjectChangedModulePaths(projects, changedPaths);
  projectAndChangedPaths.forEach(({ projectPath, changedModulePaths }) =>
    analyzeForProject(projectPath, changedModulePaths)
  );

  console.log('[tssa] Finished running analysis on all projects.');
};

main();
