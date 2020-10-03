import { join, relative } from 'path';

import {
  Project,
  SourceFile,
  VariableDeclaration,
  FunctionDeclaration,
  ClassDeclaration,
} from 'ts-morph';

export type SourceFileDefinedSymbol = {
  readonly sourceFilePath: string;
  readonly name: string;
  readonly topLevelDeclaration: VariableDeclaration | FunctionDeclaration | ClassDeclaration;
  readonly isExported: boolean;
  readonly textSpanStart: number;
  readonly textSpanEnd: number;
  /** Starts at 1 */
  readonly startLineNumber: number;
  /** Starts at 1 */
  readonly endLineNumber: number;
};

/**
 * TypeScriptProjects is more than a wrapper around `ts-morph`'s `Project` to only expose methods
 * useful for analysis.
 *
 * TODO: use this class to allow cross package dependency analysis.
 */
export default class TypeScriptProjects {
  readonly projectDirectories: ReadonlySet<string>;

  readonly projectMappings: ReadonlyMap<string, Project>;

  private readonly sourceFileMapping: ReadonlyMap<string, SourceFile>;

  constructor(projectDirectories: readonly string[]) {
    this.projectDirectories = new Set(projectDirectories);
    const projectMappings = new Map<string, Project>();
    const sourceFileMapping = new Map<string, SourceFile>();

    this.projectDirectories.forEach((projectDirectory) => {
      const project = new Project({
        tsConfigFilePath: join(projectDirectory, 'tsconfig.json'),
      });
      projectMappings.set(projectDirectory, project);

      project.getSourceFiles().forEach((sourceFile) => {
        console.log(projectDirectory, sourceFile.getFilePath());
        sourceFileMapping.set(
          join(projectDirectory, relative(projectDirectory, sourceFile.getFilePath())),
          sourceFile
        );
      });
    });

    this.projectMappings = projectMappings;
    this.sourceFileMapping = sourceFileMapping;
  }

  getDefinedSymbols(sourceFilePath: string): readonly SourceFileDefinedSymbol[] {
    const sourceFile = this.sourceFileMapping.get(sourceFilePath);
    if (sourceFile == null) return [];
    const symbols: SourceFileDefinedSymbol[] = [];
    // Looks like these are the only meaningful top-level containers for code.
    [
      ...sourceFile.getVariableDeclarations(),
      ...sourceFile.getFunctions(),
      ...sourceFile.getClasses(),
    ].forEach((topLevelDeclaration) => {
      const name = topLevelDeclaration.getName();
      if (name == null) return;
      symbols.push({
        sourceFilePath,
        name,
        topLevelDeclaration,
        isExported: topLevelDeclaration.isExported(),
        textSpanStart: topLevelDeclaration.getStart(),
        textSpanEnd: topLevelDeclaration.getEnd(),
        startLineNumber: topLevelDeclaration.getStartLineNumber(),
        endLineNumber: topLevelDeclaration.getEndLineNumber(),
      });
    });
    return symbols;
  }
}
