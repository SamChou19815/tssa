/* eslint-disable no-console */

import { normalize } from 'path';

import buildFineGrainedDependencyTree, {
  FileReferenceTree,
} from './fine-grained-dependency-tree-builder';
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

  const changedTSFileReferenceAnalysisResult = changedTSFiles.map((changedFile) =>
    buildFineGrainedDependencyTree(
      typescriptProjects,
      changedFile.sourceFilePath,
      changedFile.changedLineIntervals
    )
  );

  return changedTSFileReferenceAnalysisResult.filter((it): it is FileReferenceTree => it != null);
};

export default getTSSAResult;
