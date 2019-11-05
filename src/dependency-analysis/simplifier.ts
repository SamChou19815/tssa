import * as path from 'path';
import { Graph } from './types';

/**
 * A lot of modules's base path is unique. In those cases, it's better to only have the base path
 * (without extension), so that the generated graph can look cleaner.
 *
 * @param graph the raw, unsimplified graph.
 * @returns simplified graph, where full paths are replaced by base path without extension if it
 * does not introduce ambiguity.
 */
export default (graph: Graph): Graph => {
  const getBasePathWithoutExtension = (fullPath: string): string => {
    const basePath = path.basename(fullPath);
    const parts = basePath.split('.');
    if (parts.length !== 2) {
      return basePath;
    }
    return parts[0];
  };
  const basePathCount = new Map<string, number>();
  const countBasePath = (fullPath: string): void => {
    const basePath = getBasePathWithoutExtension(fullPath);
    basePathCount.set(basePath, (basePathCount.get(basePath) ?? 0) + 1);
  };
  Object.keys(graph).forEach(countBasePath);
  const simplifyPath = (fullPath: string): string => {
    const basePath = getBasePathWithoutExtension(fullPath);
    return (basePathCount.get(basePath) ?? 0) > 1 ? fullPath : basePath;
  };
  const simplifiedGraph: Graph = {};
  Object.entries(graph).forEach(([key, imports]) => {
    simplifiedGraph[simplifyPath(key)] = imports.map(simplifyPath);
  });
  return simplifiedGraph;
};
