export type FileChangeImpact =
  | {
      readonly type: 'DIRECTLY_AFFECT_ONLY';
      readonly filename: string;
      readonly affected: readonly string[];
    }
  | {
      readonly type: 'BOTH_DIRECT_AND_MULTIPLE_INDIRECT';
      readonly filename: string;
      readonly directlyAffected: string;
      readonly indirectlyAffected: readonly string[];
    };
export type TssaResult = readonly FileChangeImpact[];

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const hiddenByDefaultStringWrapper = (content: string): string => `<details>
<summary>There are too many lines in change impact analysis report. It is hidden by default.</summary>
${content}
</details>`;

export const tssaResultToString = (typescriptAnalysisResult: TssaResult): string => {
  const impactListTotalLength = typescriptAnalysisResult.reduce(
    (accumulator, impact) =>
      impact.type === 'DIRECTLY_AFFECT_ONLY'
        ? accumulator + impact.affected.length
        : accumulator + impact.indirectlyAffected.length + 1,
    0
  );

  const tsDependencyAnalysisResultStrings = typescriptAnalysisResult.map((it) => {
    if (it.type === 'DIRECTLY_AFFECT_ONLY') {
      return `Your changes in \`${it.filename}\` may directly affect:

${dependencyListToString(it.affected)}`;
    }

    return `Your changes in \`${it.filename}\` may directly affect: \`${it.directlyAffected}\`.

It will also affect the following files. Make sure you fully test those changes!

${dependencyListToString(it.indirectlyAffected)}`;
  });

  const result =
    tsDependencyAnalysisResultStrings.length === 0
      ? 'No notable changes.'
      : tsDependencyAnalysisResultStrings.join('\n\n');
  return impactListTotalLength > 25 ? hiddenByDefaultStringWrapper(result) : result;
};
