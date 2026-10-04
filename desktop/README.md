# Geogematria desktop engineering gate

Role: operational guide for the accepted initial renderer/owned-sidecar spike.
This is **not the Relations workspace**. The ordered gate remains **open**:
flat WebGL2 and packaged ownership/readiness/close have real native proof, but
the full rendered interaction matrix and safe desktop use are not accepted.
Initial input denial was later explicitly reauthorized; the resumed session
coincided with loss of desktop visibility. Native automation and app launches
are **paused**, and the cause is unconfirmed. Commands here record historical
build/proof, not authorization to resume. The owner explicitly authorized only
Python relation logic, in-memory captures, and injected-source tests ahead of
the open gate on 2026-10-04. Native integration and study persistence remain
deferred; see the accepted spec's gate-order amendment and repository status.

## Scope and boundaries

- Tauri v2 Linux GTK/WebKit window, built React/Vite assets, pinned existing
  MapLibre 5.24.0. Reuses `map2d.js`, `mapPresentation.js`, `globeRelief.js`, the
  atlas theme CSS, data model, and `ProjectedLocusReadout.jsx` without editing them.
- 24 numeric-only snapshots: eight ciphers, three existing projections,
  integers 1–2000. Separate staging and build under `desktop/frontend/`.
  Sanitizer plus positive property allowlist; no phrase/occupancy snapshots.
- Python is the numerical authority. A frozen onedir sidecar imports the public
  Glossololary DB/cipher interfaces without opening a DB and reads all four
  packaged offline gazetteers. No source catalogue, raw SQLite connection,
  relation computation, study files, source configuration or exports of studies.
- Gate protocol v1 advertises **only `probe`**: fixed Python AQ 177 hash address.
  Readiness is distinct from source connectivity, which is deliberately absent.
- Rust owns the child, dedicated process group, readiness timeout, generation
  and request binding, retry cleanup, monitoring, and native close cleanup.
  Linux `PDEATHSIG` is bound to a persistent spawning/monitor thread: a short-lived
  request thread cannot accidentally kill the child when its request returns.
- Renderer receives narrow Tauri status/retry/probe/close/report commands. No
  shell/filesystem plugins or HTTP service, no port adoption, no launch secret.
  Sidecar environment is cleared rather than inheriting source paths/credentials.
- OSM tile requests are external; basemap is not fully offline. Gate day and
  night reuse the atlas palette/presentation with the OSM raster source; this
  spike does not exercise the existing OpenFreeMap vector night basemap.
- Renderer reports sample the actual MapLibre WebGL2 drawing buffer after a
  rendered frame. `nonzero_pixels` counts every sixteenth pixel, not every pixel.
  Reports do not substitute for native screenshots or the missing interaction
  matrix. Preserve-drawing-buffer is intentional gate instrumentation.

## Verified build environment

Linux x86_64 (Pop!_OS 24.04), Python 3.12.3 project venv, Node 26.7.0,
Rust/Cargo 1.99.0, GTK 3.24.41, WebKitGTK 2.52.6. Tauri CLI/crate 2.12.1.
Runtime requires Linux system GTK3/WebKitGTK4.1 libraries; they are not bundled.
Artifacts are debug-profile native builds with production Vite assets, not
size-optimized release binaries. No installation/launcher change was performed.

## Build, from the repository root

Use the existing root `.venv` with geogematria and the selected public
Glossololary package already installed. Build tooling is separate; the root
pyproject and uv lockfile are not changed. `sidecar/build.py` currently targets
the verified Python 3.12 environment explicitly.

```bash
uv venv desktop/build-env --python .venv/bin/python
uv pip install --python desktop/build-env/bin/python -r desktop/requirements-build.txt
npm ci --prefix desktop --cache "$TMPDIR/geogematria-desktop-npm"
.venv/bin/python desktop/sidecar/build.py
node desktop/build.mjs
export PATH="$HOME/.cargo/bin:$PATH"
(cd desktop && node_modules/.bin/tauri build --debug --features desktop --bundles deb)
.venv/bin/python desktop/package.py
```

