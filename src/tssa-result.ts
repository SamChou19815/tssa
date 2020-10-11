type AffectedFileWithSymbols = {
  readonly filename: string;
  readonly symbols: readonly string[];
};

type ChangedFileReport = {
  readonly changedFilePath: string;
  readonly affectedFunctionChain: readonly AffectedFileWithSymbols[];
};

export type TssaResult = {
  readonly typescriptAnalysisResult: readonly ChangedFileReport[];
  /** A list of css affect chain. TODO: separate the result per file. */
  readonly cssAnalysisResult: Record<string, string[]>;
};

const dependencyListToStringByFile = (list: Record<string, string[]>): string => {
  let comment = '';
  Object.keys(list).forEach((k) => {
    comment += `Your changes to \`${k}\` affect: \n ${list[k]
      .map((it) => `> \`${it}\``)
      .join('\n')};`;
  });
  return comment;
};

const dependencyListToString = (list: readonly string[]): string =>
  list.map((it) => `> \`${it}\``).join('\n');

const affectedFileWithSymbolsToString = ({ filename, symbols }: AffectedFileWithSymbols): string =>
  `${filename} > ${symbols.join(', ')}`;

export const tssaResultToString = ({
  typescriptAnalysisResult,
  cssAnalysisResult,
}: TssaResult): string => {
  const tsDependencyAnalysisResultStrings = typescriptAnalysisResult.map(
    ({ changedFilePath, affectedFunctionChain }) => {
      if (affectedFunctionChain.length === 0) return null;
      return `Your changes in \`${changedFilePath}\` may directly or indirectly affect:

${dependencyListToString(affectedFunctionChain.map(affectedFileWithSymbolsToString))}`;
    }
  );

  const cssAnalysisResultString =
    Object.keys(cssAnalysisResult).length === 0
      ? null
      : `Modules that your changes in css code may affect:

${dependencyListToStringByFile(cssAnalysisResult)}`;

  const analysisResultStrings = [
    ...tsDependencyAnalysisResultStrings,
    cssAnalysisResultString,
  ].filter((it): it is string => it != null);
  return analysisResultStrings.length === 0
    ? 'No notable changes.'
    : analysisResultStrings.join('\n\n');
};
