/* eslint-disable no-console */
import performDependencyAnalysisForProject from './dependency-analysis';

function main(): void {
  const projectDirectory = process.argv[2];

  if (typeof projectDirectory !== 'string') {
    console.error('project must be a string!');
    return;
  }

  const moduleGraph = performDependencyAnalysisForProject(projectDirectory);
  console.log(moduleGraph);
}

main();
