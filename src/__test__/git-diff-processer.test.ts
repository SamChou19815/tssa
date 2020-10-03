import processGitDiffString from '../git-diff-processor';

const SAMPLE_DIFF = `diff --git a/src/fine-grained-dependency-chain-builder.ts b/src/fine-grained-dependency-chain-builder.ts
index 070028f..74a3096 100644
--- a/src/fine-grained-dependency-chain-builder.ts
+++ b/src/fine-grained-dependency-chain-builder.ts
@@ -37,6 +37,27 @@ const getDirectReferencingSymbols = (
   return referencingSymbols;
 };

+const getSymbolTransitiveReferencingChain = (
+  projects: TypeScriptProjects,
+  symbols: readonly SourceFileDefinedSymbol[]
+): readonly SourceFileDefinedSymbol[] => {
+  // Stored format: filePath:::name
+  const symbolHashSet = new Set<string>();
+  const chain: SourceFileDefinedSymbol[] = [];
+
+  const hash = (symbol: SourceFileDefinedSymbol) => \`\${symbol.sourceFilePath}:::\${symbol.name}\`;
+  const visit = (symbol: SourceFileDefinedSymbol) => {
+    if (symbolHashSet.has(hash(symbol))) return;
+    chain.push(symbol);
+    symbolHashSet.add(hash(symbol));
+    getDirectReferencingSymbols(projects, symbol).forEach(visit);
+  };
+
+  symbols.forEach(visit);
+
+  return chain;
+};
+
 /**
  * Build a fine-grained function-level dependency chain based on a change's line number intervals.
  *
@@ -61,10 +82,8 @@ const buildFineGrainedDependencyChain = (
         )
       )
     );
-  // TODO: implementing topologically sort here
-  affectedSymbols.forEach((it) => getDirectReferencingSymbols(projects, it));

-  return affectedSymbols;
+  return getSymbolTransitiveReferencingChain(projects, affectedSymbols);
 };

 export default buildFineGrainedDependencyChain;
diff --git a/src/typescript-projects.ts b/src/typescript-projects.ts
index 7f662be..fd37d58 100644
--- a/src/typescript-projects.ts
+++ b/src/typescript-projects.ts
@@ -46,7 +46,6 @@ export default class TypeScriptProjects {
       projectMappings.set(projectDirectory, project);

       project.getSourceFiles().forEach((sourceFile) => {
-        console.log(projectDirectory, sourceFile.getFilePath());
         sourceFileMapping.set(
           join(projectDirectory, relative(projectDirectory, sourceFile.getFilePath())),
           sourceFile
`;

it('processGitDiffString works.', () => {
  expect(processGitDiffString(SAMPLE_DIFF)).toEqual([
    {
      sourceFilePath: 'src/fine-grained-dependency-chain-builder.ts',
      changedLineIntervals: [
        [37, 63],
        [82, 89],
      ],
    },
    {
      sourceFilePath: 'src/typescript-projects.ts',
      changedLineIntervals: [[46, 51]],
    },
  ]);
});
