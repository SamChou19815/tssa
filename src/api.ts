/* eslint-disable no-console */

import { readFileSync } from 'fs';
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
import processGitDiffString, { ChangedFile } from './git-diff-processor';
import commentOnPullRequest from './github-pull-request-comment';
import TypeScriptProjects from './typescript-projects';

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> ${it}`).join('\n');

const runTSSA = (projects: readonly string[]): void => {
  const changedTSFiles: ChangedFile[] = [];
  const changedCssPaths: string[] = [];

  processGitDiffString(readFileSync(process.stdin.fd).toString()).forEach((changedFile) => {
    const normalizedPath = normalize(changedFile.sourceFilePath);
    if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.scss')) {
      changedCssPaths.push(normalizedPath);
    } else if (
      normalizedPath.endsWith('.ts') ||
      normalizedPath.endsWith('.tsx') ||
      normalizedPath.endsWith('.js') ||
      normalizedPath.endsWith('.cjs') ||
      normalizedPath.endsWith('.jsx')
    ) {
      changedTSFiles.push({ ...changedFile, sourceFilePath: normalizedPath });
    }
  });

  const projectAndChangedTSPaths = partitionProjectChangedModulePaths(
    projects,
    changedTSFiles,
    (it) => it.sourceFilePath
  );
  const projectAndChangedCssPaths = partitionProjectChangedModulePaths(
    projects,
    changedCssPaths,
    (it) => it
  );
  const typescriptProjects = new TypeScriptProjects(
    [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].map((it) => it.projectPath)
  );

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
        const forwardDependencyGraph = buildDependencyGraph(typescriptProjects, projectPath);
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

    allTSReverseDependencies.push(
      ...reverseDependencies,
      ...changedModulePaths.map((it) => join(projectDirectory, it))
    );
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

  if (process.env.CI && process.env.GITHUB_TOKEN) {
    commentOnPullRequest('[tssa]\n\n', analysisResultString);
  }

  console.log(analysisResultString);
};

export default runTSSA;
