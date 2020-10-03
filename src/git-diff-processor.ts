import { parsePatch } from 'diff';

type ChangedFile = {
  readonly sourceFilePath: string;
  readonly changedLineIntervals: readonly (readonly [number, number])[];
};

const processGitDiffString = (diffString: string): readonly ChangedFile[] => {
  const parsedDiffs = parsePatch(diffString);
  const files: ChangedFile[] = [];

  parsedDiffs.forEach((parsedDiff) => {
    let sourceFilePath = parsedDiff.newFileName;
    if (sourceFilePath == null) return;
    if (sourceFilePath.startsWith('b/')) sourceFilePath = sourceFilePath.substring(2);

    files.push({
      sourceFilePath,
      changedLineIntervals: parsedDiff.hunks.map((hunk) => [
        hunk.newStart,
        hunk.newStart + hunk.newLines - 1,
      ]),
    });
  });

  return files;
};

export default processGitDiffString;
