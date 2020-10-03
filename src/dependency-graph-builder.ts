import type { Graph } from './dependency-graph-types';
import type TypeScriptProjects from './typescript-projects';

export const buildDependencyGraph = (
  projects: TypeScriptProjects,
  projectDirectories: readonly string[]
): Graph => {
  const graph: Graph = {};

  projectDirectories.forEach((projectDirectory) => {
    projects.getProjectSourceFiles(projectDirectory).forEach((sourceFilePath) => {
      graph[sourceFilePath] = projects.getImportedModulePaths(sourceFilePath);
    });
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
