import { build } from "../atlas/node_modules/vite/dist/node/index.js";
import { publicDataset } from "../atlas/scripts/build-data.mjs";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const desktop = dirname(fileURLToPath(import.meta.url));
const atlas = resolve(desktop, "../atlas");
const out = join(desktop, "frontend/public/data");
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const methods = ["value_hash_v1", "webmercator_hash_v1", "nearest_10000_towns_hash_v1"];
const entries = JSON.parse(readFileSync(join(atlas, "datasets/manifest.json"))).filter(e =>
  e.mode === "value_domain" && methods.includes(e.projection_method));
if (entries.length !== 24) throw Error("Expected 24 numeric-domain snapshots");
let count = 0;
for (const e of entries) {
  const name = e.file.replace(/^\/?data\//, "");
  const clean = publicDataset(JSON.parse(readFileSync(join(atlas, "datasets", name))));
  // Positive allowlist in addition to the existing sanitizer. No unknown
  // properties or stale phrase/occupancy metadata enters the gate artifact.
  const features = clean.features.map(f => ({ type: "Feature", geometry: f.geometry,
    properties: Object.fromEntries(Object.entries(f.properties).filter(([k]) =>
      ["mode", "cipher", "value", "projection", "projection_method", "base_coordinate", "snapped_place"].includes(k))) }));
  if (features.length !== 2000 || new Set(features.map(f => f.properties.value)).size !== 2000) throw Error("Incomplete domain");
  const data = { type: "FeatureCollection", metadata: { public_dataset: true, occupancy_public: false }, features };
  writeFileSync(join(out, name), JSON.stringify(data)); count += features.length;
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(entries.map(e => ({
  id:e.id, cipher:e.cipher, projection_method:e.projection_method, file:e.file,
  mode:"value_domain", public_dataset:true, occupancy_public:false }))));
console.log(`[desktop numeric stage] datasets=${entries.length} values=${count}`);
if (!process.argv.includes("--stage-only")) await build({ configFile:false, root:join(desktop,"frontend"),
  base:"./", resolve:{ alias:{
    react:join(atlas,"node_modules/react"), "react-dom":join(atlas,"node_modules/react-dom"),
    "maplibre-gl":join(atlas,"node_modules/maplibre-gl") } },
  build:{outDir:"dist", emptyOutDir:true}, esbuild:{jsx:"automatic"} });
