type AffectedFileWithSymbols = {
  readonly filename: string;
  readonly symbols: readonly string[];
};

type ChangedFileReport = {
  readonly changedFilePath: string;
  readonly affectedFunctionChain: readonly AffectedFileWithSymbols[];
};

export type TssaResult = readonly ChangedFileReport[];

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const affectedFileWithSymbolsToString = ({ filename, symbols }: AffectedFileWithSymbols): string =>
  `${filename} > ${symbols.join(', ')}`;

export const tssaResultToString = (typescriptAnalysisResult: TssaResult): string => {
  const tsDependencyAnalysisResultStrings = typescriptAnalysisResult.map(
    ({ changedFilePath, affectedFunctionChain }) => {
      if (affectedFunctionChain.length === 0) return null;
      return `Your changes in \`${changedFilePath}\` may directly or indirectly affect:

${dependencyListToString(affectedFunctionChain.map(affectedFileWithSymbolsToString))}`;
    }
  );

  const analysisResultStrings = tsDependencyAnalysisResultStrings.filter(
    (it): it is string => it != null
  );
  return analysisResultStrings.length === 0
    ? 'No notable changes.'
    : analysisResultStrings.join('\n\n');
};
