/* eslint-disable no-console */
import dependencyAnalysis from './dependency-analysis';

function main(): void {
  const projectDirectory = process.argv[2];

  if (typeof projectDirectory !== 'string') {
    console.error('project must be a string!');
    return;
  }

  const [moduleGraph, directoryGraph] = dependencyAnalysis({
    projectDirectory,
    doesOutputGraph: true,
    doesCheckCyclicDependencies: true,
  });

  console.log(moduleGraph);
  console.log();
  console.log(directoryGraph);
  console.log();
}

main();
