import { relative } from 'path';

type ProjectAndChangedPaths = {
  readonly projectPath: string;
  readonly changedModulePaths: readonly string[];
};

/** Given a project path, partition changed files into with relativized module paths scoped with projects. */
const partitionProjectChangedModulePaths = (
  projectPathsRelativeToRepositoryRoot: readonly string[],
  allChangedModulePaths: readonly string[]
): readonly ProjectAndChangedPaths[] => {
  const map = new Map<string, string[]>();
  allChangedModulePaths.forEach((changedModulePath) => {
    const projectRootPath = projectPathsRelativeToRepositoryRoot.find((projectPath) =>
      changedModulePath.startsWith(projectPath)
    );
    if (projectRootPath != null) {
      const paths = map.get(projectRootPath) ?? [];
      paths.push(relative(projectRootPath, changedModulePath));
      map.set(projectRootPath, paths);
    }
  });
  return Array.from(map.entries()).map(([projectPath, changedModulePaths]) => ({
    projectPath,
    changedModulePaths,
  }));
};

export default partitionProjectChangedModulePaths;
