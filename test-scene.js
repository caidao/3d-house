import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildWorld } from './dist/scene.js';
import { Box3 } from './dist/vendor/three.module.js';
const {world,architecture,glass,warm,lights,stairs,parts,roads,palette,moduleSize}=buildWorld();
let meshes=0,rooms=0;
world.updateMatrixWorld(true);
world.traverse(node=>{
  if(node.userData.role==='tile-building')rooms++;
  if(!node.isMesh)return;
  meshes++;
  const positions=node.geometry.getAttribute('position');
  assert(positions&&positions.count>0);
  assert(Array.from(positions.array).every(Number.isFinite),'Model coordinates must be finite');
  assert(node.material,'Every surface has a material');
  if(node.isInstancedMesh)assert(Array.from(node.instanceMatrix.array).every(Number.isFinite),'Vegetation transforms must be finite');
});
const bounds=new Box3().setFromObject(architecture);
assert(bounds.min.y>=-1e-6&&bounds.max.y<8*moduleSize+.2,'Architecture must sit above the terrain within the intended skyline');
assert(rooms>=5,'The main block and side wings need occupied enclosed rooms');
assert(stairs.length>=3,'Provide internal circulation without changing exterior magnetic components');
for(const flight of stairs){
  assert(flight.rise/flight.count<=.18,'Stairs must have consistently small risers');
  assert(flight.run/flight.count>=.23,'Stair treads must have physical depth');
  assert(flight.width>=.9,'Stairs must have usable width');
}
assert(lights.length>=10&&lights.every(l=>l.isPointLight),'Interior and garden lights must illuminate actual surfaces');
assert.equal(glass.length,Object.keys(palette).length);assert(warm.emissiveIntensity>0);
// Verify the complete local module graph, including postprocessing and HDR loader dependencies.
const seen=new Set();
function checkImports(file){
  file=resolve(file);if(seen.has(file))return;seen.add(file);
  assert(existsSync(file),`Missing runtime module: ${file}`);
  const source=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  for(const [,name] of source.matchAll(/^\s*(?:import|export)\s+[\w{},*\s]+?\sfrom\s*['"]([^'"]+)['"]/gm)){
    if(name==='three')checkImports('dist/vendor/three.module.js');
    else if(name.startsWith('.'))checkImports(resolve(dirname(file),name));
    else assert.fail(`Unexpected remote/package dependency: ${name}`);
  }
}
checkImports('dist/app.js');
for(const name of ['wood','grass','paving'])for(const suffix of ['color','normal','rough'])assert(existsSync(`dist/assets/materials/${name}-${suffix}.jpg`));
assert(existsSync('dist/assets/materials/daylight.hdr'));
console.log(`PASS: ${meshes} model surfaces, ${rooms} room blocks, ${stairs.length} continuous stairs, ${lights.length} real lights, ${seen.size} local modules; valid materials and geometry.`);

for(const name of ['main-square-tile-house','red-tapered-tower','yellow-capped-small-turret','green-arched-portal','radial-star-tower','stepped-annex-0','stepped-annex-1','stepped-annex-2','pink-blue-magnetic-stairs','main-yellow-crane','annex-yellow-crane','yellow-black-brick-balcony','red-square-figure-tower'])assert(parts[name],`Missing original exterior component: ${name}`);
assert.equal(roads.length,6,'Retain all the reconstructed original road routes');
assert(roads.some(r=>r.name==='oval-turning-loop'&&r.closed));
assert(roads.some(r=>r.name==='entrance-road'&&r.points.at(0)[1]===26));
const exteriorColors=new Set();parts['pink-blue-magnetic-stairs'].traverse(o=>{if(o.isMesh&&o.material.name)exteriorColors.add(o.material.name);});
assert(exteriorColors.has('magenta')&&exteriorColors.has('cyan'),'Keep the separate pink and blue stair panels');
const left=new Box3().setFromObject(parts['radial-star-tower']),right=new Box3().setFromObject(parts['stepped-annex-2']);
assert(left.max.x<right.min.x,'Preserve separation between the star tower and annex');
console.log('PASS: original exterior feature inventory, six road routes and pink/blue stair colours');
