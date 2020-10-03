import { normalize } from 'path';

type TssaCommandLineArgumentsParsingResult = {
  readonly projects: readonly string[];
  readonly changedTSPaths: readonly string[];
  readonly changedCssPaths: readonly string[];
};

/**
 * The arguments are separated by `--`. Parts left of `--` are interpreted as paths to TS projects,
 * and parts right of `--` are intepreted as changed file paths. All paths supplied in the arguments
 * are relative to repository root.
 *
 * @param tssaCLIArguments
 */
const parseCommandLineArguments = (
  tssaCLIArguments: readonly string[]
): TssaCommandLineArgumentsParsingResult => {
  const projects: string[] = [];
  const changedTSPaths: string[] = [];
  const changedCssPaths: string[] = [];

  let processedAllProjectsPath = false;
  tssaCLIArguments.forEach((processArgument) => {
    if (processedAllProjectsPath) {
      const normalizedPath = normalize(processArgument);
      if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.scss')) {
        changedCssPaths.push(normalizedPath);
      } else if (
        normalizedPath.endsWith('.ts') ||
        normalizedPath.endsWith('.tsx') ||
        normalizedPath.endsWith('.js') ||
        normalizedPath.endsWith('.cjs') ||
        normalizedPath.endsWith('.jsx')
      ) {
        changedTSPaths.push(normalizedPath);
      }
    } else if (processArgument === '--') {
      processedAllProjectsPath = true;
    } else {
      projects.push(normalize(processArgument));
    }
  });

  return { projects, changedTSPaths, changedCssPaths };
};

export default parseCommandLineArguments;
