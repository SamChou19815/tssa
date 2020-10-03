import { relative } from 'path';

type ProjectAndChangedPaths = {
  readonly projectPath: string;
  readonly changedModulePaths: readonly string[];
};

/** Given a project path, partition changed files into with relativized module paths scoped with projects. */
const partitionProjectChangedModulePaths = <T>(
  projectPathsRelativeToRepositoryRoot: readonly string[],
  allChangedModules: readonly T[],
  getPath: (changed: T) => string
): readonly ProjectAndChangedPaths[] => {
  const map = new Map<string, string[]>();
  allChangedModules.forEach((changedModule) => {
    const changedModulePath = getPath(changedModule);
    const projectRootPath = projectPathsRelativeToRepositoryRoot.find(
      (projectPath) => changedModulePath.startsWith(projectPath) || projectPath === '.'
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
