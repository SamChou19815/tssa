/* eslint-disable no-console */

import { normalize } from 'path';

import buildFineGrainedDependencyChain from './fine-grained-dependency-chain-builder';
import processGitDiffString, { ChangedFile } from './git-diff-processor';
import type { TssaResult } from './tssa-result';
import TypeScriptProjects from './typescript-projects';

/** Run all available analysis on the change. */
const getTSSAResult = (projectPaths: readonly string[], diffString: string): TssaResult => {
  const changedTSFiles: ChangedFile[] = [];

  processGitDiffString(diffString).forEach((changedFile) => {
    const normalizedPath = normalize(changedFile.sourceFilePath);
    if (
      normalizedPath.endsWith('.ts') ||
      normalizedPath.endsWith('.tsx') ||
      normalizedPath.endsWith('.js') ||
      normalizedPath.endsWith('.cjs') ||
      normalizedPath.endsWith('.jsx')
    ) {
      if (
        normalizedPath.includes('__test__') ||
        normalizedPath.includes('__tests__') ||
        normalizedPath.includes('.test.') ||
        normalizedPath.includes('.tests.')
      ) {
        return;
      }
      changedTSFiles.push({ ...changedFile, sourceFilePath: normalizedPath });
    }
  });

  const typescriptProjects = new TypeScriptProjects(projectPaths);

  const changedTSFileReferenceAnalysisResult = changedTSFiles.map((changedFile) => {
    const partitionedFunctionChain = new Map<string, string[]>();
    buildFineGrainedDependencyChain(
      typescriptProjects,
      changedFile.sourceFilePath,
      changedFile.changedLineIntervals
    ).forEach((symbolWithFilename) => {
      const symbolList = partitionedFunctionChain.get(symbolWithFilename.sourceFilePath);
      if (symbolList == null) {
        partitionedFunctionChain.set(symbolWithFilename.sourceFilePath, [symbolWithFilename.name]);
      } else {
        symbolList.push(symbolWithFilename.name);
      }
    });
    return {
      changedFilePath: changedFile.sourceFilePath,
      affectedFunctionChain: Array.from(partitionedFunctionChain.entries()).map(
        ([filename, symbols]) => ({
          filename,
          symbols: symbols.sort((a, b) => a.localeCompare(b)),
        })
      ),
    };
  });

  return changedTSFileReferenceAnalysisResult;
};

export default getTSSAResult;
