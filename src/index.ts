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
import type { Graph } from './dependency-graph-types';
import commentOnPullRequest from './github-pull-request-comment';

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> ${it}`).join('\n');

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
  const graphs: Record<string, readonly [Graph, Graph]> = {};
  [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].forEach(
    ({ projectPath, changedModulePaths }) => {
      if (changedModulePaths.length === 0) {
        return;
      }
      if (graphs[projectPath] == null) {
        const forwardDependencyGraph = buildDependencyGraph(projectPath);
        const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
          forwardDependencyGraph
        );
        graphs[projectPath] = [forwardDependencyGraph, reverseDependencyGraph];
      }
    }
  );

  [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].forEach(
    ({ projectPath: projectDirectory, changedModulePaths }) => {
      if (changedModulePaths.length === 0) {
        return;
      }
      const [forwardDependencyGraph, reverseDependencyGraph] = graphs[projectDirectory];

      const forwardDependencies = getDependenciesFromTSModules(
        forwardDependencyGraph,
        changedModulePaths
      );
      const reverseDependencies = getDependenciesFromTSModules(
        forwardDependencyGraph,
        changedModulePaths
      );
      const forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
        forwardDependencyGraph,
        changedModulePaths
      );
      const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
        reverseDependencyGraph,
        changedModulePaths
      );

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