The Tauri bundle contains the same onedir engine as a resource directory, not
an executable-only externalBin that would omit Python shared libraries/data.
Linux resource paths use Tauri's **productName** (`Geogematria Desktop Gate`),
not the Cargo crate/binary name. The relocatable tarball mirrors `bin/` and
`lib/<productName>/engine/`; Tauri resolves the latter beside the relocated bin.

Artifacts:

- `desktop/src-tauri/target/debug/geogematria-desktop-gate`
- `desktop/src-tauri/target/debug/bundle/deb/Geogematria Desktop Gate_0.1.0_amd64.deb`
- `desktop/artifacts/geogematria-desktop-gate-linux-x86_64.tar.gz`
- `desktop/artifacts/geogematria-desktop-gate/bin/geogematria-desktop-gate`
- `desktop/artifacts/package-inventory.json` (33 files with sizes/SHA-256)

Do not run the unpackaged bare binary from an arbitrary directory: its resource
layout must be present. The tarball was relocated outside the checkout for proof.
The deb was built and its contents inspected, but not installed/exercised as an
installed system package. Do not install it or change a launcher without approval.

## Launch and native proof

```bash
mkdir -p "$TMPDIR/geogematria-gate-relocated"
tar -xzf desktop/artifacts/geogematria-desktop-gate-linux-x86_64.tar.gz \
  -C "$TMPDIR/geogematria-gate-relocated"
cd "$TMPDIR/geogematria-gate-relocated"
env -u PYTHONPATH -u VIRTUAL_ENV -u GEOGEMATRIA_GLOSSOLOLARY_DB \
  PATH=/usr/bin:/bin GDK_BACKEND=x11 \
  XDG_DATA_HOME="$TMPDIR/geogematria-gate-relocated/xdg-data" \
  "$TMPDIR/geogematria-gate-relocated/geogematria-desktop-gate/bin/geogematria-desktop-gate"
```

This was executed on actual `DISPLAY=:1` (Xwayland user display), not Xvfb,
Chromium, Firefox, or Vite. `xwininfo` reported `Map State: IsViewable`,
1180×736. A native app-scoped screenshot shows the world map and the ready owned
Python engine. Its actual WebGL2 buffer reported 786×438, 754 sampled colors,
21,517 nonzero sampled pixels, 2,000 numeric features, no lost context.
Port checks found no listeners on 8000, 5173 or 5175.

Native close testing is a separate, authorized cleanup action, not a workaround
for the denied Retry click. `native_close.py` checks both process executable and
`_NET_WM_PID` before sending WM_DELETE_WINDOW; it never focuses another window.

```bash
# For an existing gate window, use its actual discovered identifiers:
.venv/bin/python desktop/native_close.py APP_PID WINDOW_ID
# Bounded real mapped startup/close probe, no focus/input clicks:
.venv/bin/python desktop/startup_close_probe.py \
  "$TMPDIR/geogematria-gate-relocated/geogematria-desktop-gate/bin/geogematria-desktop-gate" \
  desktop/evidence
```

The latest rebuilt artifact success-close reaped engine 664437 (app 664379). The startup probe observed phase `starting`,
a mapped native window and child 655337, then closed in 0.83 seconds with no
owned orphans. The 30-second injected initialization delay also exercised the
real 12-second readiness timeout, visible failed shell and native failure-close;
the child was already reaped. This delay only slows real initialization; it does
not fabricate a provider, readiness, imports or projection data.

## Tests and evidence

```bash
.venv/bin/python -m unittest discover -s tests
DESKTOP_GATE_ENGINE="$PWD/desktop/artifacts/geogematria-desktop-gate/lib/Geogematria Desktop Gate/engine/geogematria-engine" \
  .venv/bin/python -m unittest discover -s tests -p test_desktop_gate.py -v
~/.cargo/bin/cargo test --target-dir "$TMPDIR/geogematria-lifecycle-tests" \
  --manifest-path desktop/src-tauri/Cargo.toml --lib --no-default-features
npm test --prefix atlas
node --test desktop/frontend/gate-model.test.mjs
.venv/bin/python desktop/audit_gate.py
git diff --check
```

