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
import commentOnPullRequest from './github-pull-request-comment';

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> ${it}`).join('\n');

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

  const projectAndChangedPaths = partitionProjectChangedModulePaths(projects, changedPaths);
  const allForwardDependencies: string[] = [];
  const allReverseDependencies: string[] = [];
  const allForwardDependencyChain: string[] = [];
  const allReverseDependencyChain: string[] = [];
  projectAndChangedPaths.forEach(({ projectPath, changedModulePaths }) => {
    if (changedPaths.length === 0) {
      return;
    }
    const {
      forwardDependencies,
      reverseDependencies,
      forwardDependencyChain,
      reverseDependencyChain,
    } = analyzeForProject(projectPath, changedModulePaths);

    allForwardDependencies.push(...forwardDependencies);
    allReverseDependencies.push(...reverseDependencies);
    allForwardDependencyChain.push(...forwardDependencyChain);
    allReverseDependencyChain.push(...reverseDependencyChain);
  });

  const analysisResultString = `Forward Dependencies:
${dependencyListToString(allForwardDependencies)}
Reverse Dependencies:
${dependencyListToString(allReverseDependencies)}
Transitive Forward Dependencies:
${dependencyListToString(allForwardDependencyChain)}
Transitive Reverse Dependencies:
${dependencyListToString(allReverseDependencyChain)}`;

  if (process.env.CI && process.env.GITHUB_TOKEN && process.env.USER_LOGIN) {
    commentOnPullRequest('[tssa]', analysisResultString);
  }

  console.log(analysisResultString);
};

main();
