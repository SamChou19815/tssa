import { join, relative } from 'path';

import { Project, SourceFile } from 'ts-morph';

/**
 * TypeScriptProjects is more than a wrapper around `ts-morph`'s `Project` to only expose methods
 * useful for analysis.
 *
 * TODO: use this class to allow cross package dependency analysis.
 */
export default class TypeScriptProjects {
  readonly projectDirectories: ReadonlySet<string>;

  readonly projectMappings: ReadonlyMap<string, Project>;

  readonly sourceFileMapping: ReadonlyMap<string, SourceFile>;

  constructor(projectDirectories: readonly string[]) {
    this.projectDirectories = new Set(projectDirectories);
    const projectMappings = new Map<string, Project>();
    const sourceFileMapping = new Map<string, SourceFile>();

    projectDirectories.forEach((projectDirectory) => {
      const project = new Project({
        tsConfigFilePath: join(projectDirectory, 'tsconfig.json'),
      });
      projectMappings.set(projectDirectory, project);

      project
        .getSourceFiles()
        .forEach((sourceFile) =>
          sourceFileMapping.set(relative(projectDirectory, sourceFile.getFilePath()), sourceFile)
        );
    });

    this.projectMappings = projectMappings;
    this.sourceFileMapping = sourceFileMapping;
  }
}