Results: **57 Python tests**, **4 frozen/staging gate tests**, **7 Rust lifecycle
and bridge tests**, **79 unchanged atlas frontend tests**, and **2 desktop
selection-model tests**, all passing. The selection-model RED tracer exposed
string-valued atlas readout details being compared with numeric selections; the
minimal fix retains siblings at snapped loci and binds the selected clique. Rust
fixtures explicitly synthesize protocol messages for lifecycle testing; those
are not provider integration proof. Frozen engine tests exercise real public
imports, gazetteer reads and Python projection through the packaged interpreter.
Lifecycle/bridge features followed observed RED → GREEN tracers, including the
short-lived spawning-thread regression. Numeric staging tests independently
check all 48,000 domain coordinates against their existing source snapshots.

Evidence under `desktop/evidence/` (ignored generated material):

- `native-flat-ready.png`, `native-failed-shell.png`: app-scoped native captures.
- `native-mapped-window.txt`, `native-startup-mapped.txt`: X11 mapped-window proof.
- `native-corrected.log`: actual ready engine and flat WebGL2 renderer reports.
- `native-timeout.log`: real starting → timeout-failed state and native close.
- `native-startup-close.log`: mapped starting shell → closed, before readiness.
- `native-close-ready.json`, `native-close-timeout.json`,
  `native-close-starting.json`: native close and no-owned-orphan readbacks.
- `no-manual-services.txt`: empty listener check for the browser/backend ports.
- `python-tests.log`, `frozen-tests.log`, `rust-tests.log`, `frontend-tests.log`,
  `desktop-model-tests.log`: actual test outputs.
- `gate-summary.json`: observed proof aggregation and current artifact SHA-256.
- `docset-check.log`: inherited ignored historical specs yield five missing-status
  errors; existing STATUS heading conventions yield thirteen warnings. Governing
  docs are parent-owned and were not rewritten to make this checker pass.

## Open gate / blockers

The initial desktop input tool returned **“User denied ... click ... Do NOT
retry”** for Retry engine; no input workaround was used. The owner subsequently
reauthorized interaction. The resumed session recorded a new ready engine
generation after Retry, but was stopped after loss of desktop visibility.
The readout layout also exceeded the window; the in-flight layout edit/test
was undone at the owner's stop request. The visual failure's mechanism is
unconfirmed; screenshots alone do not prove screen-capture feedback.

The owner reported recovery after the session-owned app, engine, and cua-driver
helper were stopped. No COSMIC desktop process was intentionally restarted or
terminated. Require renewed owner authorization and an agreed isolation/cleanup
protocol before relaunching native apps or automation; do not use broad pkill
or terminate unrelated processes.

The whole initial gate is **not passed**. The owner explicitly deferred native
verification to allow Python-only relation logic, complete in-memory captures,
and injected-source tests. This does not authorize the native Relations
workspace, study persistence, or real owner-source tests. The earlier
`audit_gate.py`/`gate-summary.json` aggregate the original flat-only run and still
contain the historical input-denial blocker; they are not current acceptance
of the resumed session or a diagnosis of the visual failure. Compilation and
CPU tests cannot replace the missing native acceptance.

Corrected engineering issues: default icon missing; invalid bundler category;
relocatable Linux resources initially used the crate name instead of productName;
PDEATHSIG needed a persistent spawning thread. Remaining diagnostics: inherited
Vite chunk-size warning, Starlette/httpx deprecation in the full Python suite;
WebKit emitted internal failed-load messages while one very-early close was
shutting down. No evidence of source DB access or packaged phrase snapshots.

Parent-owned repository guides/checkpoints were deliberately not edited.
Existing atlas/full/public output directories, root dependencies, backend/domain
code, separate Halton work, commits, pushes and launchers were not changed.
