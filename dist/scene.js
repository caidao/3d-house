import * as THREE from './vendor/three.module.js';

// All dimensions are in metres. The model depicts rooms, floors and circulation,
// while retaining the child's coloured glazing and asymmetric roof silhouettes.
export function buildWorld(textures = {}) {
  const world=new THREE.Group();world.name='residence';
  const architecture=new THREE.Group();architecture.name='architecture';world.add(architecture);
  const materials={};
  function mat(name,color,extra={}){return materials[name]=new THREE.MeshStandardMaterial({color,roughness:.7,...extra,...textures[name]});}
  const stone=mat('stone','#b9b6aa'),plaster=mat('plaster','#a29172'),wood=mat('wood','#d8b28a');
  const paving=mat('paving','#e1dbcf',{roughness:.87}),grass=mat('grass','#697b45');
  const frame=mat('frame','#282e2a',{metalness:.7,roughness:.3}),bronze=mat('bronze','#dbad2e',{metalness:.5,roughness:.24});
  const roof=mat('roof','#26383f',{metalness:.5,roughness:.24}),fabric=mat('fabric','#e2d7bd');
  const warm=mat('warm','#ffe2aa',{emissive:'#ffd18c',emissiveIntensity:.7});
  const glass=['#edbc21','#e23657','#39b771','#59a7c6','#ad5fac','#eb8733'].map(color=>new THREE.MeshPhysicalMaterial({color,roughness:.11,metalness:0,transparent:true,opacity:.78,transmission:0,thickness:.12,ior:1.48,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,envMapIntensity:1.5}));
  const clear=new THREE.MeshPhysicalMaterial({color:'#e0edf0',metalness:0,roughness:.025,transparent:true,opacity:.12,transmission:0,thickness:.04,ior:1.5,side:THREE.DoubleSide,depthWrite:false,clearcoat:1,envMapIntensity:1.1});
  const water=new THREE.MeshPhysicalMaterial({color:'#378f9c',metalness:.45,roughness:.12,clearcoat:1});
  const lights=[],stairs=[];
  const edgeColors=glass.map((m,i)=>mat('edge'+i,m.color,{metalness:.45,roughness:.24}));
  function mesh(g,m,x=0,y=0,z=0,parent=world){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,x,y,z,m=stone,parent=world){
    const g=new THREE.BoxGeometry(w,h,d);
    if(m.map){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i)+z:p.getX(i)+x)/2,(ny>.5?p.getZ(i)+z:p.getY(i)+y)/2);}}
    return mesh(g,m,x,y,z,parent);
  }
  function beam(a,b,m=frame,r=.045,parent=world){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,...p.add(q).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function triangle(a,b,c,color,parent=architecture){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();mesh(g,glass[color%6],0,0,0,parent);for(const [p,q] of [[a,b],[b,c],[c,a]])beam(p,q,edgeColors[color%6],.07,parent);for(const p of [a,b,c])mesh(new THREE.SphereGeometry(.095,8,6),bronze,...p,parent);}
  function pyramid(x,y,z,w,h,d,color,parent=architecture){const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];for(let i=0;i<4;i++)triangle(p[i],p[(i+1)%4],[x,y+h,z],color+i,parent);}
  function rail(a,b,y,parent=architecture){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/1.2);
    beam([a[0],y+1.03,a[1]],[b[0],y+1.03,b[1]],frame,.035,parent);
    for(let i=0;i<=count;i++){const t=i/count;beam([a[0]+(b[0]-a[0])*t,y,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*t,y+1.03,a[1]+(b[1]-a[1])*t],frame,.026,parent);}
    const panel=box(length,.89,.035,(a[0]+b[0])/2,y+.5,(a[1]+b[1])/2,clear,parent);panel.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
  }
  function stair(x,z,width,rise,run,count,parent=architecture,colorful=false){
    const group=new THREE.Group();group.name='continuous-stair';parent.add(group);stairs.push({rise,run,count,width});
    for(let i=0;i<count;i++){const y=(i+1)*rise/count;if(colorful){box(width,.14,run/count+.02,x,y-.07,z-i*run/count,glass[i%6],group);box(width,rise/count,.045,x,y-rise/count/2,z-i*run/count+run/count/2,glass[i%6],group);}else{box(width,y,run/count+.02,x,y/2,z-i*run/count,stone,group);box(width,.035,run/count,x,y+.02,z-i*run/count,paving,group);}}
    if(colorful)for(const side of [-1,1])beam([x+side*width*.43,.13,z],[x+side*width*.43,rise-.14,z-run+run/count],frame,.12,group);
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
      box(w,.5,.23,0,base+.42,-d/2,stone,group);box(w,2.1,.04,0,base+1.72,-d/2,clear,group);for(let i=0;i<4;i++)box(.07,2.7,.1,-w/2+i*w/3,base+1.5,-d/2,frame,group);
      box(.24,.55,d*.62,-w/2,base+.45,-d*.19,stone,group);
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
        box(w/bays-.07,.42,.05,xx,base+2.63,d/2+.06,glass[(f+i)%6],group);if(i%2===0){box(.14,2.75,.14,xx-w/bays/2,base+1.5,d/2+.06,edgeColors[(f+i)%6],group);}
      }
      box(w,.1,.12,0,base+2.83,d/2,frame,group);
      box(w*.2,2.3,.12,w*.25,base+1.35,-d*.28,wood,group);
      lounge(-w*.2,base+.17,d*.03,group);
      mesh(new THREE.CylinderGeometry(.55,.55,.08,24),wood,w*.28,base+.91,d*.18,group);beam([w*.28,base+.18,d*.18],[w*.28,base+.87,d*.18],frame,.06,group);for(const side of [-1,1]){box(.5,.09,.48,w*.28+side*.74,base+.65,d*.18,fabric,group);box(.08,.6,.48,w*.28+side*.95,base+.83,d*.18,wood,group);}
      box(w*.32,.42,1.8,w*.28,base+.4,-d*.26,fabric,group);
      box(w-.5,.035,.055,0,base+2.82,d/2-.3,warm,group);
      const light=new THREE.PointLight('#ffc77b',55,8,2);light.position.set(0,base+2.6,0);group.add(light);lights.push(light);
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
  for(const s of [-1,1]){if(s<0){box(13.4,1.25,.48,-10.3,.53,12.5,stone);box(13.6,.15,.65,-10.3,1.2,12.5,plaster);}else{box(7.1,1.25,.48,7.15,.53,12.5,stone);box(7.25,.15,.65,7.15,1.2,12.5,plaster);}box(.8,2,.8,s*3.4,1,12.5,stone);}
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
  for(let level=0;level<3;level++){
    const y=6.4+level*2.3,x=2.15,z=-.48;
    box(1.7,.13,1.4,x,y,z,bronze,architecture);
    triangle([x-.85,y,z+.72],[x+.85,y,z+.72],[x,y+2.25,z+.72],level+1);
    triangle([x+.85,y,z-.7],[x+.85,y,z+.7],[x+1.8,y+1.1,z],level+2);
    for(const s of [-1,1])beam([x+s*.85,y,z+.72],[x+s*.85,y+2.3,z+.72],edgeColors[1],.065);
  }
  pyramid(2.15,13.3,-.48,1.85,1.75,1.65,0);
  // Full-width front balconies and load-bearing pillars.
  for(const y of [3.22,6.22]){
    box(9.3,.25,2.05,-1.5,y,.13,stone,architecture);box(9,.04,1.85,-1.5,y+.15,.13,wood,architecture);
    rail([-6.15,1.16],[3.15,1.16],y+.15);rail([-6.15,-.85],[-6.15,1.16],y+.15);rail([3.15,-.85],[3.15,1.16],y+.15);
  }
  for(const x of [-5.85,2.85])box(.24,6.3,.24,x,3.15,.65,frame,architecture);
  box(3.2,.22,2.1,-1.5,2.9,.3,stone,architecture);stair(-1.5,2.2,3,.22,1.4,2);
  for(const s of [-1,1]){box(1.16,2.55,.06,-1.5+s*.62,1.5,-.64,clear,architecture);box(.04,2.55,.1,-1.5+s*1.22,1.5,-.59,frame,architecture);box(.04,.45,.06,-1.5+s*.12,1.48,-.52,bronze,architecture);}
  // Left tower: real stone base and rooms beneath a coloured crystal crown.
  roomBuilding(-10,-3.5,3.2,3.8,3);pyramid(-10,9.3,-3.5,3.6,3.4,4.2,1);pyramid(-10,12.6,-3.5,2.2,1.8,2.2,0);
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
    const l=new THREE.PointLight('#ffc77b',45,8,2);l.position.set(0,f*2.8+2.5,0);tower.add(l);lights.push(l);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,b=(i+1)*Math.PI/4,m=(a+b)/2;
    const p=[2.45*Math.cos(a),8.4,2.45*Math.sin(a)],q=[2.45*Math.cos(b),8.4,2.45*Math.sin(b)],tip=[4.65*Math.cos(m),7.45,4.65*Math.sin(m)];
    triangle(p,tip,[0,11.7,0],i,tower);triangle(tip,q,[0,11.7,0],i+1,tower);
    triangle(p,tip,[0,6.6,0],i+2,tower);
  }
  mesh(new THREE.CylinderGeometry(2.5,2.5,.18,32),bronze,0,8.25,0,tower);pyramid(-.4,11.65,0,1.3,1.6,1.3,0,tower);pyramid(.6,11.65,.25,1.2,1.3,1.2,3,tower);
  // Curved glass wings are the recognisable lower half of the star tower.
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.position.set(side*2.05,6.8,0);wing.rotation.z=side*.08;tower.add(wing);
    const curve=[];for(let i=0;i<=32;i++){const a=i*Math.PI/32;curve.push([side*Math.sin(a)*1.9,-Math.cos(a)*1.1,0]);}
    for(let i=1;i<curve.length;i++)beam(curve[i-1],curve[i],frame,.065,wing);
    const g=new THREE.CircleGeometry(1.75,48,0,Math.PI);const pane=mesh(g,clear,0,0,0,wing);pane.rotation.z=side<0?Math.PI/2:-Math.PI/2;pane.scale.y=.7;
    for(let i=0;i<5;i++){const a=(i+.5)*Math.PI/5;beam([0,0,0],[side*Math.sin(a)*1.9,-Math.cos(a)*1.1,0],frame,.035,wing);}
  }
  for(const y of [3.22,6.22]){
    box(3.3,.22,1.65,-6.4,y,-2.7,stone,architecture);rail([-8.05,-1.88],[-4.75,-1.88],y+.12);rail([-8.05,-3.52],[-4.75,-3.52],y+.12);
  }
  // A usable bridge joins the main floor to the tower.
  box(4.3,.28,1.65,-5.75,3.02,3.35,stone,architecture);rail([-7.9,4.17],[-3.6,4.17],3.16);rail([-7.9,2.53],[-3.6,2.53],3.16);
  for(const x of [-7.5,-4.1])box(.23,2.85,.23,x,1.45,3.35,frame,architecture);
  // One continuous glazed gallery, descending through five connected bays.
  const gallery=new THREE.Group();gallery.name='sloped-gallery';gallery.rotation.y=.5;gallery.position.set(1.3,0,5);architecture.add(gallery);
  const gx=7.4,half=2.65,startZ=-5.3,bay=2.65;
  function quad(a,b,c,d,material,parent=gallery){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));g.computeVertexNormals();return mesh(g,material,0,0,0,parent);}
  for(let i=0;i<5;i++){
    const z=startZ+i*bay,y=12.5-i*1.42,nextY=y-1.42,deck=nextY-2.4;
    const section=new THREE.Group();section.name='gallery-room';gallery.add(section);
    const a=[gx-half,y,z],b=[gx+half,y,z],c=[gx+half,nextY,z+bay],d=[gx-half,nextY,z+bay];
    quad(a,b,c,d,clear,section);
    for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])beam(p,q,frame,.075,section);
    triangle(a,d,[gx-half+1.45,(y+nextY)/2+.03,z+bay/2],i,section);
    triangle(b,c,[gx+half-1.45,(y+nextY)/2+.03,z+bay/2],i+2,section);
    for(const side of [-1,1]){
      const x=gx+side*half;
      quad([x,.3,z],[x,.3,z+bay],[x,nextY,z+bay],[x,y,z],clear,section);
      beam([x,.22,z],[x,y,z],frame,.085,section);
      beam([x,.22,z+bay],[x,nextY,z+bay],frame,.085,section);
      triangle([x,y,z],[x,nextY,z+bay],[x,y-1.5,z],i+(side+1),section);
      for(const floor of [3.22,6.22])if(y>floor+1.7)beam([x,floor,z],[x,floor,z+bay],frame,.075,section);
    }
    box(5.3,.25,bay-.03,gx,.18,z+bay/2,stone,section);
    for(const floor of [.35,3.22,6.22])if(deck>floor+2.2){
      box(5.3,.18,bay-.03,gx,floor,z+bay/2,stone,section);box(5.1,.04,bay-.12,gx,floor+.11,z+bay/2,wood,section);
      lounge(gx+.25,floor+.14,z+.5,section);
      for(const side of [-1,1])beam([gx+side*half,floor,z],[gx+side*half,floor,z+bay],frame,.07,section);
      box(3.7,.035,.04,gx+.4,floor+2.3,z+.12,warm,section);
    }
    box(3.85,.2,bay-.03,gx+.6,deck,z+bay/2,stone,section);box(3.75,.04,bay-.12,gx+.6,deck+.13,z+bay/2,wood,section);
    lounge(gx+.5,deck+.15,z+.5,section);
    box(3.7,.035,.045,gx+.6,deck+2.3,z+.12,warm,section);
    const lamp=new THREE.PointLight('#ffc77b',45,7,2);lamp.position.set(gx,deck+1.8,z+bay/2);section.add(lamp);lights.push(lamp);
  }
  // A genuine stair flight runs the full length along the gallery's western edge.
  const galleryFlight=stair(gx-half+.6,startZ+5*bay-.2,1,5.68,12.4,42,gallery);galleryFlight.position.y=3;
  stair(gx,startZ+5*bay+4.3,5.3,3,4.5,18,gallery,true);
  box(3.25,.28,2.1,4.25,6.2,-4,stone,architecture);rail([2.6,-2.95],[5.9,-2.95],6.34);rail([2.6,-5.05],[5.9,-5.05],6.34);
  // A coloured observation bubble at the connection to the main house.
  const bubble=mesh(new THREE.SphereGeometry(.9,32,24),glass[2],3.9,4.9,.8,architecture);bubble.scale.set(1,1.1,1);
  for(const y of [4.35,5.4]){const ring=mesh(new THREE.TorusGeometry(.82,.04,8,48),edgeColors[2],3.9,y,.8,architecture);ring.rotation.x=Math.PI/2;}
  function crane(x,y,z){
    mesh(new THREE.CylinderGeometry(.3,.4,.24,16),edgeColors[0],x,y,z,architecture);
    beam([x,y,z],[x,y+1.45,z],edgeColors[0],.095,architecture);
    beam([x,y+1.45,z],[x+.9,y+2.35,z],edgeColors[0],.07,architecture);
    beam([x+.9,y+2.35,z],[x+1.9,y+2.2,z],edgeColors[0],.06,architecture);
    beam([x+1.9,y+2.2,z],[x+1.9,y+1.35,z],frame,.018,architecture);
    mesh(new THREE.TorusGeometry(.1,.025,8,16,Math.PI*1.5),edgeColors[0],x+1.9,y+1.3,z,architecture);
  }
  crane(1.15,3.55,1.15);crane(9,4,3.4);
  // Rear terraces have real furniture and guardrails.
  box(4,.25,4,12.2,.12,-5,stone);box(3.8,.06,3.8,12.2,.28,-5,wood);lounge(12.2,.32,-6.3,world);
  beam([13.4,.3,-4.2],[13.4,2.8,-4.2],frame,.05);const umbrella=mesh(new THREE.ConeGeometry(1.8,.45,8),fabric,13.4,2.85,-4.2);umbrella.rotation.y=.3;
  // Pool with coping, water and a small cascade.
  box(4.2,.24,8.6,-12.5,.02,2.7,stone);box(3.75,.04,8.15,-12.5,.17,2.7,water);
  box(.45,1.6,2,-13.9,.85,.4,stone);box(.035,1.25,1.35,-13.64,.83,.4,clear);box(.8,.07,2.1,-13.7,1.67,.4,stone);
  box(4.9,.22,8.8,13,.04,-1.1,stone);box(4.45,.035,8.35,13,.18,-1.1,water);
  for(let i=0;i<3;i++){
    box(.8,.14,1.8,15.5,.39,-3.5+i*2.2,wood);
    box(.74,.1,1.55,15.5,.52,-3.5+i*2.2,fabric);
    const back=box(.74,.1,.6,15.5,.7,-4.1+i*2.2,fabric);back.rotation.x=.5;
  }
  // The estate sits beside a lake instead of an empty display surface.
  const lakeShape=new THREE.Shape();
  for(let i=0;i<=72;i++){
    const a=i/72*Math.PI*2,r=1+.035*Math.sin(a*7)+.055*Math.cos(a*3);
    const x=40+30*Math.cos(a)*r,z=-43+14*Math.sin(a)*r;
    if(i===0)lakeShape.moveTo(x,z);else lakeShape.lineTo(x,z);
  }
  const lake=mesh(new THREE.ShapeGeometry(lakeShape),water,0,-.12,0);lake.rotation.x=-Math.PI/2;
  lake.scale.y=-1;lake.material.side=THREE.DoubleSide;
  // Arrival court and a planted circular island.
  mesh(new THREE.CylinderGeometry(2.45,2.6,.3,64),stone,.8,.1,7.3);mesh(new THREE.CylinderGeometry(2.25,2.25,.07,64),grass,.8,.3,7.3);
  const poolRim=mesh(new THREE.TorusGeometry(1.22,.12,8,48),stone,.8,.35,7.3);poolRim.rotation.x=Math.PI/2;mesh(new THREE.CylinderGeometry(1.1,1.1,.02,48),water,.8,.37,7.3);
  pyramid(.8,.4,7.3,1.1,1.7,1.1,0);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;triangle([.8,2.1,7.3],[.8+1.4*Math.cos(a),1.2,7.3+1.4*Math.sin(a)],[.8, .65,7.3],i);}
  // Photo-scanned planting is loaded by the renderer; keep the view corridor clear.
  const planting={
    trees:[[-14,-10,5.5],[-13,8,4.2],[-4,-12,5.5],[11,-10,5],[14,5,4.2],[-20,-20,10],[-10,-23,11],[2,-24,10],[15,-23,11],[24,-19,10],[-27,-9,10]],
    shrubs:[],plants:[]
  };
  for(let i=0;i<26;i++){const z=-12+i*.85;planting.shrubs.push([-15.6,z,.65],[15.7,z,.7]);}
  for(let i=0;i<25;i++){const x=-14+i*1.2;if(Math.abs(x)>4.5)planting.shrubs.push([x,11.4,.55]);}
  for(let i=0;i<20;i++){const a=i*Math.PI/10;planting.shrubs.push([.8+2.1*Math.cos(a),7.3+2.1*Math.sin(a),.3]);}
  for(const y of [3.5,6.5])for(const x of [-5.4,-2.7,1.8])planting.plants.push([x,y,.65,.9]);
  for(const [x,z] of [[-3,1],[0,1],[-10,6],[10,7],[11,-4],[-12,-6]])planting.plants.push([x,.2,z,1.3]);
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
  return {world,architecture,glass,warm,lights,stairs,materials,planting};
}
