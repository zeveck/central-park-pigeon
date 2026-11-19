three.js 0.186.1 (MIT, see LICENSE), from cdn.jsdelivr.net/npm/three@0.186.1.
three.module.js and three.core.js are jsDelivr's minified copies of build/three.module.js and build/three.core.js.
addons/ holds examples/jsm files, unchanged.
meshopt_simplifier.module.js is meshoptimizer 1.2.0's meshopt_simplifier.js (MIT, (C) Arseny Kapoulkine), unchanged,
from the npm package (tools/node_modules/meshoptimizer). The perf pass uses it at load for the people's distance LODs
(src/gfx/simplify.js).
