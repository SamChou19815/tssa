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
import type { TssaResult } from './tssa-result';
import TypeScriptProjects from './typescript-projects';

/** Run all available analysis on the change. */
const getTSSAResult = (projectPaths: readonly string[], diffString: string): TssaResult => {
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
    projectPaths,
    changedTSFiles,
    (it) => it.sourceFilePath
  );
  const projectAndChangedCssPaths = partitionProjectChangedModulePaths(
    projectPaths,
    changedCssPaths,
    (it) => it
  );
  const relevantProjectPaths = [...projectAndChangedTSPaths, ...projectAndChangedCssPaths].map(
    (it) => it.projectPath
  );
  const typescriptProjects = new TypeScriptProjects(projectPaths);

  const changedTSFileReferenceAnalysisResult = changedTSFiles.map((changedFile) => ({
    changedFilePath: changedFile.sourceFilePath,
    affectedFunctionChain: buildFineGrainedDependencyChain(
      typescriptProjects,
      changedFile.sourceFilePath,
      changedFile.changedLineIntervals
    ),
  }));

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

  return {
    typescriptAnalysisResult: changedTSFileReferenceAnalysisResult,
    cssAnalysisResult: allCssDependencyChain,
  };
};

export default getTSSAResult;
