scope v1c as live local layer generation.

goal:
allow the atlas to request live geojson layers from glossololary so local atlas views update when the glossololary database changes, without regenerating static geojson files manually.

constraints:
- preserve static geojson loading.
- do not remove manifest/static dataset support.
- do not add public upload or guest lexicon generation.
- do not add a geojson database/catalog in this pass.
- do not bypass glossololary public db/interface contracts.
- start with cliquemap live generation before heatmap/live value-domain.

implementation:
1. add a backend endpoint for live cliquemap geojson:
   mode, cipher, projection_method as params.
2. backend reads glossololary through public methods only.
3. backend applies existing projection methods.
4. frontend adds a layer source/provider concept:
   static dataset provider vs live provider.
5. ui can select live/local source for supported layer types.
6. existing mode/cipher/family/dataset controls remain compatible.
7. add tests for backend geojson shape and frontend provider selection where practical.
8. run tests/build.

acceptance criteria:
1. static datasets still work.
2. live cliquemap generation works for one cipher/projection pair.
3. adding a phrase to glossololary appears in live atlas without manual geojson export.
4. live layers use glossololary public methods only.
5. no raw sqlite access.
6. selected mode/cipher/projection still controls search/sidebar language.
7. static export path remains available.
8. no public upload/guest lexicon work in this pass.