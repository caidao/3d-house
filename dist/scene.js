import * as THREE from './vendor/three.module.js';

export function buildWorld() {
  const world = new THREE.Group();
  const glassColors = ['#e2aa29','#c65065','#3c9f92','#7495b4','#a677a3','#d58438'];
  const glass = glassColors.map(color => new THREE.MeshPhysicalMaterial({color,metalness:.16,roughness:.17,transparent:true,opacity:.77,side:THREE.DoubleSide,depthWrite:false,clearcoat:1}));
  const stone = new THREE.MeshStandardMaterial({color:'#d8d3c3',roughness:.87});
  const frame = new THREE.MeshStandardMaterial({color:'#3c4541',metalness:.7,roughness:.32});
  const bronze = new THREE.MeshStandardMaterial({color:'#bda578',metalness:.68,roughness:.34});
  const roofMat = new THREE.MeshStandardMaterial({color:'#344953',metalness:.48,roughness:.32});
  const warm = new THREE.MeshStandardMaterial({color:'#ffdc90',emissive:'#ffbc59',emissiveIntensity:.28});
  const grass = new THREE.MeshStandardMaterial({color:'#95a582',roughness:1});
  const road = new THREE.MeshStandardMaterial({color:'#79817e',roughness:1});
  const pale = new THREE.MeshStandardMaterial({color:'#dedfd5',roughness:.9});
  const lamps=[];
  function mesh(geometry,material,x=0,y=0,z=0,parent=world) {
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function box(w,h,d,x,y,z,mat=stone,parent=world){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
  function beam(a,b,mat=frame,r=.035,parent=world){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const m=mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),5),mat,...start.clone().add(end).multiplyScalar(.5).toArray(),parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
  function triangle(a,b,c,color,parent=world){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c],3));g.computeVertexNormals();mesh(g,glass[color%6],0,0,0,parent);beam(a,b,bronze,.035,parent);beam(b,c,bronze,.035,parent);beam(c,a,bronze,.035,parent);}
  function pyramid(x,y,z,w,h,d,color,parent=world){const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];for(let i=0;i<4;i++)triangle(p[i],p[(i+1)%4],[x,y+h,z],color+i,parent);}
  function pane(w,h,x,y,z,color,side=false,parent=world){const m=box(w,h,.045,x,y,z,glass[color%6],parent);if(side)m.rotation.y=Math.PI/2;return m;}
  function building(x,z,w,d,floors,h=1.7){
    const group=new THREE.Group();group.position.set(x,.22,z);world.add(group);
    for(let f=0;f<=floors;f++)box(w+.22,.17,d+.22,0,f*h,0,stone,group);
    const nx=Math.round(w/1.35),nz=Math.round(d/1.35);
    for(let f=0;f<floors;f++){
      const y=f*h+h/2;
      box(w-.5,.055,d-.5,0,f*h+.16,0,bronze,group);
      for(let i=0;i<nx;i++)for(const s of [-1,1]){
        const px=-w/2+(i+.5)*w/nx;
        pane(w/nx-.08,h-.18,px,y,s*d/2,i+f+(s+1),false,group);
        box(.055,h,.08,px-w/nx/2,y,s*d/2,frame,group);
        if((i+f)%3===0)beam([px-w/nx/2,f*h+.1,s*d/2],[px+w/nx/2,(f+1)*h-.1,s*d/2],bronze,.022,group);
      }
      for(let i=0;i<nz;i++)for(const s of [-1,1]){
        const pz=-d/2+(i+.5)*d/nz;
        pane(d/nz-.08,h-.18,s*w/2,y,pz,i+f+2,true,group);
        box(.08,h,.055,s*w/2,y,pz-d/nz/2,frame,group);
      }
      // Interior partitions and warm ceiling strips remain visible through the glass.
      box(w*.3,h-.22,.1,0,y,0,stone,group);
      box(w-.6,.035,.06,0,(f+1)*h-.15,d/2-.35,warm,group);
      for(let i=0;i<2;i++)box(.75,.38,.5,-w/4+i*w/2,f*h+.33,d/4,stone,group);
    }
    for(const sx of [-1,1])for(const sz of [-1,1])box(.12,floors*h,.12,sx*w/2,floors*h/2,sz*d/2,frame,group);
    return group;
  }
  function railing(x,y,z,w,d,parent=world){
    for(const sz of [-1,1]){
      box(w,.045,.045,x,y+.64,z+sz*d/2,bronze,parent);
      for(let i=0;i<=Math.ceil(w/.6);i++)box(.025,.62,.025,x-w/2+i*w/Math.ceil(w/.6),y+.32,z+sz*d/2,bronze,parent);
    }
  }
  // A low oval landscape plinth grounds the architectural model.
  const base=mesh(new THREE.CylinderGeometry(1,1,.36,96),stone,0,-.18,0);base.scale.set(16,1,12);
  const lawn=mesh(new THREE.CylinderGeometry(1,1,.045,96),grass,0,.022,0);lawn.scale.set(15.8,1,11.8);
  const drive=mesh(new THREE.RingGeometry(.81,.94,112),road,0,.052,0);drive.rotation.x=-Math.PI/2;drive.scale.set(16,12,1);
  for(let i=0;i<80;i++){const a=i*Math.PI*2/80;const dash=box(.38,.008,.045,14*Math.cos(a),.058,10.5*Math.sin(a),pale);dash.rotation.y=-Math.atan2(10.5*Math.cos(a),-14*Math.sin(a));}
  box(14,.09,11,0,.1,-.7,pale);box(4,.08,7,0,.1,6,pale);
  const main=building(-1,-2.7,6.5,4.8,4);
  // Steep dark roof and stained-glass gables reinterpret the road-tile roof.
  for(const s of [-1,1]){
    const roof=box(7.1,.12,3.5,0,7.9,s*1.38,roofMat,main);roof.rotation.x=s*Math.atan2(2.15,2.65);
    for(let i=0;i<10;i++){const strip=box(.025,.035,3.48,-3.4+i*.755,.095,0,bronze,roof);}
    for(let i=0;i<5;i++)box(7.02,.035,.022,0,.09,-1.65+i*.82,frame,roof);
  }
  for(const s of [-1,1])triangle([s*3.26,6.8,-2.4],[s*3.26,6.8,2.4],[s*3.26,9,0],0,main);
  for(let i=0;i<4;i++){pyramid(-2.6+i*1.7,9,-.1,1.5,1.3,1.5,i,main);}
  pyramid(0,10.1,0,1.3,1.85,1.3,2,main);
  // Main balcony and entry canopy.
  box(7.4,.16,1.1,-1,3.7,.15);railing(-1,3.78,.15,7.4,1.05);
  for(let i=0;i<5;i++)box(3.5-i*.12,.13,.46,0,.15+i*.13,4.3-i*.46);
  box(2.9,.14,1.6,0,2.45,1.5,stone);for(const x of [-1.3,1.3])box(.12,2.3,.12,x,1.3,2.15,bronze);
  pane(1.7,2,0,1.2,.25,2);box(.07,2,.12,0,1.2,.29,bronze);
  // Slender left tower with a faceted, tapered crown.
  building(-6.4,-1.2,2.5,2.7,3);
  pyramid(-6.4,5.33,-1.2,2.8,3.1,3,1);pyramid(-6.4,8.1,-1.2,1.75,2.15,1.75,3);
  beam([-6.4,9.8,-1.2],[-6.4,10.65,-1.2],bronze,.035);
  const left=building(-6.2,3.3,2.5,2.5,2);
  pyramid(0,3.4,0,2.9,1.8,2.9,0,left);
  box(3,.15,2.1,-4.8,2.02,2.3);railing(-4.8,2.1,2.3,3,2.1);
  // The front star tower keeps the child's striking radial roof silhouette.
  const tower=new THREE.Group();tower.position.set(5,.22,5);world.add(tower);
  for(let f=0;f<3;f++){
    mesh(new THREE.CylinderGeometry(1.75,1.75,.15,8),stone,0,f*1.55,0,tower);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      const x=1.6*Math.cos((a+b)/2),z=1.6*Math.sin((a+b)/2);
      const p=pane(1.3,1.4,x,f*1.55+.78,z,i+f,false,tower);p.rotation.y=-(a+b)/2+Math.PI/2;
      beam([1.73*Math.cos(a),f*1.55,1.73*Math.sin(a)],[1.73*Math.cos(a),(f+1)*1.55,1.73*Math.sin(a)],frame,.045,tower);
    }
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,b=(i+1)*Math.PI/4,m=(a+b)/2;
    const p=[1.75*Math.cos(a),4.65,1.75*Math.sin(a)],q=[1.75*Math.cos(b),4.65,1.75*Math.sin(b)],tip=[3*Math.cos(m),4.55,3*Math.sin(m)];
    triangle(p,tip,[0,7.6,0],i,tower);triangle(tip,q,[0,7.6,0],i+1,tower);
  }
  mesh(new THREE.CylinderGeometry(1.86,1.86,.13,8),bronze,0,4.5,0,tower);
  // Glass bridge reaches a stepped greenhouse wing.
  box(4.6,.2,1.75,4.6,3.65,-2.7);railing(4.6,3.75,-2.7,4.6,1.75);
  for(let i=0;i<4;i++){pane(1.08,.75,2.9+i*1.13,4.05,-1.82,i);pane(1.08,.75,2.9+i*1.13,4.05,-3.58,i+2);}
  box(.18,3.6,.18,5.8,1.9,-3.4,stone);
  for(let i=0;i<3;i++){
    const wing=building(8.1,-3.5+i*2.6,2.7,2.55,3-i,1.45);
    pyramid(0,(3-i)*1.45,0,3,1.3,2.8,i+2,wing);
  }
  // Garden details, paths, benches and human-scale planting.
  const leafMats=['#49684b','#668154','#859866'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  const bark=new THREE.MeshStandardMaterial({color:'#786149',roughness:1});
  function tree(x,z,s=1){
    mesh(new THREE.CylinderGeometry(.08*s,.13*s,1.3*s,6),bark,x,.7*s,z);
    for(let i=0;i<3;i++){const m=mesh(new THREE.IcosahedronGeometry(.65*s,1),leafMats[i],x+Math.sin(i*2)*.3*s,1.3*s+i*.25*s,z+Math.cos(i*2)*.27*s);m.scale.y=1.18;}
    mesh(new THREE.CylinderGeometry(.65,.72,.16,16),stone,x,.1,z);
  }
  [[-10,-4,1.3],[-10,1,1.1],[-8,6,1.15],[-4,7,1],[10,5,1],[11,-1,1.1],[5,-7,1],[-4,-8,1.2],[1,-8,1],[-11,4,1]].forEach(p=>tree(...p));
  for(let i=0;i<12;i++){box(.75,.025,.5,-2.6,.16,3.6+i*.45,stone);}
  for(const [x,z] of [[-7,7],[-10,-6],[8,7],[11,-4],[-2,-8],[4,-7]]){
    beam([x,.1,z],[x,1.9,z],frame,.045);const bulb=mesh(new THREE.SphereGeometry(.13,12,8),warm,x,1.93,z);lamps.push(bulb);
  }
  for(const [x,z] of [[-4,6.5],[9,4],[-9,0]]){
    box(1.5,.1,.45,x,.52,z,bronze);box(1.5,.45,.08,x,.8,z-.2,bronze);for(const s of [-1,1])box(.08,.5,.32,x+s*.55,.26,z,frame);
  }
  // A shallow reflecting pool next to the main approach.
  box(2.8,.18,3.8,-3.6,.12,3.4,stone);
  const water=new THREE.MeshPhysicalMaterial({color:'#69a3a7',metalness:.45,roughness:.12,clearcoat:1});box(2.55,.02,3.55,-3.6,.23,3.4,water);
  function car(x,z,color,angle){const group=new THREE.Group();group.position.set(x,.12,z);group.rotation.y=angle;world.add(group);const paint=new THREE.MeshStandardMaterial({color,metalness:.5,roughness:.25});box(.77,.34,1.5,0,.25,0,paint,group);box(.64,.33,.8,0,.55,-.05,roofMat,group);for(const sx of [-1,1])for(const sz of [-1,1]){const wheel=mesh(new THREE.CylinderGeometry(.19,.19,.1,12),frame,sx*.4,.18,sz*.46,group);wheel.rotation.z=Math.PI/2;}for(const s of [-1,1])box(.16,.07,.02,s*.25,.35,.76,warm,group);}
  car(-7.5,8.85,'#bc7050',-.7);car(11.8,-5.2,'#e4d7b7',2.6);
  // Two scale figures near the entrance.
  for(const [x,z,color] of [[1.3,4.5,'#b77649'],[-.7,5.7,'#476c7b']]){const mat=new THREE.MeshStandardMaterial({color});mesh(new THREE.CylinderGeometry(.1,.14,.48,8),mat,x,.62,z);mesh(new THREE.SphereGeometry(.1,10,8),stone,x,.97,z);for(const s of [-1,1])box(.07,.35,.07,x+s*.07,.22,z,frame);}
  return {world,glass,warm,lamps};
}
