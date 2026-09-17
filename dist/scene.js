import * as THREE from './vendor/three.module.js';

// All dimensions are in metres. The model depicts rooms, floors and circulation,
// while retaining the child's coloured glazing and asymmetric roof silhouettes.
export function buildWorld(textures = {}) {
  const world=new THREE.Group();world.name='residence';
  const architecture=new THREE.Group();architecture.name='architecture';world.add(architecture);
  const materials={};
  function mat(name,color,extra={}){return materials[name]=new THREE.MeshStandardMaterial({color,roughness:.7,...extra,...textures[name]});}
  const stone=mat('stone','#ccc9bf'),plaster=mat('plaster','#ebe8dd'),wood=mat('wood','#b98d5c');
  const paving=mat('paving','#bdc1bb',{roughness:.87}),grass=mat('grass','#697b45');
  const frame=mat('frame','#282e2a',{metalness:.7,roughness:.3}),bronze=mat('bronze','#b69956',{metalness:.65,roughness:.3});
  const roof=mat('roof','#26383f',{metalness:.5,roughness:.24}),fabric=mat('fabric','#e2d7bd');
  const warm=mat('warm','#ffe2aa',{emissive:'#ffd18c',emissiveIntensity:.7});
  const glass=['#edbc21','#e23657','#39b771','#59a7c6','#ad5fac','#eb8733'].map(color=>new THREE.MeshPhysicalMaterial({color,roughness:.11,metalness:0,transparent:true,opacity:.56,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,envMapIntensity:1.2}));
  const clear=new THREE.MeshPhysicalMaterial({color:'#c3dce1',metalness:.05,roughness:.07,transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,envMapIntensity:1.35});
  const water=new THREE.MeshPhysicalMaterial({color:'#378f9c',metalness:.45,roughness:.12,clearcoat:1});
  const lights=[],stairs=[];
  function mesh(g,m,x=0,y=0,z=0,parent=world){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,x,y,z,m=stone,parent=world){
    const g=new THREE.BoxGeometry(w,h,d);
    if(m.map){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i)+z:p.getX(i)+x)/2,(ny>.5?p.getZ(i)+z:p.getY(i)+y)/2);}}
    return mesh(g,m,x,y,z,parent);
  }
  function beam(a,b,m=frame,r=.045,parent=world){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,...p.add(q).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function triangle(a,b,c,color,parent=architecture){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();mesh(g,glass[color%6],0,0,0,parent);for(const [p,q] of [[a,b],[b,c],[c,a]])beam(p,q,bronze,.045,parent);}
  function pyramid(x,y,z,w,h,d,color,parent=architecture){const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];for(let i=0;i<4;i++)triangle(p[i],p[(i+1)%4],[x,y+h,z],color+i,parent);}
  function rail(a,b,y,parent=architecture){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/1.2);
    beam([a[0],y+1.03,a[1]],[b[0],y+1.03,b[1]],frame,.035,parent);
    for(let i=0;i<=count;i++){const t=i/count;beam([a[0]+(b[0]-a[0])*t,y,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*t,y+1.03,a[1]+(b[1]-a[1])*t],frame,.026,parent);}
    const panel=box(length,.89,.035,(a[0]+b[0])/2,y+.5,(a[1]+b[1])/2,clear,parent);panel.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
  }
  function stair(x,z,width,rise,run,count,parent=architecture,colorful=false){
    const group=new THREE.Group();group.name='continuous-stair';parent.add(group);stairs.push({rise,run,count,width});
    for(let i=0;i<count;i++){const y=(i+1)*rise/count;box(width,y,run/count+.02,x,y/2,z-i*run/count,colorful?glass[i%6]:stone,group);box(width,.035,run/count,x,y+.02,z-i*run/count,colorful?glass[i%6]:paving,group);}
    for(const s of [-1,1]){beam([x+s*width/2,rise/count+1.03,z+.1],[x+s*width/2,rise+1.03,z-run+run/count],bronze,.04,group);for(let i=0;i<count;i+=3)beam([x+s*width/2,(i+1)*rise/count,z-i*run/count],[x+s*width/2,(i+1)*rise/count+1.03,z-i*run/count],bronze,.025,group);}
    return group;
  }
  function lounge(x,y,z,parent=architecture){
    box(2,.35,.9,x,y+.35,z,wood,parent);box(1.9,.18,.82,x,y+.6,z,fabric,parent);box(2,.65,.18,x,y+.72,z-.4,fabric,parent);
    for(const s of [-1,1])box(.18,.5,.88,x+s*.95,y+.56,z,fabric,parent);
    box(1.2,.09,.7,x,y+.43,z+1.1,wood,parent);for(const s of [-1,1])box(.055,.4,.5,x+s*.45,y+.2,z+1.1,frame,parent);
    mesh(new THREE.CylinderGeometry(.13,.1,.26,12),plaster,x+.3,y+.6,z+1.1,parent);
  }
  function roomBuilding(x,z,w,d,floors,parent=architecture){
    const group=new THREE.Group();group.position.set(x,.22,z);group.name='habitable-building';parent.add(group);
    function floor(y,thickness,material,opening){
      if(!opening){box(w+.28,thickness,d+.3,0,y,0,material,group);return;}
      const core=d<5?2.2:1.3;
      box(w-core,thickness,d+.3,core/2,y,0,material,group);
      box(core+.28,thickness,.55,-w/2+core/2,y,d/2-.13,material,group);
      box(core+.28,thickness,.4,-w/2+core/2,y,-d/2,material,group);
    }
    for(let f=0;f<=floors;f++)floor(f*3,.28,stone,f>0&&f<floors);
    for(let f=0;f<floors;f++){
      const base=f*3;
      floor(base+.17,.045,wood,f>0);
      box(w,2.7,.23,0,base+1.5,-d/2,plaster,group);
      box(.24,2.7,d*.62,-w/2,base+1.5,-d*.19,stone,group);
      for(const s of [-1,1]){
        box(.28,2.75,.28,s*w/2,base+1.5,d/2,frame,group);
        box(.08,2.65,d-.3,s*w/2,base+1.5,0,clear,group);
        box(.3,2.75,.28,s*w/2,base+1.5,-d/2,frame,group);
      }
      const bays=Math.ceil(w/1.45);
      for(let i=0;i<bays;i++){
        const xx=-w/2+(i+.5)*w/bays;
        box(w/bays-.07,2.62,.035,xx,base+1.52,d/2,clear,group);
        box(.065,2.75,.12,xx-w/bays/2,base+1.5,d/2,frame,group);
        if(i%3===0)box(w/bays-.07,.42,.05,xx,base+2.63,d/2+.06,glass[(f+i)%6],group);
      }
      box(w,.1,.12,0,base+2.83,d/2,frame,group);
      box(w*.37,2.7,.15,w*.25,base+1.5,-d*.2,plaster,group);
      lounge(-w*.2,base+.17,d*.03,group);
      box(w*.32,.42,1.8,w*.28,base+.4,-d*.26,fabric,group);
      box(w-.5,.035,.055,0,base+2.82,d/2-.3,warm,group);
      const light=new THREE.PointLight('#ffd49a',7,7,2);light.position.set(0,base+2.6,0);group.add(light);lights.push(light);
      // A compact internal flight joins consecutive floor levels.
      if(f<floors-1){
        if(d>=5){
          const flight=stair(-w/2+.65,d/2-.6,1,3,d-1,18,group);flight.position.y=base+.15;
        }else{
          const first=stair(-w/2+.6,d/2-.65,.9,1.5,d-1.1,9,group);first.position.y=base+.15;
          const second=stair(0,0,.9,1.5,d-1.1,9,group);second.position.set(-w/2+1.6,base+1.65,-d/2+.45);second.rotation.y=Math.PI;
          box(2,.15,.55,-w/2+1.1,base+1.65,-d/2+.25,stone,group);
        }
      }
    }
    return group;
  }
  // Continuous terrain and a walled garden replace the tabletop plinth.
  const ground=box(280,.4,280,0,-.4,0,grass);ground.name='terrain';
  box(34,.18,27,0,-.1,-1,paving);
  for(let i=0;i<18;i++)for(let j=0;j<13;j++){box(1.84,.025,1.84,-16+i*1.87,.008,-13+j*1.87,paving);}
  const asphalt=mat('asphalt','#4d5553');box(90,.05,7,0,-.1,18.5,asphalt);
  for(let i=-12;i<=12;i++)box(1.5,.01,.1,i*3,.0,18.5,plaster);
  box(90,.12,1.4,0,-.04,14.45,stone);box(90,.12,1.4,0,-.04,22.5,stone);
  for(const s of [-1,1]){box(.5,1.4,27,s*17,.6,-1,stone);box(.68,.16,27,s*17,1.35,-1,plaster);}
  box(34,1.4,.5,0,.6,-14.5,stone);
  for(const s of [-1,1]){box(13.4,1.25,.48,s*10.3,.53,12.5,stone);box(13.6,.15,.65,s*10.3,1.2,12.5,plaster);box(.8,2,.8,s*3.4,1,12.5,stone);}
  // An open entrance gate preserves vehicle and pedestrian access.
  for(const s of [-1,1]){for(let i=0;i<15;i++)box(.045,1.5,.055,s*3.5,1,11.9-i*.2,frame);box(.08,.06,3,s*3.5,1.75,10.5,bronze);}
  const main=roomBuilding(-1.5,-4,8.4,6.6,3);
  for(const s of [-1,1]){
    const slope=box(9.2,.18,4.35,0,10.35,s*1.76,roof,main);slope.rotation.x=s*.56;
    for(let i=0;i<11;i++)box(.03,.07,4.25,-4.4+i*.88,.13,0,bronze,slope);
    for(let i=0;i<5;i++)box(9,.025,.035,0,.13,-2+i,frame,slope);
    triangle([s*4.21,9,-3.3],[s*4.21,9,3.3],[s*4.21,11.55,0],0,main);
    box(9.1,.12,.14,0,9.12,s*3.56,frame,main);
  }
  for(let i=0;i<4;i++)pyramid(-3.2+i*2.1,11.6,0,2,1.7,2,i,main);
  pyramid(0,12.95,0,1.65,2.2,1.65,2,main);
  // Full-width front balconies and load-bearing pillars.
  for(const y of [3.22,6.22]){
    box(9.3,.25,2.05,-1.5,y,.13,stone,architecture);box(9,.04,1.85,-1.5,y+.15,.13,wood,architecture);
    rail([-6.15,1.16],[3.15,1.16],y+.15);rail([-6.15,-.85],[-6.15,1.16],y+.15);rail([3.15,-.85],[3.15,1.16],y+.15);
  }
  for(const x of [-5.85,2.85])box(.24,6.3,.24,x,3.15,.65,frame,architecture);
  box(3.2,.22,2.1,-1.5,2.9,.3,stone,architecture);stair(-1.5,2.2,3,.22,1.4,2);
  for(const s of [-1,1]){box(1.16,2.55,.06,-1.5+s*.62,1.5,-.64,clear,architecture);box(.04,2.55,.1,-1.5+s*1.22,1.5,-.59,frame,architecture);box(.04,.45,.06,-1.5+s*.12,1.48,-.52,bronze,architecture);}
  // Left tower: real stone base and rooms beneath a coloured crystal crown.
  roomBuilding(-8.4,-3,3.2,3.8,2);pyramid(-8.4,6.3,-3,3.6,4.1,4.2,1);pyramid(-8.4,10,-3,2.2,2.1,2.2,3);
  const tower=new THREE.Group();tower.name='star-living-tower';tower.position.set(-8.4,.22,4.7);architecture.add(tower);
  for(let f=0;f<3;f++){
    mesh(new THREE.CylinderGeometry(2.45,2.45,.28,32),stone,0,f*2.8,0,tower);
    if(f===0)mesh(new THREE.CylinderGeometry(2.4,2.4,.72,32),stone,0,.4,0,tower);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,m=a+Math.PI/12;
      const panel=box(1.23,2.5,.045,2.36*Math.cos(m),f*2.8+1.5,2.36*Math.sin(m),clear,tower);panel.rotation.y=-m+Math.PI/2;
      beam([2.44*Math.cos(a),f*2.8,2.44*Math.sin(a)],[2.44*Math.cos(a),(f+1)*2.8,2.44*Math.sin(a)],frame,.05,tower);
    }
    lounge(-.4,f*2.8+.2,-.2,tower);
    const l=new THREE.PointLight('#ffd49a',5,7,2);l.position.set(0,f*2.8+2.5,0);tower.add(l);lights.push(l);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,b=(i+1)*Math.PI/4,m=(a+b)/2;
    const p=[2.45*Math.cos(a),8.4,2.45*Math.sin(a)],q=[2.45*Math.cos(b),8.4,2.45*Math.sin(b)],tip=[3.75*Math.cos(m),7.5,3.75*Math.sin(m)];
    triangle(p,tip,[0,11.7,0],i,tower);triangle(tip,q,[0,11.7,0],i+1,tower);
    triangle(p,tip,[0,6.6,0],i+2,tower);
  }
  mesh(new THREE.CylinderGeometry(2.5,2.5,.18,32),bronze,0,8.25,0,tower);
  // A usable bridge joins the main floor to the tower.
  box(4.3,.28,1.65,-5.75,3.02,3.35,stone,architecture);rail([-7.9,4.17],[-3.6,4.17],3.16);rail([-7.9,2.53],[-3.6,2.53],3.16);
  for(const x of [-7.5,-4.1])box(.23,2.85,.23,x,1.45,3.35,frame,architecture);
  // Continuous sloping right wing, with occupied rooms below its roof.
  for(let i=0;i<3;i++){
    const building=roomBuilding(7.3,-4.4+i*3.5,3.5,3.45,3-i);
    const y=(3-i)*3+.22;
    for(const s of [-1,1])triangle([7.3+s*2,y,-6.1+i*3.5],[7.3+s*2,y-2.6,-2.7+i*3.5],[7.3,y+1.1,-6.1+i*3.5],i+2);
    for(let j=0;j<2;j++)triangle([5.3,y-j*1.3,-6.1+i*3.5+j*1.7],[9.3,y-j*1.3,-6.1+i*3.5+j*1.7],[7.3,y+1.1-(j+1)*1.3,-4.4+i*3.5+j*1.7],i+j);
    beam([5.3,y,-6.1+i*3.5],[5.3,y-2.6,-2.7+i*3.5],bronze,.065);beam([9.3,y,-6.1+i*3.5],[9.3,y-2.6,-2.7+i*3.5],bronze,.065);
  }
  box(3.2,.28,2.1,4.4,6.2,-4,stone,architecture);rail([2.8,-2.95],[6,-2.95],6.34);rail([2.8,-5.05],[6,-5.05],6.34);
  stair(7.3,9.1,3.5,3.22,4.8,20,architecture,true);
  for(const x of [5.55,9.05])box(.22,2.9,.22,x,1.5,3.8,frame,architecture);
  // Rear terraces have real furniture and guardrails.
  box(4,.25,4,12.2,.12,-5,stone);box(3.8,.06,3.8,12.2,.28,-5,wood);lounge(12.2,.32,-6.3,world);
  beam([13.4,.3,-4.2],[13.4,2.8,-4.2],frame,.05);const umbrella=mesh(new THREE.ConeGeometry(1.8,.45,8),fabric,13.4,2.85,-4.2);umbrella.rotation.y=.3;
  // Pool with coping, water and a small cascade.
  box(4.2,.24,8.6,-12.5,.02,2.7,stone);box(3.75,.04,8.15,-12.5,.17,2.7,water);
  box(.45,1.6,2,-13.9,.85,.4,stone);box(.035,1.25,1.35,-13.64,.83,.4,clear);box(.8,.07,2.1,-13.7,1.67,.4,stone);
  // Arrival court and a planted circular island.
  mesh(new THREE.CylinderGeometry(2.45,2.6,.3,64),stone,.8,.1,7.3);mesh(new THREE.CylinderGeometry(2.25,2.25,.07,64),grass,.8,.3,7.3);
  const poolRim=mesh(new THREE.TorusGeometry(1.22,.12,8,48),stone,.8,.35,7.3);poolRim.rotation.x=Math.PI/2;mesh(new THREE.CylinderGeometry(1.1,1.1,.02,48),water,.8,.37,7.3);
  pyramid(.8,.4,7.3,1.1,1.7,1.1,0);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;triangle([.8,2.1,7.3],[.8+1.4*Math.cos(a),1.2,7.3+1.4*Math.sin(a)],[.8, .65,7.3],i);}
  // Deterministic instanced foliage keeps the landscape detailed at low draw cost.
  let seed=1527;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  const leaves=[],shrubs=[];const bark=mat('bark','#645441');
  function tree(x,z,s=1){
    beam([x,0,z],[x+.1*s,3.5*s,z],bark,.13*s);
    for(let k=0;k<7;k++){const a=k*2.4;beam([x,1.5*s+k*.2*s,z],[x+Math.cos(a)*1.2*s,(3+k*.11)*s,z+Math.sin(a)*1.2*s],bark,.05*s);}
    for(let i=0;i<120;i++){const a=random()*6.28,r=Math.cbrt(random())*1.65*s,t=random()*2-1;leaves.push([x+Math.cos(a)*r*Math.sqrt(1-t*t),3.5*s+t*r*.85,z+Math.sin(a)*r*Math.sqrt(1-t*t),(.3+random()*.35)*s,random()]);}
  }
  [[.8,7.3,.65],[-14,-9,1],[-13,8,1],[-5,9,.8],[12.7,7,1.1],[13,-.4,.8],[-3,-11,1],[5,-11,1],[12,-10,.85]].forEach(p=>tree(...p));
  for(let i=0;i<45;i++){const angle=random()*6.28,r=25+random()*30;tree(Math.cos(angle)*r,Math.sin(angle)*r-16,1.5+random()*1.8);}
  for(let i=0;i<55;i++){const z=-13+i*.45;shrubs.push([-15.8,.5,z,.6,random()]);shrubs.push([15.8,.5,z,.6,random()]);}
  for(let i=0;i<28;i++){const x=-15+i*1.1;if(Math.abs(x)>4.5)shrubs.push([x,.4,11.5,.6,random()]);}
  function foliage(points,name){const material=mat(name,'#617d36',{roughness:.95});const inst=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material,points.length);const dummy=new THREE.Object3D();points.forEach(([x,y,z,s,r],i)=>{dummy.position.set(x,y,z);dummy.scale.set(s,s*.7,s*.8);dummy.rotation.set(r*4,r*7,r*3);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,new THREE.Color().setHSL(.21+r*.055,.24+r*.2,.19+r*.17));});inst.castShadow=true;inst.receiveShadow=true;world.add(inst);}
  foliage(leaves,'foliage');foliage(shrubs,'hedges');
  for(let i=0;i<16;i++){const a=i*6.28/16;const x=.8+2.1*Math.cos(a),z=7.3+2.1*Math.sin(a);mesh(new THREE.SphereGeometry(.09,6,4),i%2?fabric:glass[1],x,.58,z);}
  // Lamps actually illuminate nearby surfaces at night.
  for(const [x,z] of [[-3.4,12.5],[3.4,12.5],[-12,8],[12,8],[-12,-8],[12,-8],[-3,4],[4,2]]){
    const y=Math.abs(z-12.5)<.1?2.2:.9;box(.15,y,.15,x,y/2,z,frame);box(.24,.32,.24,x,y+.13,z,warm);box(.32,.06,.32,x,y+.33,z,frame);
    const light=new THREE.PointLight('#ffcf8a',.4,5,2);light.position.set(x,y+.2,z);world.add(light);lights.push(light);
  }
  function car(x,z,color,angle){
    const group=new THREE.Group();group.position.set(x,.18,z);group.rotation.y=angle;world.add(group);const paint=mat('car'+color,color,{metalness:.65,roughness:.22});
    box(1.65,.45,3.7,0,.45,0,paint,group);box(1.48,.62,1.9,0,.95,-.15,roof,group);box(1.47,.055,1.85,0,1.28,-.15,paint,group);
    for(const sx of [-1,1])for(const sz of [-1,1]){const wheel=mesh(new THREE.CylinderGeometry(.34,.34,.21,24),frame,sx*.8,.34,sz*1.15,group);wheel.rotation.z=Math.PI/2;const hub=mesh(new THREE.CylinderGeometry(.22,.22,.23,16),bronze,sx*.82,.34,sz*1.15,group);hub.rotation.z=Math.PI/2;}
    for(const s of [-1,1])box(.42,.11,.045,s*.49,.6,1.88,warm,group);
  }
  car(-3.5,7.3,'#e3e1d7',.4);car(3.1,3.2,'#252c2e',Math.PI);car(11,18.6,'#964735',Math.PI/2);
  return {world,architecture,glass,warm,lights,stairs,materials};
}
