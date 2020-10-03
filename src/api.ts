/* eslint-disable no-console */

import { readFileSync } from 'fs';
import { join, normalize } from 'path';

import partitionProjectChangedModulePaths from './changed-modules-partition';
import { getTopologicallyOrderedTransitiveDependencyChainFromTSModules } from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';
import type { Graph } from './dependency-graph-types';
import buildFineGrainedDependencyChain from './fine-grained-dependency-chain-builder';
import processGitDiffString, { ChangedFile } from './git-diff-processor';
import commentOnPullRequest from './github-pull-request-comment';
import TypeScriptProjects, { SourceFileDefinedSymbol } from './typescript-projects';

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const sourceFileDefinedSymbolToString = (symbol: SourceFileDefinedSymbol): string =>
  `${symbol.sourceFilePath} > ${symbol.name}`;

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

  const changedTSFileReferenceAnalysisResult = changedTSFiles.map(
    (changedFile) =>
      [
        changedFile.sourceFilePath,
        buildFineGrainedDependencyChain(
          typescriptProjects,
          changedFile.sourceFilePath,
          changedFile.changedLineIntervals
        ),
      ] as const
  );

  let allCssDependencyChain: string[] = [];
  const graphs: Record<string, readonly [Graph, Graph]> = {};

  projectAndChangedCssPaths.forEach(({ projectPath, changedModulePaths }) => {
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
  allCssDependencyChain = Array.from(new Set(allCssDependencyChain));

  const tsDependencyAnalysisResultStrings = changedTSFileReferenceAnalysisResult.map(
    ([changedFilePath, symbols]) => {
      if (symbols.length === 0) return null;
      return `Your changes in ${changedFilePath} may directly or indirectly affect:

${dependencyListToString(symbols.map(sourceFileDefinedSymbolToString))}`;
    }
  );

  const cssAnalysisResultString =
    allCssDependencyChain.length === 0
      ? null
      : `Modules that your changes in css code may affect:

${dependencyListToString(allCssDependencyChain)}`;

  const analysisResultStrings = [
    ...tsDependencyAnalysisResultStrings,
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
