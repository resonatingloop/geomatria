# geogematria - AGENTS.md

## purpose

geogematria is a local projection layer for glossololary. glossololary is the
source of truth for phrase normalization, cipher calculation, saved phrase/value
data, and database ownership. geogematria projects that data into geographic
layers and serves local atlas views.

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
- If a needed public glossololary method does not exist, add or propose that
  method in glossololary first rather than bypassing its interface.

## project shape

Target structure:

```text
backend/       local FastAPI server for live atlas layers
atlas/         React/Vite atlas frontend
geogematria/   projection methods, GeoJSON builders, layer generation
tests/         Python tests for geogematria library/backend behavior
specs/         project specs and accepted slices
notes/         dated design and migration notes
```

The current repo migration preserves static atlas behavior first. Backend/live
provider work begins only after that baseline is verified.
