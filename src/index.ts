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
  const changedTSPaths: string[] = [];
  const changedCssPaths: string[] = [];

  let processedAllProjectsPath = false;
  process.argv.slice(2).forEach((processArgument) => {
    if (processedAllProjectsPath) {
      const normalizedPath = normalize(processArgument);
      if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.scss')) {
        changedCssPaths.push(normalizedPath);
      } else {
        changedTSPaths.push(normalizedPath);
      }
    } else if (processArgument === '--') {
      processedAllProjectsPath = true;
    } else {
      projects.push(normalize(processArgument));
    }
  });

  const projectAndChangedTSPaths = partitionProjectChangedModulePaths(projects, changedTSPaths);
  const projectAndChangedCssPaths = partitionProjectChangedModulePaths(projects, changedCssPaths);
  const allForwardDependencies: string[] = [];
  const allReverseDependencies: string[] = [];
  const allForwardDependencyChain: string[] = [];
  const allReverseDependencyChain: string[] = [];
  [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].forEach(
    ({ projectPath, changedModulePaths }) => {
      if (changedModulePaths.length === 0) {
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
    }
  );

  const analysisResultString = `Forward Dependencies:

${dependencyListToString(allForwardDependencies)}

Reverse Dependencies:

${dependencyListToString(allReverseDependencies)}

Transitive Forward Dependencies:

${dependencyListToString(allForwardDependencyChain)}

Transitive Reverse Dependencies:

${dependencyListToString(allReverseDependencyChain)}`;

  if (process.env.CI && process.env.GITHUB_TOKEN && process.env.USER_LOGIN) {
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  }

  console.log(analysisResultString);
};

main();
