import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildWorld } from './scene.js';
const host=document.querySelector('#scene');
const loading=document.querySelector('#loading');
const dialog=document.querySelector('#original-dialog');
for(const id of ['original-top','original-card'])document.getElementById(id).onclick=()=>dialog.showModal();
document.querySelector('#close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

try {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36,1,.1,180);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.47;
  controls.minDistance=15;controls.maxDistance=85;controls.enablePan=true;controls.autoRotateSpeed=.45;
  const {world,glass,warm}=buildWorld();scene.add(world);
  const hemi=new THREE.HemisphereLight('#eef8ff','#88917b',2.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d2',4.3);sun.position.set(-12,24,15);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun);
  const fill=new THREE.DirectionalLight('#d5e8f5',1.4);fill.position.set(12,12,-10);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-.39;ground.receiveShadow=true;scene.add(ground);
  // A small procedural environment provides glass and metal reflections without a remote HDR asset.
  const envScene=new THREE.Scene();envScene.background=new THREE.Color('#d8e5e6');
  const envFloor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:'#8b9780'}));envFloor.rotation.x=-Math.PI/2;envFloor.position.y=-10;envScene.add(envFloor);
  for(const [x,y,z] of [[-15,20,10],[15,10,-10]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(15,20),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);envScene.add(panel);}
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(envScene,.06);scene.environment=environment.texture;pmrem.dispose();
  let night=false,activeView='overall',transition=null;
  const views={overall:[23,18,30],front:[0,12,39],aerial:[14,38,15]};
  function destination(view){const p=new THREE.Vector3(...views[view]);if(innerWidth<=760)p.multiplyScalar(1.55);return p;}
  function setView(view,animate=true){activeView=view;const pos=destination(view);const target=new THREE.Vector3(0,3.3,0);if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)transition={pos,target};else{camera.position.copy(pos);controls.target.copy(target);controls.update();}document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));}
  function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;if(w>760)camera.setViewOffset(w,h,-w*.105,0,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix();}
  resize();setView('overall',false);
  new ResizeObserver(()=>{resize();}).observe(host);
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  const auto=document.querySelector('#auto');
  auto.onclick=()=>{controls.autoRotate=!controls.autoRotate;auto.setAttribute('aria-pressed',controls.autoRotate);};
  controls.addEventListener('start',()=>{transition=null;});
  const toggle=document.querySelector('#daynight');
  toggle.onclick=()=>{
    night=!night;document.body.classList.toggle('night',night);toggle.setAttribute('aria-pressed',night);toggle.setAttribute('aria-label',night?'切换日光':'切换夜景');
    document.querySelector('#night-text').textContent=night?'看日光':'看夜景';document.querySelector('#night-icon').textContent=night?'☀':'☾';document.querySelector('#light-label').textContent=night?'夜景模式':'日光模式';
    hemi.intensity=night?.55:2.6;sun.intensity=night?.3:4.3;fill.intensity=night?.8:1.4;sun.color.set(night?'#91b6df':'#fff0d2');renderer.toneMappingExposure=night?1.05:1.35;scene.environmentIntensity=night?.22:1;
    warm.emissiveIntensity=night?3:.28;glass.forEach(m=>{m.emissive.copy(m.color);m.emissiveIntensity=night?.34:0;});
  };
  function zoom(scale){transition=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*scale,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
  document.querySelector('#zoom-in').onclick=()=>zoom(.83);document.querySelector('#zoom-out').onclick=()=>zoom(1.2);
  document.querySelector('#reset').onclick=()=>{controls.autoRotate=false;auto.setAttribute('aria-pressed','false');setView('overall');};
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维城堡：方向键旋转，加减键缩放');
  renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();transition=null;const p=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(p);if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;if(e.key==='ArrowUp')spherical.phi-=.1;if(e.key==='ArrowDown')spherical.phi+=.1;spherical.phi=THREE.MathUtils.clamp(spherical.phi,.1,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));if(e.key==='+'||e.key==='=')zoom(.9);if(e.key==='-')zoom(1.1);controls.update();}});
  let previous=0;
  function frame(time){const dt=Math.min((time-previous)/1000,.05);previous=time;if(transition){camera.position.lerp(transition.pos,.09);controls.target.lerp(transition.target,.09);if(camera.position.distanceTo(transition.pos)<.03)transition=null;}controls.update(dt);renderer.render(scene,camera);}
  renderer.setAnimationLoop(frame);loading.remove();
  document.addEventListener('visibilitychange',()=>renderer.setAnimationLoop(document.hidden?null:frame));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);host.insertAdjacentHTML('beforeend','<div id="loading" role="alert">画面暂时中断，请刷新页面继续探索。</div>');});
} catch(error){loading.textContent='当前浏览器暂时无法显示 3D，请使用支持 WebGL 的浏览器打开。你仍可以查看原作。';loading.setAttribute('role','alert');console.error(error);}
