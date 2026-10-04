import test from "node:test";
import assert from "node:assert/strict";
import { selectedReading } from "./gate-model.js";

const feature=(value,coordinates=[1,2])=>({type:"Feature",geometry:{type:"Point",coordinates},
  properties:{mode:"value_domain",cipher:"AQ",value,projection_method:"nearest_10000_towns_hash_v1"}});
const data={type:"FeatureCollection",metadata:{occupancy_public:false},features:[feature(43),feature(913),feature(177,[3,4])]};
test("numeric selection binds string-valued atlas details without dropping siblings",()=>{
  const reading=selectedReading(data,43);
  assert.ok(reading,"numeric atlas details must resolve the selected reading");
  assert.equal(reading.locus.cliques.length,2);
  assert.deepEqual(reading.locus.cliques.map(c=>c.details.value),["43","913"]);
  assert.equal(reading.locus.cliques.find(c=>c.featureKey===reading.selectedKey).details.value,"43");
});
test("incomplete or invalid selections never expose an old readout",()=>{
  for(const value of [null,0,2001,43.5])assert.equal(selectedReading(data,value),null);
  assert.equal(selectedReading(null,43),null);
  assert.equal(selectedReading(data,178),null);
});
