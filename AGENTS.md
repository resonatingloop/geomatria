# geogematria - AGENTS.md

## purpose

geogematria is a local projection layer for glossololary. glossololary is the
source of truth for phrase normalization, cipher calculation, saved phrase/value
data, and database ownership. geogematria projects that data into geographic
layers and serves local atlas views.

## required reading and authority

1. [readme](README.md): operational front door and documentation authority map.
2. [status](STATUS.md): last verified checkpoint, known gaps, and next useful action.
3. [development](docs/DEVELOPMENT.md): setup, configuration, validation, and recovery
   when the task touches a runnable path.
4. [atlas guide](atlas/README.md): dataset and interaction semantics for atlas work.

this file owns agent authorization and the repository boundaries below. current
instructions from the user govern the requested slice. inspect git status before
editing, preserve unrelated work, and surface conflicts between intended
contracts and observed implementation.

local `specs/` and `notes/` are git-ignored historical/planning material. do not
assume that a spec is active or accepted because a file exists. read only the
material relevant to the task; shared continuity must work without ignored files.
for new specs, use `draft -> accepted -> retired`; only the user or designated
owner can accept a spec. a substantial or ambiguous new feature needs an
explicitly accepted spec before implementation. a direct bounded change request
authorizes that change.

## collaboration modes

Use the user's requested mode literally.

### discussion mode

When the user asks to discuss, explore, review, or clarify:

- do not edit files.
- read only the files needed to answer.
- report what is clear, unclear, risky, or worth deciding.
- separate confirmed facts from assumptions.

### plan mode

When the user asks for a plan:

- do not edit files.
- inspect enough local context to make the plan concrete.
- produce ordered implementation steps and validation steps.
- call out repo-boundary or dependency questions before implementation.

### implementation mode

When the user explicitly approves implementation:

- keep the diff scoped to the approved slice.
- preserve static atlas behavior unless the approved task says otherwise.
- verify with the smallest meaningful test/build commands.
- summarize changed files, validation, and remaining risks.

## boundaries

- Do not read or modify glossololary internals unless the user explicitly allows
  targeted reads or edits for the current task.
- geogematria must consume glossololary data through public interfaces only.
- Do not open raw SQLite connections to glossololary databases from production
  geogematria code.
- Do not call private `GlossololaryDB` methods such as `_connection()`.
- use the public `read_only=True` database option in both adapters; projection
  work must not create, migrate, or write the source database.
- If a needed public glossololary method does not exist, add or propose that
  method in glossololary first rather than bypassing its interface.

## project shape

implemented structure and local history:

```text
backend/       local FastAPI server for live atlas layers
atlas/         React/Vite atlas frontend
geogematria/   projection methods, GeoJSON builders, layer generation
tests/         Python tests for geogematria library/backend behavior
docs/          operational procedures
specs/         local ignored specs; approval status must be established
notes/         local ignored design and migration history
```

The current repo contains the migrated static atlas plus the v1c local live
provider. Preserve static atlas behavior unless a task explicitly changes it.
Backend/live work must continue to consume glossololary through public
interfaces only.

## validation and completion

use the smallest meaningful proof for the changed surface. commands from the
repository root:

```bash
uv run --locked --extra backend --extra test python -m unittest discover -s tests
python3 /home/resonatingloop/.codex/skills/manage-project-docs/scripts/check_docset.py .
git diff --check
```

frontend checks, from `atlas/`:

```bash
npm test
npm run build
npm run build:public
```

the documentation checker is locally installed agent tooling, not a repository
dependency. check [status](STATUS.md) for inherited failures before interpreting
results. backend tests use injected sources; builds and unit tests do not prove
rendered interaction or real glossololary connectivity.

before finishing, reconcile affected operational docs and update the checkpoint
when evidence changes. report changed files, proof run, failures or unverified
paths, and the next authorized transition. preserve static atlas behavior and
existing contracts unless the approved slice explicitly changes them. do not
rewrite historical approval or alter a contract to make a check pass.
