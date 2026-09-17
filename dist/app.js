import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { HDRLoader } from './vendor/HDRLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { WebGLPathTracer, GenerateMeshBVHWorker, DenoiseMaterial, FullScreenQuad, BlurredEnvMapGenerator, RectAreaLightUniformsLib } from './vendor/pathtracer.js';
import { bakeInstancedMesh } from './geometry.js';
import { buildWorld } from './scene.js';
const host=document.querySelector('#scene'),loading=document.querySelector('#loading');
const dialog=document.querySelector('#original-dialog');
for(const id of ['original-top','original-card'])document.getElementById(id).onclick=()=>dialog.showModal();
document.querySelector('#close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
for(const button of document.querySelectorAll('[data-photo]'))button.onclick=()=>{dialog.querySelector('img').src='./assets/'+button.dataset.photo;document.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',b===button));};

try {
  RectAreaLightUniformsLib.init();
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  host.appendChild(renderer.domElement);
  let pathTracer=null,pathReady=false,preparingTrace=false;
  const renderStatus=document.querySelector('#render-status'),quality=document.querySelector('#quality'),refinedFrame=document.querySelector('#refined-frame');
  let lastRenderLabel='';
  function status(label){if(label!==lastRenderLabel){renderStatus.textContent=label;lastRenderLabel=label;}}
  let aiDenoiser=null,aiBusy=false,frameRevision=0,cleanRevision=-1,lastCleanSample=0;
  const hdrCaptureTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.FloatType});
  const cleanCanvas=document.createElement('canvas'),cleanContext=cleanCanvas.getContext('2d');
  const cleanTexture=new THREE.CanvasTexture(cleanCanvas);cleanTexture.colorSpace=THREE.SRGBColorSpace;
  const cleanQuad=new FullScreenQuad(new THREE.MeshBasicMaterial({map:cleanTexture,toneMapped:false,depthTest:false,depthWrite:false}));
  const rawMaterial=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false}),rawQuad=new FullScreenQuad(rawMaterial);
  function invalidateCleanFrame(){refinedFrame.hidden=true;frameRevision++;cleanRevision=-1;lastCleanSample=0;delete renderStatus.dataset.cleanSamples;}
  import('./vendor/ai-denoiser.js').then(({Denoiser})=>Denoiser.create({precision:'fp16',quality:'balanced',weightsUrl:new URL('./assets/denoiser/',import.meta.url).href.replace(/\/$/,''),wasmPaths:new URL('./vendor/ort/',import.meta.url).href,maxRunPixels:1280*1080,graphCapture:false,splitAux:false})).then(value=>{aiDenoiser=value;renderStatus.dataset.denoiser='ai';quality.title='光线追踪与高质量去噪';}).catch(error=>{renderStatus.dataset.denoiser='spatial';console.warn('High quality denoising unavailable; spatial filtering remains active',error);});
  async function captureCleanFrame(target){
    const revision=frameRevision,sample=Math.floor(pathTracer.samples);aiBusy=true;lastCleanSample=sample;
    let inputTexture=null,readback=null;
    try{
      const scale=Math.min(1,1280/host.clientWidth,1080/host.clientHeight),width=Math.max(1,Math.round(host.clientWidth*scale)),height=Math.max(1,Math.round(host.clientHeight*scale));
      hdrCaptureTarget.setSize(width,height);rawMaterial.map=target.texture;rawMaterial.toneMapped=false;
      const previous=renderer.getRenderTarget();renderer.setRenderTarget(hdrCaptureTarget);rawQuad.render(renderer);renderer.setRenderTarget(previous);
      const pixels=new Float32Array(width*height*4);await renderer.readRenderTargetPixelsAsync(hdrCaptureTarget,0,0,width,height,pixels);
      for(let i=0;i<pixels.length;i+=4){pixels[i]*=renderer.toneMappingExposure;pixels[i+1]*=renderer.toneMappingExposure;pixels[i+2]*=renderer.toneMappingExposure;}
      const device=aiDenoiser.device;inputTexture=device.createTexture({size:[width,height],format:'rgba32float',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING});
      device.queue.writeTexture({texture:inputTexture},pixels,{bytesPerRow:width*16},{width,height});
      const output=await aiDenoiser.denoiseTextures({color:inputTexture,hdr:true,inputFlipY:true,transfer:'aces-srgb'});
      if(!output||revision!==frameRevision)return;
      const stride=Math.ceil(width*4/256)*256;readback=device.createBuffer({size:stride*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture:output},{buffer:readback,bytesPerRow:stride},{width,height});device.queue.submit([encoder.finish()]);await readback.mapAsync(GPUMapMode.READ);
      if(revision!==frameRevision)return;
      const bytes=new Uint8Array(readback.getMappedRange()),rgba=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)rgba.set(bytes.subarray(y*stride,y*stride+width*4),y*width*4);
      cleanCanvas.width=width;cleanCanvas.height=height;cleanContext.putImageData(new ImageData(rgba,width,height),0,0);cleanTexture.needsUpdate=true;cleanRevision=revision;refinedFrame.src=cleanCanvas.toDataURL('image/webp',.96);refinedFrame.hidden=false;renderStatus.dataset.cleanSamples=String(sample);
    }catch(error){aiDenoiser=null;renderStatus.dataset.denoiser='spatial';console.warn('High quality denoising failed; continuing spatial filtering',error);}
    finally{inputTexture?.destroy();readback?.destroy();aiBusy=false;}
  }
  const manager=new THREE.LoadingManager();
  let missingAsset=false;
  manager.onError=()=>{missingAsset=true;};
  const loader=new THREE.TextureLoader(manager),textures={};
  for(const name of ['wood','grass','paving','asphalt']){
    textures[name]={};
    for(const [suffix,key] of [['color','map'],['normal','normalMap'],['rough','roughnessMap']]){
      const tex=loader.load(`./assets/materials/${name}-${suffix}.jpg`);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();if(key==='map')tex.colorSpace=THREE.SRGBColorSpace;textures[name][key]=tex;
    }
    textures[name].normalScale=new THREE.Vector2(name==='asphalt'?.06:.25,name==='asphalt'?.06:.25);if(name==='grass'){textures[name].roughnessMap=null;textures[name].normalScale.set(.08,.08);}
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b5cee1');scene.fog=null;
  const camera=new THREE.PerspectiveCamera(40,1,.1,350);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.49;
  controls.minDistance=3;controls.maxDistance=110;controls.autoRotateSpeed=.3;
  const {world,warm,lights,planting}=buildWorld(textures);scene.add(world);
  // Batch opaque static geometry by material; detailed rooms do not need thousands of draw calls.
  world.updateMatrixWorld(true);
  const batches=new Map();
  world.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;const items=batches.get(o.material)||[];items.push(o);batches.set(o.material,items);});
  for(const [material,items] of batches){
    if(items.length<2)continue;
    const geometries=items.map(o=>{let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}return g;});
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    const combined=new THREE.Mesh(geometry,material);combined.castShadow=true;combined.receiveShadow=true;world.add(combined);items.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
  }
  const modelLoader=new GLTFLoader(manager);
  function addScannedPlanting(name,placements){
    if(!placements.length)return;
    modelLoader.load(`./assets/models/${name}/model.gltf`,asset=>{
      const root=asset.scene;root.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const normalize=new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z);
      const dummy=new THREE.Object3D();
      root.traverse(source=>{
        if(!source.isMesh)return;
        const material=source.material;material.envMapIntensity=.8;
        if(material.transparent||material.alphaTest>0){material.alphaMap=loader.load(`./assets/models/${name}/alpha.png`);material.alphaMap.flipY=false;material.transparent=false;material.opacity=1;material.alphaTest=.45;material.depthWrite=true;material.needsUpdate=true;}
        const instances=new THREE.InstancedMesh(source.geometry,material,placements.length);
        placements.forEach(([x,y,z,height],i)=>{
          dummy.position.set(x,y,z);dummy.rotation.set(0,i*2.399,0);dummy.scale.setScalar(height/size.y);dummy.updateMatrix();
          const matrix=dummy.matrix.clone().multiply(normalize).multiply(source.matrixWorld);
          instances.setMatrixAt(i,matrix);
        });
        instances.castShadow=true;instances.receiveShadow=true;instances.computeBoundingSphere();scene.add(instances);
      });
    });
  }
  addScannedPlanting('tree',planting.trees.map(([x,z,h])=>[x,.04,z,h]));
  // Compose compact hedges from the existing photographed leaf atlas, rather than repeating a sparse branch scan.
  const leafMap=loader.load('./assets/models/tree/textures/island_tree_02_leaves_diff_1k.jpg');leafMap.colorSpace=THREE.SRGBColorSpace;
  const leafAlpha=loader.load('./assets/models/tree/alpha.png');
  for(const texture of [leafMap,leafAlpha]){texture.repeat.set(.19,.47);texture.offset.set(0,.53);}
  const leafMaterial=new THREE.MeshStandardMaterial({map:leafMap,alphaMap:leafAlpha,alphaTest:.45,side:THREE.DoubleSide,roughness:1,color:'#bcd59e'});
  const leavesPerShrub=260,hedges=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),leafMaterial,planting.shrubs.length*leavesPerShrub);
  const leafPose=new THREE.Object3D();let leafSeed=7513,leafIndex=0;
  function randomLeaf(){leafSeed=(leafSeed*1664525+1013904223)>>>0;return leafSeed/4294967296;}
  for(const [x,z,height] of planting.shrubs)for(let i=0;i<leavesPerShrub;i++){
    const theta=randomLeaf()*Math.PI*2,vertical=randomLeaf()*2-1,radius=height*(.3+randomLeaf()*.16),horizontal=Math.sqrt(1-vertical*vertical);
    leafPose.position.set(x+Math.cos(theta)*horizontal*radius,.15+height*.5+vertical*radius,z+Math.sin(theta)*horizontal*radius);
    leafPose.rotation.set(randomLeaf()*Math.PI,theta,randomLeaf()*Math.PI);leafPose.scale.set(height*.12,height*.3,1);leafPose.updateMatrix();hedges.setMatrixAt(leafIndex,leafPose.matrix);
    hedges.setColorAt(leafIndex,new THREE.Color().setHSL(.21+randomLeaf()*.035,.25,.53+randomLeaf()*.13));leafIndex++;
  }
  hedges.castShadow=true;hedges.receiveShadow=true;hedges.computeBoundingSphere();hedges.name='garden-hedges';scene.add(hedges);
  addScannedPlanting('plant',planting.plants);
  const hemi=new THREE.HemisphereLight('#e8f1ff','#9a855a',.7);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe4b0',3.1);sun.position.set(-18,23,26);sun.target.position.set(0,2,0);scene.add(sun.target);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-27,right:27,top:24,bottom:-24,near:1,far:95});sun.shadow.bias=-.00012;sun.shadow.normalBias=.04;scene.add(sun);
  const fill=new THREE.DirectionalLight('#c3d9ff',.3);fill.position.set(20,10,-20);scene.add(fill);
  let hdr=null,night=false;
  new HDRLoader(manager).load('./assets/materials/park-surroundings.hdr',texture=>{
    hdr=texture;texture.mapping=THREE.EquirectangularReflectionMapping;const envBlur=new BlurredEnvMapGenerator(renderer);scene.environment=envBlur.generate(texture,.12);envBlur.dispose();
    scene.background=texture;
    scene.backgroundIntensity=night?.13:2;scene.backgroundBlurriness=0;
    scene.backgroundRotation.y=.8;scene.environmentRotation.y=.8;
  });
  scene.environmentIntensity=2;
  let transition=null,activeView='overall',mobile=innerWidth<=760;
  const views={overall:{pos:[24,17.5,45],target:[1,7.2,5]},front:{pos:[1,20,49],target:[1,7,3]},aerial:{pos:[18,49,35],target:[1,2,5]},courtyard:{pos:[2.2,2.4,11.5],target:[-1.5,3.2,-2]},garden:{pos:[-24.5,8,28.5],target:[-14.5,1.5,17]},living:{pos:[1.3,1.7,-1.85],target:[-.9,1.2,-4.9]}};
  function setView(view,animate=true){
    activeView=view;renderer.toneMappingExposure=view==='living'?(night?.8:.72):(night?1.05:1);camera.fov=view==='living'?60:40;camera.updateProjectionMatrix();const target=new THREE.Vector3(...views[view].target),pos=new THREE.Vector3(...views[view].pos);
    if(mobile&&!['courtyard','garden','living'].includes(view))pos.sub(target).multiplyScalar(1.2).add(target);
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)transition={pos,target};else{camera.position.copy(pos);controls.target.copy(target);controls.update();}
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
    document.querySelector('#view-label').textContent=({overall:'全景',front:'正面',aerial:'俯瞰',courtyard:'庭院',garden:'花园',living:'主楼客厅'})[view];
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(pathReady){invalidateCleanFrame();pathTracer.pausePathTracing=false;pathTracer.updateCamera();}const next=w<=760;if(mobile!==next){mobile=next;setView(activeView,false);}}
  resize();setView('overall',false);new ResizeObserver(resize).observe(host);
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  const auto=document.querySelector('#auto');auto.onclick=()=>{controls.autoRotate=!controls.autoRotate;auto.setAttribute('aria-pressed',controls.autoRotate);};
  controls.addEventListener('start',()=>{transition=null;});
  controls.addEventListener('change',()=>{if(pathReady){invalidateCleanFrame();pathTracer.pausePathTracing=false;pathTracer.updateCamera();}});
  quality.onclick=()=>{if(!pathReady)return;refinedFrame.hidden=true;pathTracer.enablePathTracing=!pathTracer.enablePathTracing;quality.setAttribute('aria-pressed',pathTracer.enablePathTracing);pathTracer.pausePathTracing=false;pathTracer.reset();};
  const toggle=document.querySelector('#daynight');
  toggle.onclick=()=>{
    night=!night;document.body.classList.toggle('night',night);toggle.setAttribute('aria-pressed',night);toggle.setAttribute('aria-label',night?'切换日光':'切换夜景');
    document.querySelector('#night-text').textContent=night?'看日光':'看夜景';document.querySelector('#night-icon').textContent=night?'☀':'☾';document.querySelector('#light-label').textContent=night?'暮色灯光':'午后日光';
    scene.background=hdr||new THREE.Color('#b5cee1');scene.backgroundIntensity=night?.13:2;
    hemi.intensity=night?.6:.75;sun.intensity=night?.45:3.4;fill.intensity=night?.32:.3;sun.color.set(night?'#8fb7e5':'#fff0d6');renderer.toneMappingExposure=activeView==='living'?(night?.8:.72):(night?1.05:1);scene.environmentIntensity=night?.35:2;
    warm.emissiveIntensity=night?3.8:1.3;lights.forEach(l=>{l.intensity=l.isRectAreaLight?(night?18:12):(night?16:.8);});
    if(pathReady){invalidateCleanFrame();pathTracer.pausePathTracing=false;pathTracer.updateMaterials();pathTracer.updateLights();pathTracer.updateEnvironment();}
  };
  function zoom(scale){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*scale,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
  document.querySelector('#zoom-in').onclick=()=>zoom(.83);document.querySelector('#zoom-out').onclick=()=>zoom(1.2);
  document.querySelector('#reset').onclick=()=>{controls.autoRotate=false;auto.setAttribute('aria-pressed','false');setView('overall');};
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维住宅：方向键旋转，加减键缩放；可用庭院和客厅按钮近距离浏览');
  renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();transition=null;const p=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(p);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;s.phi=THREE.MathUtils.clamp(s.phi,.1,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));if(e.key==='+'||e.key==='=')zoom(.9);if(e.key==='-')zoom(1.1);controls.update();}});
  let previous=0;
  function frame(time){const dt=Math.min((time-previous)/1000,.05);previous=time;if(transition){camera.position.lerp(transition.pos,.085);controls.target.lerp(transition.target,.085);if(camera.position.distanceTo(transition.pos)<.025)transition=null;}controls.update(dt);
    if(pathReady){
      pathTracer.renderSample();renderStatus.dataset.samples=String(Math.floor(pathTracer.samples));
      status(!pathTracer.enablePathTracing?'快速浏览':pathTracer.isCompiling?'准备写实光影…':pathTracer.samples<1?'调整视角中':pathTracer.samples<192?'光影正在细化…':'写实光影');
      if(pathTracer.samples>=192)pathTracer.pausePathTracing=true;
    }else renderer.render(scene,camera);}
  renderer.setAnimationLoop(frame);
  manager.onLoad=async()=>{
    if(preparingTrace)return;preparingTrace=true;
    if(missingAsset){loading.textContent='部分材质未加载，可刷新重试';loading.classList.add('asset-warning');}else loading.remove();
    status('准备写实光影…');
    try{
      // Bake without changing the visible scene: the ray tracer cannot read GPU instance transforms.
      scene.updateMatrixWorld(true);const instances=[];scene.traverse(o=>{if(o.isInstancedMesh)instances.push(o);});
      for(const original of instances){const baked=bakeInstancedMesh(original);scene.add(baked);original.removeFromParent();original.dispose();}
      pathTracer=new WebGLPathTracer(renderer);pathTracer.setBVHWorker(new GenerateMeshBVHWorker());
      pathTracer.bounces=8;pathTracer.transmissiveBounces=32;pathTracer.filterGlossyFactor=.6;pathTracer.tiles.set(3,3);pathTracer.renderScale=1;pathTracer.minSamples=4;pathTracer.renderDelay=160;pathTracer.fadeDuration=600;pathTracer.textureSize.set(1024,1024);
      const denoiseMaterial=new DenoiseMaterial({sigma:1.5,kSigma:1,threshold:.3,transparent:true,blending:THREE.NormalBlending});const denoiseQuad=new FullScreenQuad(denoiseMaterial);
      // Filter in display-linear colour so isolated HDR highlights do not survive as bright speckles.
      denoiseMaterial.fragmentShader=denoiseMaterial.fragmentShader.replace('centrPx.rgb *= centrPx.a;','centrPx.rgb *= centrPx.a;\n #ifdef TONE_MAPPING\n centrPx.rgb = toneMapping(centrPx.rgb);\n #endif').replace('walkPx.rgb *= walkPx.a;','walkPx.rgb *= walkPx.a;\n #ifdef TONE_MAPPING\n walkPx.rgb = toneMapping(walkPx.rgb);\n #endif').replace('#include <tonemapping_fragment>','');
      pathTracer.renderToCanvasCallback=(target,outputRenderer,quad)=>{
        if(!pathTracer.enablePathTracing||quad.material.opacity===0)return;
        const sample=Math.floor(pathTracer.samples);
        if(aiDenoiser&&!aiBusy&&sample>=12&&(sample-lastCleanSample>=16||sample>=192&&lastCleanSample<192))captureCleanFrame(target);
        if(aiDenoiser){
          if(cleanRevision===frameRevision)cleanQuad.render(outputRenderer);else outputRenderer.render(scene,camera);
        }else{denoiseMaterial.map=target.texture;denoiseMaterial.opacity=quad.material.opacity;const autoClear=outputRenderer.autoClear;outputRenderer.autoClear=false;denoiseQuad.render(outputRenderer);outputRenderer.autoClear=autoClear;}
      };
      await pathTracer.setSceneAsync(scene,camera,{onProgress:value=>status('准备写实光影 '+Math.round(value*100)+'%')});
      pathReady=true;quality.disabled=false;pathTracer.updateCamera();status('光影正在细化…');
    }catch(error){status('写实渲染暂未启动，当前为快速浏览');quality.setAttribute('aria-pressed','false');console.error('Path tracing initialization failed',error);}
  };
  document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:frame));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);host.insertAdjacentHTML('beforeend','<div id="loading" role="alert">画面暂时中断，请刷新页面继续探索。</div>');});
} catch(error){loading.textContent='当前浏览器暂时无法显示 3D，请使用支持 WebGL 的浏览器打开。你仍可以查看原作。';loading.setAttribute('role','alert');console.error(error);}
