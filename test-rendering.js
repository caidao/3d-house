import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {solidPanelGeometry,bakeInstancedMesh} from './dist/geometry.js';
const pane=solidPanelGeometry([[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],.06);
const glass=new THREE.Mesh(pane,new THREE.MeshPhysicalMaterial({side:THREE.DoubleSide}));glass.updateMatrixWorld(true);
const hits=new THREE.Raycaster(new THREE.Vector3(.17,.23,1),new THREE.Vector3(0,0,-1)).intersectObject(glass);
assert.equal(hits.length,2,'A glass ray must cross exactly an entry and exit face');assert(Math.abs(hits[1].distance-hits[0].distance-.06)<1e-6);
const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial(),2);
instances.position.set(5,2,-3);instances.setMatrixAt(0,new THREE.Matrix4().makeTranslation(2,0,0));instances.setMatrixAt(1,new THREE.Matrix4().compose(new THREE.Vector3(-3,1,2),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.7),new THREE.Vector3(2,1,.5)));instances.setColorAt(0,new THREE.Color('#44aa66'));instances.setColorAt(1,new THREE.Color('#cc8844'));instances.updateMatrixWorld(true);
const expected=new THREE.Box3().setFromObject(instances),baked=bakeInstancedMesh(instances),actual=new THREE.Box3().setFromObject(baked);
assert(expected.min.distanceTo(actual.min)<1e-5&&expected.max.distanceTo(actual.max)<1e-5,'Baking must preserve placement and scale');assert(baked.material.vertexColors);assert.equal(baked.geometry.attributes.position.count,instances.geometry.attributes.position.count*2);
assert(Math.abs(baked.geometry.attributes.color.getX(0)-new THREE.Color('#44aa66').r)<1e-6);
console.log('PASS: closed glass volume, two optical interfaces, and lossless instance transforms/colours');

const {buildWorld}=await import('./dist/scene.js');
const {world}=buildWorld();world.updateMatrixWorld(true);
const openingRay=new THREE.Raycaster(new THREE.Vector3(-4.7,2.9,-4.8),new THREE.Vector3(0,-1,0));
const firstFloorHit=openingRay.intersectObject(world,true)[0];
assert(firstFloorHit.point.y<.4,'The upper slab must leave the stairwell opening clear');
console.log('PASS: internal stairs have a clear upper-floor opening');

const {existsSync,statSync}=await import('node:fs');
for(const file of ['pathtracer.js','generateMeshBVH.worker.js','ai-denoiser.js','ort/ort-wasm-simd-threaded.asyncify.mjs','ort/ort-wasm-simd-threaded.asyncify.wasm'])assert(existsSync('dist/vendor/'+file),'Missing local renderer resource: '+file);
for(const model of ['rt_ldr','rt_ldr.fp16','rt_hdr','rt_hdr.fp16'])assert(statSync('dist/assets/denoiser/'+model+'.onnx').size>1000000,'Missing or invalid denoiser weights');
console.log('PASS: all renderer, worker, inference runtime and model assets are bundled locally');
