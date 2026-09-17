import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildWorld } from './dist/scene.js';
import { Box3 } from './dist/vendor/three.module.js';
const {world,architecture,glass,warm,lights,stairs}=buildWorld();
let meshes=0,rooms=0;
world.updateMatrixWorld(true);
world.traverse(node=>{
  if(node.name==='habitable-building')rooms++;
  if(!node.isMesh)return;
  meshes++;
  const positions=node.geometry.getAttribute('position');
  assert(positions&&positions.count>0);
  assert(Array.from(positions.array).every(Number.isFinite),'Model coordinates must be finite');
  assert(node.material,'Every surface has a material');
  if(node.isInstancedMesh)assert(Array.from(node.instanceMatrix.array).every(Number.isFinite),'Vegetation transforms must be finite');
});
const bounds=new Box3().setFromObject(architecture);
assert(bounds.min.y>=-1e-6&&bounds.max.y<17,'Architecture must sit above the terrain within the intended skyline');
assert(rooms>=5,'The main block and side wings need occupied enclosed rooms');
assert(stairs.length>=5,'Provide entrance, internal and external circulation');
for(const flight of stairs){
  assert(flight.rise/flight.count<=.18,'Stairs must have consistently small risers');
  assert(flight.run/flight.count>=.23,'Stair treads must have physical depth');
  assert(flight.width>=.9,'Stairs must have usable width');
}
assert(lights.length>=10&&lights.every(l=>l.isPointLight),'Interior and garden lights must illuminate actual surfaces');
assert.equal(glass.length,6);assert(warm.emissiveIntensity>0);
// Verify the complete local module graph, including postprocessing and HDR loader dependencies.
const seen=new Set();
function checkImports(file){
  file=resolve(file);if(seen.has(file))return;seen.add(file);
  assert(existsSync(file),`Missing runtime module: ${file}`);
  const source=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  for(const [,name] of source.matchAll(/from\s*['"]([^'"]+)['"]/g)){
    if(name==='three')checkImports('dist/vendor/three.module.js');
    else if(name.startsWith('.'))checkImports(resolve(dirname(file),name));
    else assert.fail(`Unexpected remote/package dependency: ${name}`);
  }
}
checkImports('dist/app.js');
for(const name of ['stone','wood','grass'])for(const suffix of ['color','normal','rough'])assert(existsSync(`dist/assets/materials/${name}-${suffix}.jpg`));
assert(existsSync('dist/assets/materials/daylight.hdr'));
console.log(`PASS: ${meshes} model surfaces, ${rooms} room blocks, ${stairs.length} continuous stairs, ${lights.length} real lights, ${seen.size} local modules; valid materials and geometry.`);
