import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { HDRLoader } from './vendor/HDRLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { SSAOPass } from './vendor/postprocessing/SSAOPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';
import { buildWorld } from './scene.js';
const host=document.querySelector('#scene'),loading=document.querySelector('#loading');
const dialog=document.querySelector('#original-dialog');
for(const id of ['original-top','original-card'])document.getElementById(id).onclick=()=>dialog.showModal();
document.querySelector('#close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

try {
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  host.appendChild(renderer.domElement);
  const manager=new THREE.LoadingManager();
  let missingAsset=false;
  manager.onError=()=>{missingAsset=true;};
  const loader=new THREE.TextureLoader(manager),textures={};
  for(const name of ['stone','wood','grass']){
    textures[name]={};
    for(const [suffix,key] of [['color','map'],['normal','normalMap'],['rough','roughnessMap']]){
      const tex=loader.load(`./assets/materials/${name}-${suffix}.jpg`);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();if(key==='map')tex.colorSpace=THREE.SRGBColorSpace;textures[name][key]=tex;
    }
    textures[name].normalScale=new THREE.Vector2(name==='stone'?.45:.25,name==='stone'?.45:.25);
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color('#a6c0d1');scene.fog=new THREE.FogExp2('#bbcaca',.006);
  const camera=new THREE.PerspectiveCamera(47,1,.1,350);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.49;
  controls.minDistance=3;controls.maxDistance=110;controls.autoRotateSpeed=.3;
  const {world,glass,warm,lights}=buildWorld(textures);scene.add(world);
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
  const hemi=new THREE.HemisphereLight('#d9edff','#847449',.75);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d6',3.4);sun.position.set(-20,30,20);sun.target.position.set(0,2,0);scene.add(sun.target);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-27,right:27,top:24,bottom:-24,near:1,far:95});sun.shadow.bias=-.00012;sun.shadow.normalBias=.04;scene.add(sun);
  const fill=new THREE.DirectionalLight('#c3d9ff',.3);fill.position.set(20,10,-20);scene.add(fill);
  let hdr=null,night=false;
  new HDRLoader(manager).load('./assets/materials/daylight.hdr',texture=>{
    hdr=texture;texture.mapping=THREE.EquirectangularReflectionMapping;scene.environment=texture;
    if(!night)scene.background=texture;
    scene.backgroundRotation.y=.8;scene.environmentRotation.y=.8;
  });
  scene.environmentIntensity=.65;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.samples=4;
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,1,1,16);ao.kernelRadius=.55;ao.minDistance=.001;ao.maxDistance=.09;composer.addPass(ao);composer.addPass(new OutputPass());
  let transition=null,activeView='overall',mobile=innerWidth<=760;
  const views={overall:{pos:[27,21,38],target:[0,4,0]},front:{pos:[0,12,43],target:[0,5,-1]},aerial:{pos:[18,43,26],target:[0,1,0]},courtyard:{pos:[2.2,2.4,11.5],target:[-1.5,3.2,-2]},living:{pos:[-7.7,1.85,7.4],target:[-8.4,1.5,4.5]}};
  function setView(view,animate=true){
    activeView=view;const target=new THREE.Vector3(...views[view].target),pos=new THREE.Vector3(...views[view].pos);
    if(mobile&&!['courtyard','living'].includes(view))pos.sub(target).multiplyScalar(1.65).add(target);
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)transition={pos,target};else{camera.position.copy(pos);controls.target.copy(target);controls.update();}
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
    document.querySelector('#view-label').textContent=({overall:'全景',front:'正面',aerial:'俯瞰',courtyard:'庭院',living:'塔楼客厅'})[view];
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const next=w<=760;if(mobile!==next){mobile=next;setView(activeView,false);}}
  resize();setView('overall',false);new ResizeObserver(resize).observe(host);
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  const auto=document.querySelector('#auto');auto.onclick=()=>{controls.autoRotate=!controls.autoRotate;auto.setAttribute('aria-pressed',controls.autoRotate);};
  controls.addEventListener('start',()=>{transition=null;});
  const toggle=document.querySelector('#daynight');
  toggle.onclick=()=>{
    night=!night;document.body.classList.toggle('night',night);toggle.setAttribute('aria-pressed',night);toggle.setAttribute('aria-label',night?'切换日光':'切换夜景');
    document.querySelector('#night-text').textContent=night?'看日光':'看夜景';document.querySelector('#night-icon').textContent=night?'☀':'☾';document.querySelector('#light-label').textContent=night?'暮色灯光':'午后日光';
    scene.background=night?new THREE.Color('#111e35'):(hdr||new THREE.Color('#a6c0d1'));scene.fog.color.set(night?'#18293d':'#bbcaca');
    hemi.intensity=night?.27:.75;sun.intensity=night?.17:3.4;fill.intensity=night?.32:.3;sun.color.set(night?'#8fb7e5':'#fff0d6');renderer.toneMappingExposure=night?1.05:.88;scene.environmentIntensity=night?.13:.65;
    warm.emissiveIntensity=night?2.8:.7;glass.forEach(m=>{m.emissive.copy(m.color);m.emissiveIntensity=night?.035:0;});lights.forEach(l=>{l.intensity=night?(l.distance>5?24:12):(l.distance>5?7:.4);});
  };
  function zoom(scale){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*scale,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
  document.querySelector('#zoom-in').onclick=()=>zoom(.83);document.querySelector('#zoom-out').onclick=()=>zoom(1.2);
  document.querySelector('#reset').onclick=()=>{controls.autoRotate=false;auto.setAttribute('aria-pressed','false');setView('overall');};
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维住宅：方向键旋转，加减键缩放；可用庭院和客厅按钮近距离浏览');
  renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();transition=null;const p=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(p);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;s.phi=THREE.MathUtils.clamp(s.phi,.1,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));if(e.key==='+'||e.key==='=')zoom(.9);if(e.key==='-')zoom(1.1);controls.update();}});
  let previous=0;
  function frame(time){const dt=Math.min((time-previous)/1000,.05);previous=time;if(transition){camera.position.lerp(transition.pos,.085);controls.target.lerp(transition.target,.085);if(camera.position.distanceTo(transition.pos)<.025)transition=null;}controls.update(dt);composer.render();}
  renderer.setAnimationLoop(frame);manager.onLoad=()=>{if(missingAsset){loading.textContent='部分材质未加载，可刷新重试';loading.classList.add('asset-warning');}else loading.remove();};
  document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:frame));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);host.insertAdjacentHTML('beforeend','<div id="loading" role="alert">画面暂时中断，请刷新页面继续探索。</div>');});
} catch(error){loading.textContent='当前浏览器暂时无法显示 3D，请使用支持 WebGL 的浏览器打开。你仍可以查看原作。';loading.setAttribute('role','alert');console.error(error);}
