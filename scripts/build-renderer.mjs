import { build } from 'esbuild';
await build({stdin:{contents:"export { WebGLPathTracer, DenoiseMaterial, BlurredEnvMapGenerator } from 'three-gpu-pathtracer'; export { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'; export { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'; export { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';",resolveDir:process.cwd()},outfile:'dist/vendor/pathtracer.js',bundle:true,format:'esm',minify:true,plugins:[{name:'shared-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}]});
await build({entryPoints:['node_modules/three-mesh-bvh/src/workers/generateMeshBVH.worker.js'],outfile:'dist/vendor/generateMeshBVH.worker.js',bundle:true,format:'esm',minify:true});
console.log('Built local path tracer and geometry worker');
await build({entryPoints:['scripts/vendor/denoiser/src/index.ts'],outfile:'dist/vendor/ai-denoiser.js',bundle:true,format:'esm',minify:true,platform:'browser',target:'es2022'});
const {mkdir,copyFile}=await import('node:fs/promises');
await mkdir('dist/vendor/ort',{recursive:true});
for(const file of ['ort-wasm-simd-threaded.asyncify.mjs','ort-wasm-simd-threaded.asyncify.wasm'])await copyFile('node_modules/onnxruntime-web/dist/'+file,'dist/vendor/ort/'+file);
await copyFile('scripts/vendor/denoiser/LICENSE','dist/vendor/AI-DENOISER-LICENSE.txt');
