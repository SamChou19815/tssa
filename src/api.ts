/* eslint-disable no-console */

import { normalize } from 'path';

import partitionProjectChangedModulePaths from './changed-modules-partition';
import { getTopologicallyOrderedTransitiveDependencyChainFromTSModules } from './dependency-graph-analyzer';
import {
  buildDependencyGraph,
  buildReverseDependencyGraphFromDependencyGraph,
} from './dependency-graph-builder';
import buildFineGrainedDependencyChain from './fine-grained-dependency-chain-builder';
import processGitDiffString, { ChangedFile } from './git-diff-processor';
import TypeScriptProjects, { SourceFileDefinedSymbol } from './typescript-projects';

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const sourceFileDefinedSymbolToString = (symbol: SourceFileDefinedSymbol): string =>
  `${symbol.sourceFilePath} > ${symbol.name}`;

const getTSSAResultString = (projects: readonly string[], diffString: string): string => {
  const changedTSFiles: ChangedFile[] = [];
  const changedCssPaths: string[] = [];

  processGitDiffString(diffString).forEach((changedFile) => {
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
  const relevantProjectPaths = [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].map(
    (it) => it.projectPath
  );
  const typescriptProjects = new TypeScriptProjects(relevantProjectPaths);

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
  const forwardDependencyGraph = buildDependencyGraph(typescriptProjects, relevantProjectPaths);
  const reverseDependencyGraph = buildReverseDependencyGraphFromDependencyGraph(
    forwardDependencyGraph
  );

  changedCssPaths.forEach((changedCssPath) => {
    const forwardDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      forwardDependencyGraph,
      [changedCssPath]
    );
    const reverseDependencyChain = getTopologicallyOrderedTransitiveDependencyChainFromTSModules(
      reverseDependencyGraph,
      [changedCssPath]
    );

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
  return analysisResultStrings.length === 0
    ? 'No notable changes.'
    : analysisResultStrings.join('\n\n');
};

export default getTSSAResultString;
