#!/usr/bin/env node
// Stages atlas datasets into the served public/data/ dir.
//
//   --target=full    copy every dataset + the full manifest (dev / default build)
//   --target=public  copy ONLY datasets in datasets/curation.public.json and
//                    write a filtered manifest (curated GitHub Pages build)
//
// The full dataset lives in atlas/datasets/ (source of truth, git-tracked).
// public/data/ is a generated, gitignored artifact. This is what enforces the
// curation gate: un-allowlisted GeoJSONs are never copied into the build output,
// so Vite cannot ship them even by direct URL.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ATLAS_DIR = join(SCRIPT_DIR, "..");
const SRC_DIR = join(ATLAS_DIR, "datasets");
const OUT_DIR = join(ATLAS_DIR, "public", "data");
const MASTER_MANIFEST = join(SRC_DIR, "manifest.json");
const CURATION_FILE = join(SRC_DIR, "curation.public.json");

function parseTarget(argv) {
  const arg = argv.find((value) => value.startsWith("--target="));
  const target = arg ? arg.slice("--target=".length) : "full";
  if (target !== "full" && target !== "public") {
    throw new Error(`Unknown --target: ${target} (expected "full" or "public")`);
  }
  return target;
}

// Manifest entries store served paths like "/data/foo.geojson"; the source file
// in datasets/ is just "foo.geojson".
function datasetFilename(entryFile) {
  return entryFile.replace(/^\/?data\//, "");
}

const target = parseTarget(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(MASTER_MANIFEST, "utf8"));

let selected = manifest;
if (target === "public") {
  if (!existsSync(CURATION_FILE)) {
    throw new Error(`Public build requires an allowlist at ${CURATION_FILE}`);
  }
  const allow = new Set(JSON.parse(readFileSync(CURATION_FILE, "utf8")));
  selected = manifest.filter((entry) => allow.has(datasetFilename(entry.file)));
  if (selected.length === 0) {
    throw new Error(
      "curation.public.json matched no manifest entries — nothing to publish."
    );
  }
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const entry of selected) {
  const name = datasetFilename(entry.file);
  const from = join(SRC_DIR, name);
  if (!existsSync(from)) {
    throw new Error(`Manifest references a missing dataset file: ${name}`);
  }
  copyFileSync(from, join(OUT_DIR, name));
}

writeFileSync(
  join(OUT_DIR, "manifest.json"),
  `${JSON.stringify(selected, null, 2)}\n`
);

console.log(
  `[build-data] target=${target} datasets=${selected.length}/${manifest.length} -> public/data/`
);
