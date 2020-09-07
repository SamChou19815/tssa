/* eslint-disable no-console */

import { normalize } from 'path';

import partitionProjectChangedModulePaths from './changed-modules-partition';
import {
  getDependenciesFromTSModules,
  getTopologicallyOrderedTransitiveDependencyChainFromTSModules,
} from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';

const printDependencyList = (list: readonly string[]): void =>
  console.log(list.map((it) => `> ${it}`).join('\n'));

type ProjectAnalysisResult = {
  forwardDependencies: readonly string[];
  reverseDependencies: readonly string[];
  forwardDependencyChain: readonly string[];
  reverseDependencyChain: readonly string[];
};

const analyzeForProject = (
  projectDirectory: string,
  changedPaths: readonly string[]
): ProjectAnalysisResult => {
  const forwardDependencyGraph = buildDependencyGraph(projectDirectory);
  const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
    forwardDependencyGraph
  );

  const forwardDependencies = getDependenciesFromTSModules(forwardDependencyGraph, changedPaths);
  const reverseDependencies = getDependenciesFromTSModules(forwardDependencyGraph, changedPaths);
  const forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
    forwardDependencyGraph,
    changedPaths
  );
  const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
    reverseDependencyGraph,
    changedPaths
  );

  return {
    forwardDependencies,
    reverseDependencies,
    forwardDependencyChain,
    reverseDependencyChain,
  };
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

  console.log('changed files', changedPaths);

  console.log('[tssa] TypeScript Static Analyzer');
  console.log();
  const projectAndChangedPaths = partitionProjectChangedModulePaths(projects, changedPaths);
  projectAndChangedPaths.forEach(({ projectPath, changedModulePaths }) => {
    console.log(`[tssa] Analyzing \`${projectPath}\`...`);
    if (changedPaths.length === 0) {
      console.log(`[OK] Nothing is changed for \`${projectPath}\`.`);
      return;
    }
    const {
      forwardDependencies,
      reverseDependencies,
      forwardDependencyChain,
      reverseDependencyChain,
    } = analyzeForProject(projectPath, changedModulePaths);

    console.log('Forward Dependencies:');
    printDependencyList(forwardDependencies);
    console.log('Reverse Dependencies:');
    printDependencyList(reverseDependencies);
    console.log('Transitive Forward Dependencies:');
    printDependencyList(forwardDependencyChain);
    console.log('Transitive Reverse Dependencies:');
    printDependencyList(reverseDependencyChain);
    console.log(`[tssa] Finished analysis on \`${projectPath}\`.`);
    console.log();
  });

  console.log('[tssa] Finished running analysis on all projects.');
};

main();
