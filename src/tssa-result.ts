import type { FileReferenceTree } from './fine-grained-dependency-tree-builder';

export type TssaResult = readonly FileReferenceTree[];

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const getDivergingPoint = (tree: FileReferenceTree): readonly string[] | null => {
  if (tree.children.length === 0) return null;
  if (tree.children.length >= 2) return tree.children.map((it) => it.value);
  return getDivergingPoint(tree.children[0]);
};

export const tssaResultToString = (typescriptAnalysisResult: TssaResult): string => {
  const tsDependencyAnalysisResultStrings = typescriptAnalysisResult.map((tree) => {
    if (tree.children.length === 0) return null;
    const divergingPoint = getDivergingPoint(tree);
    if (divergingPoint == null) {
      return `Your changes in \`${tree.value}\` will directly affect: \`${tree.children[0].value}\``;
    }
    const directChildren = tree.children.map((it) => it.value);
    if (directChildren.length > 1) {
      return `Your changes in \`${tree.value}\` may directly affect:

${dependencyListToString(directChildren)}`;
    }

    return `Your changes in \`${tree.value}\` may directly affect: \`${directChildren[0]}\`.

It will also affect the following files. Make sure you fully test those changes!

${dependencyListToString(divergingPoint)}`;
  });

  const analysisResultStrings = tsDependencyAnalysisResultStrings.filter(
    (it): it is string => it != null
  );
  return analysisResultStrings.length === 0
    ? 'No notable changes.'
    : analysisResultStrings.join('\n\n');
};
