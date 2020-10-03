import { relative } from 'path';

// eslint-disable-next-line import/no-duplicates
import type TypeScriptProjects from './typescript-projects';
// eslint-disable-next-line import/no-duplicates
import type { SourceFileDefinedSymbol } from './typescript-projects';

const hasIntersection = (xStart: number, xEnd: number, yStart: number, yEnd: number): boolean => {
  return !(xStart > yEnd || yStart > xEnd);
};

const getDirectReferencingSymbols = (
  projects: TypeScriptProjects,
  symbol: SourceFileDefinedSymbol
): readonly SourceFileDefinedSymbol[] => {
  const referencingSymbols: SourceFileDefinedSymbol[] = [];

  symbol.topLevelDeclaration.findReferences().forEach((referencedSymbol) => {
    referencedSymbol.getReferences().forEach((referenceEntry) => {
      const referencingSourceFilePath = relative('.', referenceEntry.getSourceFile().getFilePath());
      const textSpan = referenceEntry.getTextSpan();
      referencingSymbols.push(
        ...projects
          .getDefinedSymbols(referencingSourceFilePath)
          .filter((potentiallyReferencingSymbol) =>
            hasIntersection(
              potentiallyReferencingSymbol.textSpanStart,
              potentiallyReferencingSymbol.textSpanEnd,
              textSpan.getStart(),
              textSpan.getEnd()
            )
          )
      );
    });
  });

  return referencingSymbols;
};

const getSymbolTransitiveReferencingChain = (
  projects: TypeScriptProjects,
  symbols: readonly SourceFileDefinedSymbol[]
): readonly SourceFileDefinedSymbol[] => {
  // Stored format: filePath:::name
  const symbolHashSet = new Set<string>();
  const chain: SourceFileDefinedSymbol[] = [];

  const hash = (symbol: SourceFileDefinedSymbol) => `${symbol.sourceFilePath}:::${symbol.name}`;
  const visit = (symbol: SourceFileDefinedSymbol) => {
    if (symbolHashSet.has(hash(symbol))) return;
    chain.push(symbol);
    symbolHashSet.add(hash(symbol));
    getDirectReferencingSymbols(projects, symbol).forEach(visit);
  };

  symbols.forEach(visit);

  return chain;
};

/**
 * Build a fine-grained function-level dependency chain based on a change's line number intervals.
 *
 * @returns a topologically sorted dependency symbol chain, starting from the symbol that contains the
 * line number interval, to the top-level symbol that consumes it.
 */
const buildFineGrainedDependencyChain = (
  projects: TypeScriptProjects,
  changeSourceFilePath: string,
  changeIntervals: readonly (readonly [number, number])[]
): readonly SourceFileDefinedSymbol[] => {
  // Retain symbols that have intersections with the change line intervals.
  const affectedSymbols = projects
    .getDefinedSymbols(changeSourceFilePath)
    .filter((symbol) =>
      changeIntervals.some(([changeStartLineNumber, changeEndLineNumber]) =>
        hasIntersection(
          symbol.startLineNumber,
          symbol.endLineNumber,
          changeStartLineNumber,
          changeEndLineNumber
        )
      )
    );

  return getSymbolTransitiveReferencingChain(projects, affectedSymbols);
};

export default buildFineGrainedDependencyChain;
