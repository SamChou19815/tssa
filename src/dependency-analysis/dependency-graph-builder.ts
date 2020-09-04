import * as path from 'path';
import { Project, SourceFile } from 'ts-morph';
import { Graph } from './types';

const getImports = (projectDirectory: string, sourceFile: SourceFile): readonly string[] => {
  const imports: string[] = [];
  sourceFile.getImportDeclarations().forEach((oneImport) => {
    const importedSourceFile = oneImport.getModuleSpecifierSourceFile();
    if (importedSourceFile === undefined) {
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

const buildDependencyGraph = (projectDirectory: string): Graph => {
  const project = new Project({
    tsConfigFilePath: `${projectDirectory}/tsconfig.json`,
  });
  const graph: Graph = {};
  project.getSourceFiles().forEach((sourceFile) => {
    const sourceFilePath = path.relative(projectDirectory, sourceFile.getFilePath());
    const imports = getImports(projectDirectory, sourceFile);
    graph[sourceFilePath] = imports;
  });
  return graph;
};

export default buildDependencyGraph;
