/* eslint-disable no-console */

import { normalize } from 'path';

import buildFineGrainedDependencyTree, {
  FileReferenceTree,
} from './fine-grained-dependency-tree-builder';
import processGitDiffString, { ChangedFile } from './git-diff-processor';
import type { FileChangeImpact, TssaResult } from './tssa-result';
import TypeScriptProjects from './typescript-projects';

const getDivergingPoint = (tree: FileReferenceTree): readonly string[] | null => {
  if (tree.children.length === 0) return null;
  if (tree.children.length >= 2) return tree.children.map((it) => it.value);
  return getDivergingPoint(tree.children[0]);
};

const getFileChangeImpactResult = (tree: FileReferenceTree): FileChangeImpact => {
  const divergingPoint = getDivergingPoint(tree);
  if (divergingPoint == null) {
    return {
      type: 'DIRECTLY_AFFECT_ONLY',
      filename: tree.value,
      affected: [tree.children[0].value],
    };
  }
  const directChildren = tree.children.map((it) => it.value);
  if (directChildren.length > 1) {
    return {
      type: 'DIRECTLY_AFFECT_ONLY',
      filename: tree.value,
      affected: directChildren,
    };
  }
  return {
    type: 'BOTH_DIRECT_AND_MULTIPLE_INDIRECT',
    filename: tree.value,
    directlyAffected: directChildren[0],
    indirectlyAffected: divergingPoint,
  };
};

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

  return changedTSFileReferenceAnalysisResult
    .filter((it): it is FileReferenceTree => it != null)
    .filter((it) => it.children.length > 0)
    .map(getFileChangeImpactResult);
};

export default getTSSAResult;
