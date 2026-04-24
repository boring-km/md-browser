/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownParser } from "../parser";
import { markdownSerializer } from "../serializer";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".md"));
if (files.length === 0) {
  throw new Error(`no fixtures found in ${fixturesDir}`);
}

function cycle(md: string): string {
  const doc = markdownParser.parse(md);
  if (!doc) throw new Error("parse returned null");
  return markdownSerializer.serialize(doc);
}

describe("round-trip is a fixed point after first pass", () => {
  for (const file of files) {
    it(`${file}: serialize(parse(serialize(parse(input)))) === serialize(parse(input))`, () => {
      const input = readFileSync(join(fixturesDir, file), "utf8");
      const once = cycle(input);
      const twice = cycle(once);
      expect(twice).toBe(once);
    });
  }
});
