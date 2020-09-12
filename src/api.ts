/* eslint-disable no-console */

import { join, normalize } from 'path';

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

/**
 * Run TSSA with supplied arguments.
 * The arguments are separated by `--`. Parts left of `--` are interpreted as paths to TS projects,
 * and parts right of `--` are intepreted as changed file paths. All paths supplied in the arguments
 * are relative to repository root.
 *
 * @param tssaCLIArguments
 */
const runTSSA = (tssaCLIArguments: readonly string[]): void => {
  const projects: string[] = [];
  const changedTSPaths: string[] = [];
  const changedCssPaths: string[] = [];

  let processedAllProjectsPath = false;
  tssaCLIArguments.forEach((processArgument) => {
    if (processedAllProjectsPath) {
      const normalizedPath = normalize(processArgument);
      if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.scss')) {
        changedCssPaths.push(normalizedPath);
      } else if (
        normalizedPath.endsWith('.ts') ||
        normalizedPath.endsWith('.tsx') ||
        normalizedPath.endsWith('.js') ||
        normalizedPath.endsWith('.cjs') ||
        normalizedPath.endsWith('.jsx')
      ) {
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

  let allTSReverseDependencies: string[] = [];
  let allTSReverseDependencyChain: string[] = [];
  let allCssDependencyChain: string[] = [];
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

  projectAndChangedTSPaths.forEach(({ projectPath: projectDirectory, changedModulePaths }) => {
    if (changedModulePaths.length === 0) {
      return;
    }
    const [, reverseDependencyGraph] = graphs[projectDirectory];

    const reverseDependencies = getDependenciesFromTSModules(
      reverseDependencyGraph,
      changedModulePaths
    ).map((it) => join(projectDirectory, it));
    const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      reverseDependencyGraph,
      changedModulePaths
    ).map((it) => join(projectDirectory, it));

    allTSReverseDependencies.push(...reverseDependencies, ...changedModulePaths);
    allTSReverseDependencyChain.push(...reverseDependencyChain);
  });

  projectAndChangedCssPaths.forEach(({ projectPath: projectDirectory, changedModulePaths }) => {
    if (changedModulePaths.length === 0) {
      return;
    }
    const [forwardDependencyGraph, reverseDependencyGraph] = graphs[projectDirectory];

    const forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      forwardDependencyGraph,
      changedModulePaths
    ).map((it) => join(projectDirectory, it));
    const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      reverseDependencyGraph,
      changedModulePaths
    ).map((it) => join(projectDirectory, it));

    allCssDependencyChain.push(...forwardDependencyChain, ...reverseDependencyChain);
  });
  allTSReverseDependencies = Array.from(new Set(allTSReverseDependencies));
  allTSReverseDependencyChain = Array.from(new Set(allTSReverseDependencyChain));
  allCssDependencyChain = Array.from(new Set(allCssDependencyChain));

  const tsDirectReverseDependencyAnalysisResultString =
    allTSReverseDependencies.length === 0
      ? null
      : `Modules that your changes in TS code will directly affect:

${dependencyListToString(allTSReverseDependencies)}`;
  const tsTransitiveReverseDependencyAnalysisResultString =
    allTSReverseDependencyChain.length === 0
      ? null
      : `<details>
  <summary>Modules that your changes in TS code may indirectly affect:</summary>

${dependencyListToString(allTSReverseDependencyChain)}

</details>`;
  const cssAnalysisResultString =
    allCssDependencyChain.length === 0
      ? null
      : `Modules that your changes in css code may affect:

${dependencyListToString(allCssDependencyChain)}`;

  const analysisResultStrings = [
    tsDirectReverseDependencyAnalysisResultString,
    tsTransitiveReverseDependencyAnalysisResultString,
    cssAnalysisResultString,
  ].filter((it): it is string => it != null);
  const analysisResultString =
    analysisResultStrings.length === 0 ? 'No notable changes.' : analysisResultStrings.join('\n\n');

  if (process.env.CI && process.env.GITHUB_TOKEN && process.env.USER_LOGIN) {
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  }

  console.log(analysisResultString);
};

export default runTSSA;
