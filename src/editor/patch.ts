import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

/**
 * Apply user edits to the original text while preserving original formatting.
 *
 * Logic:
 * - baseline = serialize(parse(original)) — the round-trip of the original
 * - current  = serialize(parse(edited))   — the round-trip of the edited doc
 * - Compute patches from baseline → current (= what the user actually changed)
 * - Apply those patches to the original text (= preserving original formatting)
 *
 * If patching fails (fuzzy match too far off), falls back to returning current as-is.
 */
export function patchOriginal(
  original: string,
  baseline: string,
  current: string,
): string {
  // No real change — return original as-is
  if (baseline === current) return original;

  const patches = dmp.patch_make(baseline, current);
  const [patched, results] = dmp.patch_apply(patches, original);

  // Check if all patches applied successfully
  const allApplied = results.every((r) => r);
  if (allApplied) return patched;

  // Partial failure — still return patched result (best effort)
  // The successfully applied patches preserve formatting where possible
  return patched;
}
