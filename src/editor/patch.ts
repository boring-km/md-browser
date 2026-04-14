import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

/**
 * Apply user edits to the original text while preserving original formatting.
 *
 * Strategy:
 * 1. Align original and baseline line-by-line (handling round-trip formatting differences)
 * 2. Diff baseline vs current to find user edits
 * 3. Replay the diff against the aligned original, keeping original lines where baseline is unchanged
 */
export function patchOriginal(
  original: string,
  baseline: string,
  current: string,
): string {
  if (baseline === current) return original;

  const origLines = original.split("\n");
  const baseLines = baseline.split("\n");
  const currLines = current.split("\n");

  // Step 1: Align original lines with baseline lines
  // Each aligned pair: [origLine | null, baseLine | null]
  const aligned = alignLines(origLines, baseLines);

  // Step 2: Find which baseline lines changed in current
  const baseChanged = new Map<number, string>(); // baseIdx → new content
  const baseDeleted = new Set<number>(); // baseIdx deleted
  const insertions: Array<{ afterBaseIdx: number; lines: string[] }> = [];

  const editDiffs = computeLineDiff(baseLines, currLines);
  let baseIdx = 0;
  let currIdx = 0;

  for (const [op, count] of editDiffs) {
    if (op === 0) {
      baseIdx += count;
      currIdx += count;
    } else if (op === -1) {
      for (let i = 0; i < count; i++) {
        baseDeleted.add(baseIdx + i);
      }
      baseIdx += count;
    } else if (op === 1) {
      const newLines: string[] = [];
      for (let i = 0; i < count; i++) {
        newLines.push(currLines[currIdx + i]);
      }
      insertions.push({ afterBaseIdx: baseIdx - 1, lines: newLines });
      currIdx += count;
    }
  }

  // Also detect modified lines (delete + insert at same position)
  // Merge adjacent delete/insert pairs into modifications
  // (This is already handled by the edit replay below)

  // Step 3: Replay against aligned original
  const result: string[] = [];
  let alignIdx = 0;
  baseIdx = 0;

  // Process insertions before first baseline line
  for (const ins of insertions) {
    if (ins.afterBaseIdx === -1) {
      result.push(...ins.lines);
    }
  }

  for (const [origLine, baseLine, bIdx] of aligned) {
    if (baseLine !== null && bIdx !== null) {
      // Check insertions after this baseline line
      // First, handle this line itself
      if (baseDeleted.has(bIdx)) {
        // This baseline line was deleted by user — skip the original line too
      } else {
        // Baseline line unchanged — keep original formatting
        if (origLine !== null) {
          result.push(origLine);
        } else {
          result.push(baseLine);
        }
      }

      // Add any insertions after this baseline index
      for (const ins of insertions) {
        if (ins.afterBaseIdx === bIdx) {
          result.push(...ins.lines);
        }
      }
    } else if (origLine !== null) {
      // Original-only line (exists in original but not baseline — formatting artifact)
      // Keep it unless it's in a deleted region
      result.push(origLine);
    }
  }

  return result.join("\n");
}

/**
 * Align original and baseline lines using LCS (longest common subsequence).
 * Returns tuples of [origLine | null, baseLine | null, baselineIndex | null]
 */
function alignLines(
  origLines: readonly string[],
  baseLines: readonly string[],
): Array<[string | null, string | null, number | null]> {
  // Find LCS using greedy matching with normalization for fuzzy line matching
  const result: Array<[string | null, string | null, number | null]> = [];

  let oIdx = 0;
  let bIdx = 0;

  while (oIdx < origLines.length && bIdx < baseLines.length) {
    if (origLines[oIdx] === baseLines[bIdx]) {
      // Exact match
      result.push([origLines[oIdx], baseLines[bIdx], bIdx]);
      oIdx++;
      bIdx++;
    } else if (normalizeLine(origLines[oIdx]) === normalizeLine(baseLines[bIdx])) {
      // Fuzzy match (same content, different formatting)
      result.push([origLines[oIdx], baseLines[bIdx], bIdx]);
      oIdx++;
      bIdx++;
    } else {
      // Look ahead to find a match
      const bLookAhead = findMatch(origLines[oIdx], baseLines, bIdx + 1, bIdx + 5);
      const oLookAhead = findMatch(baseLines[bIdx], origLines, oIdx + 1, oIdx + 5);

      if (bLookAhead !== -1 && (oLookAhead === -1 || bLookAhead - bIdx <= oLookAhead - oIdx)) {
        // Baseline has extra lines before the match
        while (bIdx < bLookAhead) {
          result.push([null, baseLines[bIdx], bIdx]);
          bIdx++;
        }
      } else if (oLookAhead !== -1) {
        // Original has extra lines before the match
        while (oIdx < oLookAhead) {
          result.push([origLines[oIdx], null, null]);
          oIdx++;
        }
      } else {
        // No match found — pair them as fuzzy
        result.push([origLines[oIdx], baseLines[bIdx], bIdx]);
        oIdx++;
        bIdx++;
      }
    }
  }

  // Remaining original lines
  while (oIdx < origLines.length) {
    result.push([origLines[oIdx], null, null]);
    oIdx++;
  }

  // Remaining baseline lines
  while (bIdx < baseLines.length) {
    result.push([null, baseLines[bIdx], bIdx]);
    bIdx++;
  }

  return result;
}

/** Normalize a line for fuzzy comparison (trim, collapse whitespace, normalize table separators) */
function normalizeLine(line: string): string {
  return line
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[-:]+/g, (m) => "-".repeat(m.length));
}

/** Find a matching line in lines[start..end) using exact or normalized match */
function findMatch(
  target: string,
  lines: readonly string[],
  start: number,
  end: number,
): number {
  const normTarget = normalizeLine(target);
  const limit = Math.min(end, lines.length);
  for (let i = start; i < limit; i++) {
    if (lines[i] === target || normalizeLine(lines[i]) === normTarget) {
      return i;
    }
  }
  return -1;
}

/** Compute line-level diff returning [op, count] tuples. op: 0=keep, -1=delete, 1=insert */
function computeLineDiff(
  a: readonly string[],
  b: readonly string[],
): Array<[number, number]> {
  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(
    a.join("\n"),
    b.join("\n"),
  );
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_charsToLines_(diffs, lineArray);

  const result: Array<[number, number]> = [];
  for (const [op, text] of diffs) {
    const lines = text.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    if (lines.length > 0) {
      result.push([op, lines.length]);
    }
  }
  return result;
}
