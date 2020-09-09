import * as path from 'path';

import { Project, SourceFile } from 'ts-morph';

import type { Graph } from './dependency-graph-types';

const getImports = (projectDirectory: string, sourceFile: SourceFile): readonly string[] => {
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
      const resolvedCssSourceFilePath = path.resolve(
        path.dirname(sourceFile.getFilePath()),
        rawImportedModuleText
      );
      imports.push(path.relative(projectDirectory, resolvedCssSourceFilePath));
      return;
    }
    const filePath = importedSourceFile.getFilePath();
    if (filePath.includes('node_modules')) {
      return;
    }
    imports.push(path.relative(projectDirectory, filePath));
  });
  return imports;
};

export const buildDependencyGraph = (projectDirectory: string): Graph => {
  const project = new Project({
    tsConfigFilePath: path.join(projectDirectory, 'tsconfig.json'),
  });
  const graph: Graph = {};
  project.getSourceFiles().forEach((sourceFile) => {
    const sourceFilePath = path.relative(projectDirectory, sourceFile.getFilePath());
    const imports = getImports(projectDirectory, sourceFile);
    graph[sourceFilePath] = imports;
  });
  return graph;
};

export const buildReverseDependencyGraphFromDependencyGraph = (graph: Graph): Graph => {
  const reverseDependependencyGraph: Graph = {};

  Object.entries(graph).forEach(([tsModule, importedTSModules]) =>
    importedTSModules.forEach((importedTSModule) => {
      reverseDependependencyGraph[importedTSModule] = [
        ...(reverseDependependencyGraph[importedTSModule] ?? []),
        tsModule,
      ];
    })
  );

  return reverseDependependencyGraph;
};
