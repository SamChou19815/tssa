import { realpathSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

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

  private readonly projectSourceFiles: ReadonlyMap<string, readonly string[]>;

  private readonly sourceFileMapping: ReadonlyMap<string, SourceFile>;

  constructor(projectDirectories: readonly string[]) {
    this.projectDirectories = new Set(projectDirectories);
    const projectMappings = new Map<string, Project>();
    const projectSourceFiles = new Map<string, readonly string[]>();
    const sourceFileMapping = new Map<string, SourceFile>();

    this.projectDirectories.forEach((projectDirectory) => {
      const project = new Project({
        tsConfigFilePath: join(projectDirectory, 'tsconfig.json'),
      });
      projectMappings.set(projectDirectory, project);

      const projectSourceFilesList = project.getSourceFiles().map((sourceFile) => {
        const relativeSourceFilePathAgainstRoot = relative(
          '.',
          realpathSync(sourceFile.getFilePath())
        );
        sourceFileMapping.set(relativeSourceFilePathAgainstRoot, sourceFile);
        return relativeSourceFilePathAgainstRoot;
      });
      projectSourceFiles.set(projectDirectory, projectSourceFilesList);
    });

    this.projectMappings = projectMappings;
    this.projectSourceFiles = projectSourceFiles;
    this.sourceFileMapping = sourceFileMapping;
  }

  getProjectSourceFiles(projectDirectory: string): readonly string[] {
    return this.projectSourceFiles.get(projectDirectory) ?? [];
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

  getImportedModulePaths(sourceFilePath: string): readonly string[] {
    const sourceFile = this.sourceFileMapping.get(sourceFilePath);
    if (sourceFile == null) return [];

    const imports: string[] = [];
    sourceFile.getImportDeclarations().forEach((oneImport) => {
      const importedSourceFile = oneImport.getModuleSpecifierSourceFile();

      if (importedSourceFile === undefined) {
        // Not useless, might be css module!
        let rawImportedModuleText = oneImport.getModuleSpecifier().getText(false);
        rawImportedModuleText = rawImportedModuleText.slice(1, rawImportedModuleText.length - 1);
        if (!rawImportedModuleText.endsWith('.css') && !rawImportedModuleText.endsWith('.scss')) {
          return;
        }
        const resolvedCssSourceFilePath = resolve(
          dirname(sourceFile.getFilePath()),
          rawImportedModuleText
        );
        imports.push(relative('.', resolvedCssSourceFilePath));
        return;
      }
      const filePath = realpathSync(importedSourceFile.getFilePath());
      if (filePath.includes('node_modules')) {
        return;
      }
      imports.push(relative('.', filePath));
    });
    return imports;
  }
}
