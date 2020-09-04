import * as graphviz from 'graphviz';
import { Graph } from './types';

export default (graph: Graph, filename: string): void => {
  const digraph = graphviz.digraph('G');
  Object.keys(graph).forEach((key) => digraph.addNode(key));
  Object.entries(graph).forEach(([key, imports]) => {
    imports.forEach((oneImport) => digraph.addEdge(key, oneImport));
  });
  digraph.output('png', filename);
};
