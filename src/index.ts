/* eslint-disable no-console */
import * as yargs from 'yargs';
import dependencyAnalysis from './dependency-analysis';

function main(): void {
  const { project: projectDirectory } = yargs
    .option('project', { demandOption: true, description: 'Path of TS project to analyze' })
    .help().argv;

  if (typeof projectDirectory !== 'string') {
    console.error('project must be a string!');
    return;
  }

  const [moduleGraph, directoryGraph] = dependencyAnalysis({
    projectDirectory,
    doesOutputGraph: true,
    doesCheckCyclicDependencies: true
  });

  console.log(moduleGraph);
  console.log();
  console.log(directoryGraph);
  console.log();
}

main();
