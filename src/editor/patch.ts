// Patch system removed — serializer output is saved directly.
// Original formatting preservation is handled by:
// 1. serializerBaselines comparison to skip saves when no real edit occurred
// 2. Manual save (Cmd+S) only — no auto-save
//
// This file is kept as a placeholder for the import in app.ts.

/**
 * No-op: returns current serializer output as-is.
 * Original formatting is NOT preserved when user edits.
 */
export function patchOriginal(
  _original: string,
  _baseline: string,
  current: string,
): string {
  return current;
}
