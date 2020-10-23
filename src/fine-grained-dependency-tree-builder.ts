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

type Tree<T> = {
  readonly value: T;
  readonly children: readonly Tree<T>[];
};

type SymbolReferenceTree = Tree<SourceFileDefinedSymbol>;
export type FileReferenceTree = Tree<string>;

const mergeFileReferenceTrees = (
  trees: readonly FileReferenceTree[]
): readonly FileReferenceTree[] => {
  const map = new Map<string, FileReferenceTree[]>();
  trees.forEach((it) => {
    const container = map.get(it.value);
    if (container == null) {
      map.set(it.value, [it]);
    } else {
      container.push(it);
    }
  });

  return Array.from(map.entries()).map(([filename, subTrees]) => ({
    value: filename,
    children: mergeFileReferenceTrees(subTrees.map((it) => it.children).flat()),
  }));
};

/** Given a tree, coalease nodes that share the same source path. */
const coaleaseSymbolReferenceTree = (tree: SymbolReferenceTree): FileReferenceTree => {
  const rootSourcePath = tree.value.sourceFilePath;
  const sameSourcePathChildren: FileReferenceTree[] = [];
  const differentSourcePathChildren: FileReferenceTree[] = [];

  tree.children.map(coaleaseSymbolReferenceTree).forEach((it) => {
    if (it.value === rootSourcePath) {
      sameSourcePathChildren.push(it);
    } else {
      differentSourcePathChildren.push(it);
    }
  });

  return {
    value: rootSourcePath,
    children: mergeFileReferenceTrees([
      ...sameSourcePathChildren.map((it) => it.children).flat(),
      ...differentSourcePathChildren,
    ]),
  };
};

const getSymbolTransitiveReferencingTree = (
  projects: TypeScriptProjects,
  startSymbol: SourceFileDefinedSymbol
): FileReferenceTree => {
  // Stored format: filePath:::name
  const symbolHashSet = new Set<string>();
  const chain: SourceFileDefinedSymbol[] = [];

  const hash = (symbol: SourceFileDefinedSymbol) => `${symbol.sourceFilePath}:::${symbol.name}`;
  const visit = (symbol: SourceFileDefinedSymbol): SymbolReferenceTree => {
    if (symbolHashSet.has(hash(symbol))) return { value: symbol, children: [] };
    chain.push(symbol);
    symbolHashSet.add(hash(symbol));
    const directReferencingSymbols = getDirectReferencingSymbols(projects, symbol);
    return { value: symbol, children: directReferencingSymbols.map(visit) };
  };

  return coaleaseSymbolReferenceTree(visit(startSymbol));
};

/** Build a fine-grained function-level dependency tree based on a change's line number intervals. */
const buildFineGrainedDependencyTree = (
  projects: TypeScriptProjects,
  changeSourceFilePath: string,
  changeIntervals: readonly (readonly [number, number])[]
): FileReferenceTree | null => {
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

  const trees = mergeFileReferenceTrees(
    affectedSymbols.map((symbol) => getSymbolTransitiveReferencingTree(projects, symbol))
  );
  if (trees.length === 0) return null;
  if (trees.length === 1) return trees[0];
  throw new Error(`Too many trees: ${trees.map((it) => it.value).join(', ')}`);
};

export default buildFineGrainedDependencyTree;
