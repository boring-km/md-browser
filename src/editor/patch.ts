/**
 * Apply user edits to the original text while preserving original formatting.
 *
 * Strategy: Find changed regions between baseline and current (= user edits),
 * then locate those regions in the original using surrounding context lines,
 * and apply the changes there.
 */
export function patchOriginal(
  original: string,
  baseline: string,
  current: string,
): string {
  if (baseline === current) return original;

  const baseLines = baseline.split("\n");
  const currLines = current.split("\n");

  // Find changed hunks between baseline and current
  const hunks = findHunks(baseLines, currLines);

  if (hunks.length === 0) return original;

  // Apply each hunk to the original text
  let origLines = original.split("\n");

  // Process hunks in reverse order so indices don't shift
  for (let h = hunks.length - 1; h >= 0; h--) {
    const hunk = hunks[h];
    const origRange = findHunkInOriginal(
      origLines,
      baseLines,
      hunk.baseStart,
      hunk.baseEnd,
    );

    if (origRange !== null) {
      // Replace the matched range in original with the new lines
      const newLines = currLines.slice(hunk.currStart, hunk.currEnd);
      origLines = [
        ...origLines.slice(0, origRange.start),
        ...newLines,
        ...origLines.slice(origRange.end),
      ];
    }
  }

  return origLines.join("\n");
}

interface Hunk {
  readonly baseStart: number; // first changed line in baseline
  readonly baseEnd: number; // exclusive end in baseline
  readonly currStart: number; // first changed line in current
  readonly currEnd: number; // exclusive end in current
}

/**
 * Find contiguous changed regions between two line arrays.
 * Returns hunks with context: the actual changed lines (not the surrounding equal lines).
 */
function findHunks(
  baseLines: readonly string[],
  currLines: readonly string[],
): Hunk[] {
  const hunks: Hunk[] = [];
  let bIdx = 0;
  let cIdx = 0;

  while (bIdx < baseLines.length && cIdx < currLines.length) {
    if (baseLines[bIdx] === currLines[cIdx]) {
      bIdx++;
      cIdx++;
      continue;
    }

    // Found a difference — find the extent
    const hunkBaseStart = bIdx;
    const hunkCurrStart = cIdx;

    // Look for the next sync point (matching lines)
    const sync = findSync(baseLines, currLines, bIdx, cIdx);
    if (sync !== null) {
      hunks.push({
        baseStart: hunkBaseStart,
        baseEnd: sync.bIdx,
        currStart: hunkCurrStart,
        currEnd: sync.cIdx,
      });
      bIdx = sync.bIdx;
      cIdx = sync.cIdx;
    } else {
      // No more sync — rest is all changed
      hunks.push({
        baseStart: hunkBaseStart,
        baseEnd: baseLines.length,
        currStart: hunkCurrStart,
        currEnd: currLines.length,
      });
      break;
    }
  }

  // Handle trailing additions/deletions
  if (bIdx < baseLines.length || cIdx < currLines.length) {
    hunks.push({
      baseStart: bIdx,
      baseEnd: baseLines.length,
      currStart: cIdx,
      currEnd: currLines.length,
    });
  }

  return hunks;
}

/**
 * Find the next point where baseline and current lines re-sync.
 * Looks for a sequence of 2+ matching lines to confirm sync.
 */
function findSync(
  baseLines: readonly string[],
  currLines: readonly string[],
  bStart: number,
  cStart: number,
): { bIdx: number; cIdx: number } | null {
  const maxLook = 100;
  const confirmLen = 2; // require 2 consecutive matching lines

  for (let offset = 1; offset < maxLook; offset++) {
    // Try advancing baseline
    for (
      let bOff = 0;
      bOff <= offset && bStart + bOff < baseLines.length;
      bOff++
    ) {
      const cOff = offset - bOff;
      if (cStart + cOff >= currLines.length) continue;

      let match = true;
      for (let k = 0; k < confirmLen; k++) {
        if (
          bStart + bOff + k >= baseLines.length ||
          cStart + cOff + k >= currLines.length ||
          baseLines[bStart + bOff + k] !== currLines[cStart + cOff + k]
        ) {
          match = false;
          break;
        }
      }
      if (match) {
        return { bIdx: bStart + bOff, cIdx: cStart + cOff };
      }
    }
  }

  return null;
}

/**
 * Find where a baseline hunk maps to in the original text.
 * Uses surrounding context lines (before and after the hunk) to locate the position.
 */
function findHunkInOriginal(
  origLines: readonly string[],
  baseLines: readonly string[],
  baseStart: number,
  baseEnd: number,
): { start: number; end: number } | null {
  // Get context lines before and after the hunk
  const contextSize = 3;
  const beforeContext: string[] = [];
  for (let i = Math.max(0, baseStart - contextSize); i < baseStart; i++) {
    beforeContext.push(normalizeLine(baseLines[i]));
  }
  const afterContext: string[] = [];
  for (
    let i = baseEnd;
    i < Math.min(baseLines.length, baseEnd + contextSize);
    i++
  ) {
    afterContext.push(normalizeLine(baseLines[i]));
  }

  // Also normalize the hunk lines for matching
  const hunkNorm: string[] = [];
  for (let i = baseStart; i < baseEnd; i++) {
    hunkNorm.push(normalizeLine(baseLines[i]));
  }

  // Search in original for matching context
  let bestStart = -1;
  let bestEnd = -1;
  let bestScore = -1;

  for (let oStart = 0; oStart < origLines.length; oStart++) {
    // Check if this position has matching before-context
    let score = 0;

    // Score before context
    for (let c = 0; c < beforeContext.length; c++) {
      const oIdx = oStart - beforeContext.length + c;
      if (oIdx >= 0 && normalizeLine(origLines[oIdx]) === beforeContext[c]) {
        score += 2;
      }
    }

    // Find the end: match hunk lines or skip formatting-different lines
    let oEnd = oStart;
    let hIdx = 0;
    while (oEnd < origLines.length && hIdx < hunkNorm.length) {
      if (normalizeLine(origLines[oEnd]) === hunkNorm[hIdx]) {
        oEnd++;
        hIdx++;
      } else {
        // Try skipping one original line (formatting-only difference)
        oEnd++;
      }
    }

    // Score after context
    for (let c = 0; c < afterContext.length; c++) {
      if (
        oEnd + c < origLines.length &&
        normalizeLine(origLines[oEnd + c]) === afterContext[c]
      ) {
        score += 2;
      }
    }

    // Must have matched all hunk lines
    if (hIdx === hunkNorm.length && score > bestScore) {
      bestScore = score;
      bestStart = oStart;
      bestEnd = oEnd;
    }
  }

  if (bestStart === -1) return null;
  return { start: bestStart, end: bestEnd };
}

/** Normalize a line for comparison: trim, collapse whitespace */
function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}
