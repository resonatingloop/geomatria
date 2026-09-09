import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// A small presentation-contract guard: the shared controls must precede long
// readouts, not be duplicated at the footer. Builds separately validate JSX;
// export behavior/privacy is covered by markdownExport.test.mjs.
for (const [filename, heading, content] of [
  ["ConstellationView.jsx", "constellation-heading", '<form className="constellation-form"'],
  ["ProjectedLocusReadout.jsx", "locus-card__header", '<dl className="detail-grid"'],
]) {
  test(`${filename} places one export control group after the heading and before content`, () => {
    const source = readFileSync(new URL(`../src/${filename}`, import.meta.url), "utf8");
    const actions = source.indexOf("<MarkdownActions ");
    assert(source.includes(heading));
    assert(source.includes(content));
    assert.equal(source.match(/<MarkdownActions /g)?.length, 1);
    assert(source.indexOf(heading) < actions);
    assert(actions < source.indexOf(content));
  });
}
