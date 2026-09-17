import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { solidPanelGeometry } from './geometry.js';

// Exterior geometry is expressed in magnetic-square modules; U is one uniform enlargement.
// Reference: docs/exterior-reference.md and the four original construction photographs.
export function buildWorld(textures={}) {
  const U=2.4,world=new THREE.Group(),architecture=new THREE.Group();
  world.name='magnetic-estate';architecture.name='architecture';world.add(architecture);
  const materials={},lights=[],stairs=[],parts={},roads=[],roadMarks=[];
  function mat(name,color,options={}){return materials[name]=new THREE.MeshStandardMaterial({name,color,roughness:.6,...options,...textures[name]});}
  const palette={red:'#e51836',magenta:'#ea149f',orange:'#f38413',yellow:'#f3d51b',lime:'#91db22',green:'#0bc575',cyan:'#29bedc',blue:'#196389',purple:'#8933be',smoke:'#424c4b',clear:'#d5ece9',silver:'#c3d1d0'};
  const keys=Object.keys(palette);
  const glass=keys.map(k=>new THREE.MeshPhysicalMaterial({name:k,color:k==='silver'?'#d9e1df':'#ffffff',roughness:k==='silver'?.075:.035,metalness:k==='silver'?.16:0,transmission:k==='silver'?.82:1,ior:1.5,thickness:.045,attenuationColor:['clear','silver'].includes(k)?'#ffffff':palette[k],attenuationDistance:['clear','silver'].includes(k)?Infinity:.6,transparent:false,opacity:1,side:THREE.DoubleSide,clearcoat:0,envMapIntensity:1}));
  const glazing=Object.fromEntries(keys.map((k,i)=>[k,glass[i]]));
  const rims=Object.fromEntries(keys.map(k=>[k,mat('rim-'+k,k==='clear'?'#abbebc':palette[k],{metalness:.55,roughness:.33})]));
  const charcoal=mat('charcoal','#252b2b',{metalness:.4,roughness:.35}),asphalt=mat('asphalt','#a6aba9',{roughness:.95});
  const white=mat('white','#eef4ed'),yellow=rims.yellow,red=rims.red,wood=mat('wood','#cdae8a'),fabric=mat('fabric','#efe1c5');
  const plaster=mat('plaster','#dedad0',{roughness:1}),upholstery=mat('upholstery','#79908c',{roughness:1});
  const paving=mat('paving','#d0cec2'),grass=mat('grass','#5c832d',{roughness:1}),warm=mat('warm','#ffdfa1',{emissive:'#ffc976',emissiveIntensity:1.4});
  function group(name,x=0,y=0,z=0,parent=architecture){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);parts[name]=g;return g;}
  function mesh(g,m,x=0,y=0,z=0,parent=architecture){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,x,y,z,m=charcoal,parent=architecture){const rounded=m===fabric||m===upholstery||m===wood||m.name.startsWith('car-');const g=rounded?new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.18):new THREE.BoxGeometry(w,h,d);if(m.map){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)+z:p.getX(i)+x)/2,(Math.abs(n.getY(i))>.5?p.getZ(i)+z:p.getY(i)+y)/2);}return mesh(g,m,x,y,z,parent);}
  function beam(a,b,m=charcoal,r=.065,parent=architecture){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),16),m,...p.add(q).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function frameBar(a,b,normal,material,r,parent){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(start),length=axis.length();axis.normalize();
    const w=r,d=r*.72,c=r*.23;
    const section=[[-w+c,0,-d],[w-c,0,-d],[w,0,-d+c],[w,0,d-c],[w-c,0,d],[-w+c,0,d],[-w,0,d-c],[-w,0,-d+c]];
    const bar=mesh(solidPanelGeometry(section,length),material,...start.add(end).multiplyScalar(.5).toArray(),parent);
    bar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis.clone().cross(normal).normalize(),axis,normal));return bar;
  }
  function surface(vertices,m,parent=architecture){if(m.isMeshPhysicalMaterial)return mesh(solidPanelGeometry(vertices,.045),m,0,0,0,parent);const g=new THREE.BufferGeometry(),p=[];for(let i=1;i<vertices.length-1;i++)p.push(...vertices[0],...vertices[i],...vertices[i+1]);g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(p.flatMap((_,i)=>i%3===0?[p[i]/U,p[i+1]/U]:[]),2));g.computeVertexNormals();return mesh(g,m,0,0,0,parent);}
  function panel(vertices,color,parent=architecture,faceted=false){
    const mid=new THREE.Vector3();vertices.forEach(v=>mid.add(new THREE.Vector3(...v)));mid.divideScalar(vertices.length);
    const planeNormal=new THREE.Vector3(...vertices[1]).sub(new THREE.Vector3(...vertices[0])).cross(new THREE.Vector3(...vertices[2]).sub(new THREE.Vector3(...vertices[0]))).normalize();
    if(faceted){const n=new THREE.Vector3(...vertices[1]).sub(new THREE.Vector3(...vertices[0])).cross(new THREE.Vector3(...vertices[2]).sub(new THREE.Vector3(...vertices[0]))).normalize();const peak=mid.clone().addScaledVector(n,.22*U).toArray();for(let i=0;i<vertices.length;i++)surface([vertices[i],vertices[(i+1)%vertices.length],peak],glazing[color],parent);}
    else surface(vertices,glazing[color],parent);
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length];frameBar(a,b,planeNormal,rims[color],.075,parent);
      for(const t of [.26,.74]){const p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),t),q=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),t+.075);frameBar(p.toArray(),q.toArray(),planeNormal,charcoal,.08,parent);}
      mesh(new THREE.SphereGeometry(.087,8,6),rims[color],...a,parent);
    }
  }
  function triangle(a,b,c,color,parent=architecture){panel([a,b,c],color,parent);}
  function pyramid(x,y,z,w,h,d,colors,parent=architecture){const v=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];for(let i=0;i<4;i++)triangle(v[i],v[(i+1)%4],[x,y+h,z],colors[i%colors.length],parent);}
  function square(x,y,z,size,color,parent=architecture,side=0,faceted=false){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=side;parent.add(g);panel([[-size/2,-size/2,0],[size/2,-size/2,0],[size/2,size/2,0],[-size/2,size/2,0]],color,g,faceted);return g;}
  function arrow(x,y,z,rotation=0,color=white,parent=world,size=1){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);box(.09*size,.014,.8*size,0,0,.14*size,color,g);surface([[.28*size,.01,-.12*size],[0,.01,-.53*size],[-.28*size,.01,-.12*size]],color,g);}
  function roadTile(w,d,x,y,z,parent=architecture,greenArrow=false){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);box(w,.11,d,0,0,0,asphalt,g);for(const s of [-1,1])box(.055,.012,d-.13,s*(w/2-.13),.065,0,white,g);for(let k=0;k<4;k++)box(.055,.013,d*.1,0,.067,-d*.36+k*d*.24,white,g);if(greenArrow)arrow(w*.23,.075,0,0,rims.green,g,.85);return g;}
  function interiorStair(x,y,z,rise,run,parent){
    const count=Math.ceil(rise/.18),width=.95;stairs.push({rise,run,count,width,kind:'interior'});const g=group('internal-flight-'+stairs.length,x,y,z,parent);
    for(let i=0;i<count;i++){const high=(i+1)*rise/count,depth=-i*run/count;box(width,high,run/count,0,high/2,depth,plaster,g);box(width+.03,.045,run/count+.025,0,high+.02,depth,wood,g);if(i%2===0)for(const side of [-1,1])beam([side*.5,high,depth],[side*.5,high+.9,depth],charcoal,.012,g);}
    for(const side of [-1,1])beam([side*.5,1,0],[side*.5,rise+1,-run+run/count],charcoal,.027,g);
  }
  function furnish(x,y,z,parent){
    box(1.8,.4,.78,x,y+.28,z,wood,parent);box(.83,.2,.7,x-.435,y+.58,z,fabric,parent);box(.83,.2,.7,x+.435,y+.58,z,fabric,parent);box(1.8,.6,.15,x,y+.7,z-.34,fabric,parent);
    for(const s of [-1,1])box(.13,.42,.76,x+s*.84,y+.51,z,fabric,parent);
    for(const side of [-1,1])beam([x+side*.79,y+.665,z-.27],[x+side*.79,y+.665,z+.27],fabric,.012,parent);box(.95,.07,.55,x,y+.45,z+1,wood,parent);for(const s of [-1,1])box(.045,.42,.4,x+s*.37,y+.21,z+1,charcoal,parent);
  }
  function mainRoom(level,y,w,d,parent){
    // Interior layouts are independent of the preserved magnetic exterior modules.
    box(w*.48,U-.2,.13,w*.15,y+U/2,-d*.24,plaster,parent);
    if(level===3){
      box(2.05,.34,2.35,.8,y+.3,.25,wood,parent);box(1.98,.26,2.24,.8,y+.59,.25,fabric,parent);box(2.1,1.02,.16,.8,y+.77,-.98,upholstery,parent);
      for(const x of [.31,1.29])box(.83,.17,.49,x,y+.8,-.46,fabric,parent);
      box(2.0,.065,1.42,.8,y+.75,.62,upholstery,parent);
      for(const x of [-.75,2.35]){box(.55,.49,.55,x,y+.34,-.47,wood,parent);mesh(new THREE.CylinderGeometry(.09,.14,.21,16),charcoal,x,y+.72,-.47,parent);mesh(new THREE.ConeGeometry(.19,.3,24),fabric,x,y+.96,-.47,parent);}
    }else if(level===2){
      box(2.1,.09,.95,.8,y+.88,.6,wood,parent);for(const x of [-.05,1.65])box(.07,.79,.7,x,y+.44,.6,charcoal,parent);
      box(.57,.13,.58,.75,y+.55,1.43,upholstery,parent);box(.58,.68,.12,.75,y+.83,1.66,upholstery,parent);beam([.75,y+.05,1.43],[.75,y+.55,1.43],charcoal,.04,parent);
      box(1.6,1.95,.34,-1.5,y+1.05,-d*.18,wood,parent);for(let i=0;i<4;i++){box(1.48,.05,.34,-1.5,y+.35+i*.42,-d*.18+.03,fabric,parent);for(let j=0;j<6;j++)box(.09+.02*(j%2),.23+.03*(j%3),.2,-2.06+j*.2,y+.48+i*.42,-d*.18+.06,j%2?upholstery:plaster,parent);}
    }else{
      box(3.4,.015,2.25,-.55,y+.135,.8,upholstery,parent);furnish(-.65,y+.15,.05,parent);
      const tableX=2.25,tableZ=-.1;box(1.5,.075,.85,tableX,y+.86,tableZ,wood,parent);
      for(const side of [-1,1]){box(.055,.73,.7,tableX+side*.59,y+.45,tableZ,charcoal,parent);box(.52,.09,.5,tableX,y+.56,tableZ+side*.79,fabric,parent);box(.5,.54,.08,tableX,y+.83,tableZ+side*1.0,wood,parent);}
    }
  }
  function shell(name,x,z,cols,depth,rows,frontColors,sideColors){
    const g=group(name,x,.16,z),w=cols*U,d=depth*U;g.userData.role='tile-building';
    function slab(y,thickness,material,opening){
      if(!opening){box(w,thickness,d,0,y,0,material,g);return;}
      const core=1.25;box(w-core,thickness,d,core/2,y,0,material,g);
      for(const side of [-1,1])box(core,thickness,.62,-w/2+core/2,y,side*(d-.62)/2,material,g);
    }
    for(let f=0;f<=rows;f++)slab(f*U,.14,charcoal,depth>=2&&f>0&&f<rows);
    for(let f=0;f<rows;f++){
      slab(f*U+.1,.055,wood,depth>=2&&f>0);
      for(let c=0;c<cols;c++){
        const color=frontColors[f][c];square((c-(cols-1)/2)*U,(f+.5)*U,d/2,U,color,g,0,color==='silver');
        const back=frontColors[f][cols-1-c];square((c-(cols-1)/2)*U,(f+.5)*U,-d/2,U,back,g,Math.PI,back==='silver');
      }
      for(let j=0;j<depth;j++)for(const side of [-1,1]){const color=sideColors[f][j];square(side*w/2,(f+.5)*U,(j-(depth-1)/2)*U,U,color,g,side*Math.PI/2,color==='silver');}
      if(cols>=3)mainRoom(f,f*U,w,d,g);else furnish(-w*.18,f*U+.12,0,g);box(w-.35,.025,.035,0,(f+1)*U-.16,d/2-.25,warm,g);
      const l=new THREE.RectAreaLight('#ffd29a',12,Math.max(1,w*.5),Math.max(1,d*.45));l.position.set(0,(f+1)*U-.2,0);l.rotation.x=-Math.PI/2;g.add(l);lights.push(l);
      if(f<rows-1&&depth>=2)interiorStair(-w/2+.65,f*U+.13,d/2-.65,U,d-1.3,g);
    }
    return g;
  }
  // Roads are distinct original features, not landscaping substitutes.
  const terrain=box(46,.1,46,0,-.14,7,grass,world);terrain.name='terrain';
  function road(points,width,name,closed=false){
    const pts=points.map(p=>new THREE.Vector3(p[0],.03,p[1]));
    const curve=new THREE.CatmullRomCurve3(pts,closed,'centripetal'),count=Math.max(60,Math.ceil(curve.getLength()*5));
    const vertices=[],edgeL=[],edgeR=[],samples=[];
    for(let i=0;i<=count;i++){
      const t=i/count,p=curve.getPoint(t),dir=curve.getTangent(t).normalize(),n=new THREE.Vector3(-dir.z,0,dir.x),l=p.clone().addScaledVector(n,width/2),r=p.clone().addScaledVector(n,-width/2);
      edgeL.push(l);edgeR.push(r);samples.push([p.x,p.z]);
      if(i){vertices.push(...edgeL[i-1].toArray(),...edgeR[i-1].toArray(),...r.toArray(),...edgeL[i-1].toArray(),...r.toArray(),...l.toArray());}
      if(i%6===0){const dash=box(.065,.015,.45,p.x,.055,p.z,white,world);dash.rotation.y=Math.atan2(dir.x,dir.z);roadMarks.push({object:dash,name,x:p.x,z:p.z});}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i],vertices[i+2]]:[]),2));geometry.computeVertexNormals();const roadMesh=mesh(geometry,asphalt,0,0,0,world);roadMesh.material.side=THREE.DoubleSide;roadMesh.name=name;
    for(let i=1;i<=count;i++)for(const edge of [edgeL,edgeR]){const line=beam([edge[i-1].x,.055,edge[i-1].z],[edge[i].x,.055,edge[i].z],white,.027,world);roadMarks.push({object:line,name,x:(edge[i-1].x+edge[i].x)/2,z:(edge[i-1].z+edge[i].z)/2});}
    roads.push({name,width,points,closed,samples});
  }
  function roundedLoop(cx,cz,w,d,r,width,name){
    const points=[];for(const [x,z,start] of [[cx+w/2-r,cz+d/2-r,0],[cx-w/2+r,cz+d/2-r,Math.PI/2],[cx-w/2+r,cz-d/2+r,Math.PI],[cx+w/2-r,cz-d/2+r,Math.PI*1.5]])for(let i=0;i<=8;i++){const a=start+i*Math.PI/16;points.push([x+r*Math.cos(a),z+r*Math.sin(a)]);}
    road(points,width,name,true);
  }
  road([[1.8,26],[1.8,21],[1.8,16],[1.8,11],[1.8,7],[2,2],[2,-1.1]],4.8,'entrance-road');
  roundedLoop(1.6,7.8,7.5,3.9,1.8,1.8,'oval-turning-loop');
  roundedLoop(-8,-.5,12.3,12.4,2,2.3,'left-building-loop');
  roundedLoop(9.6,7.9,13,12.3,2.1,2.4,'right-gallery-loop');
  road([[-4.5,-1],[-4.5,2],[-4.5,5.5],[-2.5,7.6]],2.1,'arched-entrance-road');
  road([[-13.5,6],[-13.5,11],[-11.7,14],[-7,14],[-2.5,12.8],[1.8,12.8]],2.1,'front-star-loop');
  // Suppress markings inside a junction so connecting roads remain continuous.
  for(const mark of roadMarks){
    const covered=roads.some(r=>r.name!==mark.name&&r.samples.some((b,i)=>{
      if(!i)return false;const a=r.samples[i-1],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
      const t=length?THREE.MathUtils.clamp(((mark.x-a[0])*dx+(mark.z-a[1])*dz)/length,0,1):0;
      return (mark.x-a[0]-t*dx)**2+(mark.z-a[1]-t*dz)**2<(r.width/2-.07)**2;
    }));
    if(covered){mark.object.removeFromParent();mark.object.geometry.dispose();}
  }
  const ovalMarkings=group('original-oval-road-markings',1.6,.071,7.8,world);
  for(let i=0;i<64;i++){const a=i*Math.PI/32,b=(i+1)*Math.PI/32;beam([2.2*Math.cos(a),0,.72*Math.sin(a)],[2.2*Math.cos(b),0,.72*Math.sin(b)],white,.024,ovalMarkings);}
  for(const z of [15,21.5]){arrow(.65,.07,z,0,white,world,1.7);arrow(2.9,.07,z,Math.PI,white,world,1.7);}
  // Main block: coloured squares and silver faceted pieces follow the visible rows.
  const front=[['red','orange','red','smoke'],['smoke','blue','lime','yellow'],['orange','silver','silver','silver'],['clear','silver','silver','clear']];
  const sides=[['purple','orange','red'],['red','lime','yellow'],['smoke','silver','yellow'],['silver','silver','clear']];
  const main=shell('main-square-tile-house',0,-2*U,4,3,4,front,sides);
  const roofRise=1.4*U,roofRun=1.5*U,slopeLength=Math.hypot(roofRise,roofRun);
  for(const side of [-1,1]){
    const slope=group('road-roof-'+side,0,4*U+roofRise/2,side*roofRun/2,main);slope.rotation.x=side*Math.atan2(roofRise,roofRun);
    for(let row=0;row<2;row++)for(let col=0;col<4;col++)roadTile(U-.025,slopeLength/2-.025,(col-1.5)*U,.02,(row-.5)*slopeLength/2,slope,side===1&&row===1&&col>=2);
  }
  for(const side of [-1,1])triangle([side*2*U,4*U,-1.5*U],[side*2*U,4*U,1.5*U],[side*2*U,4*U+roofRise,0],side<0?'yellow':'red',main);
  const ridge=4*U+roofRise;
  const crown=[['blue','yellow','yellow','smoke'],['yellow','orange','yellow','yellow'],['red','purple','purple','red'],['yellow','yellow','yellow','yellow']];
  for(let i=0;i<4;i++)pyramid((i-1.5)*U,ridge,0,U,.85*U,U,crown[i],main);
  pyramid(.1*U,ridge+.65*U,-.1*U,.8*U,1.35*U,.8*U,['lime','green','yellow','lime'],main);
  // Printed brick and chevron tiles on the upper road balcony.
  function chevrons(x,y,z,w,h,parent=architecture){box(w,h,.075,x,y,z,yellow,parent);for(let i=0;i<3;i++){const cx=x-w*.34+i*w*.34;for(const s of [-1,1]){const v=[[cx-w*.07,y+s*h*.42,z+.05],[cx+w*.08,y,z+.05],[cx+w*.2,y,z+.05],[cx+w*.04,y+s*h*.42,z+.05]];surface(s<0?v.reverse():v,charcoal,parent);}}}
  function brick(x,y,z,w,h,parent=architecture){box(w,h,.085,x,y,z,red,parent);for(let i=0;i<4;i++){box(w-.07,.035,.018,x,y-h*.37+i*h*.25,z+.052,white,parent);for(let j=0;j<3;j++)box(.03,h*.25,.019,x-w*.4+j*w*.4+(i%2)*w*.2,y-h*.375+i*h*.25+h*.12,z+.053,white,parent);}}
  const balcony=group('yellow-black-brick-balcony',0,3*U,-.5*U+.55*U);
  for(let c=0;c<5;c++)roadTile(U,U,(c-2)*U,0,0,balcony);
  brick(-1.75*U,.4*U,.55*U,U*.9,U*.65,balcony);
  for(let c=0;c<3;c++)chevrons((c-.3)*U,.4*U,.55*U,U*.95,U*.65,balcony);
  for(const side of [-1,1]){for(let j=0;j<2;j++)square(side*2.5*U,.35*U,(j-.5)*U*.5,U*.65,'yellow',balcony,side*Math.PI/2);}
  // Tall left tower: tapering red triangular body and the upward-open blue/yellow cap.
  const tall=shell('red-tapered-tower',-3.55*U,-.6*U,1,1,2,[['yellow'],['smoke']],[['green'],['red']]);
  for(let side=0;side<4;side++){
    const a=side*Math.PI/2,b=(side+1)*Math.PI/2;
    const lowA=[1.05*U*Math.cos(a),2*U,1.05*U*Math.sin(a)],lowB=[1.05*U*Math.cos(b),2*U,1.05*U*Math.sin(b)];
    const topA=[.45*U*Math.cos(a),4.35*U,.45*U*Math.sin(a)],topB=[.45*U*Math.cos(b),4.35*U,.45*U*Math.sin(b)];
    triangle(lowA,lowB,topA,side%2?'smoke':'red',tall);triangle(lowB,topB,topA,'red',tall);
    triangle([0,4.2*U,0],[.95*U*Math.cos(a),5.25*U,.95*U*Math.sin(a)],[.95*U*Math.cos(b),5.25*U,.95*U*Math.sin(b)],['blue','yellow','blue','yellow'][side],tall);
  }
  // Smaller circular turret retains its triangular red walls and yellow cap.
  const turret=shell('yellow-capped-small-turret',-4.2*U,1.5*U,1,1,1,[['smoke']],[['purple']]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;triangle([.52*U*Math.cos(a),U,.52*U*Math.sin(a)],[.9*U*Math.cos(a),3*U,.9*U*Math.sin(a)],[.9*U*Math.cos(b),3*U,.9*U*Math.sin(b)],i%2?'red':'smoke',turret);}
  const turretRing=mesh(new THREE.TorusGeometry(.94*U,.07,8,48),charcoal,0,3*U,0,turret);turretRing.rotation.x=Math.PI/2;
  const turretRoad=mesh(new THREE.RingGeometry(.72*U,1.04*U,64),asphalt,0,3*U+.03,0,turret);turretRoad.rotation.x=-Math.PI/2;const turretEdge=mesh(new THREE.RingGeometry(1.005*U,1.025*U,64),white,0,3*U+.04,0,turret);turretEdge.rotation.x=-Math.PI/2;for(let i=0;i<24;i++){const a=i*Math.PI/12;const dash=box(.04,.012,.18,Math.cos(a)*.9*U,3*U+.05,Math.sin(a)*.9*U,white,turret);dash.rotation.y=-a;}
  pyramid(0,3*U,0,1.7*U,.8*U,1.7*U,['yellow','yellow','smoke','yellow'],turret);
  // Green magnetic-square portal with the original dark half-cylinder road arch.
  const portal=group('green-arched-portal',-1.9*U,.16,1.4*U);
  for(const side of [-1,1])for(let f=0;f<2;f++)square(side*.65*U,(f+.5)*U,0,U*.62,'green',portal,0);
  for(const side of [-1,1])beam([side*.78*U,0,0],[side*.78*U,2*U,0],rims.lime,.09,portal);
  function barrel(parent,r,y,depth){
    for(let i=0;i<24;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;const v=[[-r*Math.cos(a),y+r*Math.sin(a),-depth/2],[-r*Math.cos(b),y+r*Math.sin(b),-depth/2],[-r*Math.cos(b),y+r*Math.sin(b),depth/2],[-r*Math.cos(a),y+r*Math.sin(a),depth/2]];surface(v,glazing.smoke,parent);for(const z of [-depth/2,depth/2])beam([-r*Math.cos(a),y+r*Math.sin(a),z],[-r*Math.cos(b),y+r*Math.sin(b),z],charcoal,.07,parent);}
    for(let i=0;i<=4;i++){const a=i*Math.PI/4;beam([-r*Math.cos(a),y+r*Math.sin(a),-depth/2],[-r*Math.cos(a),y+r*Math.sin(a),depth/2],charcoal,.055,parent);}
  }
  barrel(portal,.87*U,2*U,.9*U);
  // The foreground star uses the child's radiating long triangles and curved road pieces.
  const star=shell('radial-star-tower',-3.55*U,4.8*U,2,2,2,[['orange','red'],['smoke','clear']],[['purple','orange'],['clear','smoke']]);
  const corners=[[-U,3*U,-U],[U,3*U,-U],[U,3*U,U],[-U,3*U,U]];
  for(let i=0;i<4;i++){
    const a=corners[i],b=corners[(i+1)%4],mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),tip=[mid.x*2.2,2.6*U,mid.z*2.2];
    triangle(a,b,[0,4.75*U,0],['orange','red','clear','red'][i],star);
    triangle(a,b,tip,['yellow','red','cyan','green'][i],star);
    triangle(a,b,[0,1.7*U,0],['red','red','red','smoke'][i],star);
  }
  for(const side of [-1,1]){
    const arc=group('star-quarter-road-'+side,side*U,2.75*U,U+.025,star);
    const r=1.15*U;for(let i=0;i<24;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;surface([[0,0,0],[side*r*Math.sin(a),-r*.7*Math.cos(a),0],[side*r*Math.sin(b),-r*.7*Math.cos(b),0]],glazing.smoke,arc);beam([side*r*Math.sin(a),-r*.7*Math.cos(a),0],[side*r*Math.sin(b),-r*.7*Math.cos(b),0],charcoal,.08,arc);for(const k of [.88,.68])if(k===.88||i%3!==0)beam([side*r*k*Math.sin(a),-r*.7*k*Math.cos(a),.035],[side*r*k*Math.sin(b),-r*.7*k*Math.cos(b),.035],white,.022,arc);}
    for(let i=0;i<5;i++){const a=(i+.2)*Math.PI/5;beam([0,0,.02],[side*r*Math.sin(a),-r*.7*Math.cos(a),.02],charcoal,.045,arc);}
  }
  pyramid(-.25*U,4.7*U,0,.7*U,.8*U,.7*U,['yellow','yellow','blue','yellow'],star);
  // Stepped annex: separate square bays and silver four-facet roof pieces, not one sloped glass plane.
  const annexSpecs=[{x:3.1,z:.55,h:3,colors:[['red','yellow'],['cyan','silver'],['silver','clear']]},{x:4.35,z:2.05,h:2,colors:[['purple','orange'],['silver','silver']]},{x:5.6,z:3.55,h:1,colors:[['orange','purple']]}];
  const annex=[];
  for(let i=0;i<annexSpecs.length;i++){
    const a=annexSpecs[i],g=shell('stepped-annex-'+i,a.x*U,a.z*U,2,2,a.h,a.colors,a.colors);annex.push(g);
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){const x=(col-.5)*U,z=(row-.5)*U,y=a.h*U+.09;panel([[x-U/2,y,z-U/2],[x-U/2,y,z+U/2],[x+U/2,y,z+U/2],[x+U/2,y,z-U/2]],'silver',g,true);}
    for(let j=0;j<2;j++)for(const side of [-1,1])triangle([side*U,a.h*U,(j-1)*U],[side*U,a.h*U,j*U],[side*U,a.h*U+.75*U,(j-.5)*U],['yellow','lime','magenta','yellow'][(j+(side+1)+i)%4],g);
  }
  function bridge(a,b,w,name){const g=group(name);const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av),n=new THREE.Vector3(-dir.z,0,dir.x).normalize().multiplyScalar(w/2);const verts=[av.clone().add(n).toArray(),bv.clone().add(n).toArray(),bv.clone().sub(n).toArray(),av.clone().sub(n).toArray()];panel(verts,'clear',g);for(const side of [-1,1]){const p=av.clone().addScaledVector(n,side),q=bv.clone().addScaledVector(n,side);triangle(p.toArray(),q.toArray(),p.clone().lerp(q,.5).add(new THREE.Vector3(0,U*.55,0)).toArray(),side<0?'lime':'yellow',g);}return g;}
  bridge([2.1*U,3*U,-.1*U],[3.1*U,3*U,.55*U],U,'upper-triangle-link');
  bridge([3.2*U,3*U,1.5*U],[4.35*U,2*U,2.05*U],1.5*U,'descending-link-one');
  bridge([4.45*U,2*U,3*U],[5.6*U,U,3.55*U],1.5*U,'descending-link-two');
  // Two joined stair modules: retain the pink/blue halves and the original three-step silhouette.
  // Side cheeks close the profile; the rear hinge meets the annex floor and the feet meet the road.
  const lastAnnex=annexSpecs.at(-1),stairBase=.12,stairRise=lastAnnex.h*U+.16+.07-stairBase,stepRun=U*.36;
  const stairsOuter=group('pink-blue-magnetic-stairs',lastAnnex.x*U,stairBase,(lastAnnex.z+1)*U);
  stairsOuter.userData.connection={topY:stairBase+stairRise,annexFloorY:lastAnnex.h*U+.23,backZ:(lastAnnex.z+1)*U,steps:3,run:3*stepRun};
  for(const [side,color] of [[-1,'magenta'],[1,'cyan']]){
    const half=group('stair-half-'+color,side*.5*U,0,0,stairsOuter),width=U*.98;
    for(let i=0;i<3;i++){
      const high=stairRise*(3-i)/3,low=stairRise*(2-i)/3,start=i*stepRun,end=(i+1)*stepRun;
      panel([[-width/2,high,start],[width/2,high,start],[width/2,high,end],[-width/2,high,end]],color,half);
      surface([[-width/2,low,end],[width/2,low,end],[width/2,high,end],[-width/2,high,end]],glazing[color],half);
      for(const edge of [-1,1]){
        const x=edge*width/2;
        surface([[x,0,start],[x,high,start],[x,high,end],[x,0,end]],glazing[color],half);
        beam([x,high,start],[x,high,end],rims[color],.07,half);beam([x,high,end],[x,low,end],rims[color],.07,half);
      }
    }
    for(const edge of [-1,1]){
      const x=edge*width/2;beam([x,0,0],[x,stairRise,0],rims[color],.07,half);beam([x,0,0],[x,0,3*stepRun],rims[color],.07,half);
      box(.18,.1,.22,x,-.04,3*stepRun-.08,charcoal,half);
    }
    box(width,.12,.14,0,stairRise-.035,-.055,rims[color],half);
  }
  // Original green hemisphere on the outer side of the annex.
  const bubble=mesh(new THREE.SphereGeometry(.55*U,28,20),glazing.green,3.0*U,2*U,1.7*U);bubble.name='green-magnetic-hemisphere';parts[bubble.name]=bubble;
  // Yellow cranes retain square bases, articulated booms, pulley wheels and hanging hooks.
  function crane(x,y,z,angle,name){const g=group(name,x,y,z);g.rotation.y=angle;square(0,.45*U,.45*U,.9*U,'yellow',g);square(.45*U,.45*U,0,.9*U,'yellow',g,Math.PI/2);mesh(new THREE.CylinderGeometry(.3,.42,.18,16),yellow,0,.95*U,0,g);const nodes=[[0,U,0],[0,1.65*U,0],[.65*U,2.35*U,0],[1.35*U,2.23*U,0]];for(let i=1;i<nodes.length;i++){beam(nodes[i-1],nodes[i],yellow,.105,g);mesh(new THREE.SphereGeometry(.14,10,8),yellow,...nodes[i],g);}beam(nodes[3],[1.35*U,1.35*U,0],charcoal,.025,g);mesh(new THREE.TorusGeometry(.15,.04,8,20,Math.PI*1.6),yellow,1.35*U,1.28*U,0,g);return g;}
  crane(2.05*U,.17,.95*U,-.25,'main-yellow-crane');crane(4.1*U,2*U,1.8*U,.3,'annex-yellow-crane');
  // Small outposts and the red/blue ground-level playhouse are part of the child's composition.
  const guard=shell('orange-yellow-outpost',2.8*U,6.25*U,1,1,1,[['orange']],[['yellow']]);pyramid(0,U,0,U,.85*U,U,['yellow','yellow','lime','yellow'],guard);
  const playhouse=group('red-blue-small-playhouse',-1.0*U,.12,3.8*U);box(.65*U,.65*U,.65*U,0,.325*U,0,red,playhouse);pyramid(0,.65*U,0,.78*U,.4*U,.78*U,['blue','blue','blue','purple'],playhouse);box(.2*U,.38*U,.03,0,.22*U,.34*U,charcoal,playhouse);
  // Flat toy figures remain mounted to the side of the roof tower and the stepped annex.
  function figure(x,y,z,shirt,pants,parent=architecture,scale=1){const g=group('original-figure-'+x+'-'+y,x,y,z,parent);g.scale.setScalar(scale);const skin=materials.skin||mat('skin','#efcfa6'),hair=charcoal;mesh(new THREE.CircleGeometry(.27,24),skin,0,1.45,.04,g);const cap=mesh(new THREE.CircleGeometry(.29,24,0,Math.PI),hair,0,1.51,.05,g);box(.42,.58,.045,0,.93,0,rims[shirt],g);for(const side of [-1,1]){beam([side*.18,1.12,0],[side*.55,1.47,0],skin,.075,g);beam([side*.13,.64,0],[side*.33,.08,0],rims[pants],.085,g);mesh(new THREE.CircleGeometry(.028,8),charcoal,side*.09,1.46,.055,g);}return g;}
  const figurineStack=group('red-square-figure-tower',2.25*U,4*U,-.45*U);
  square(0,-.5*U,0,U,'red',figurineStack);triangle([U/2,-U,0],[U/2,0,0],[1.15*U,-.5*U,0],'lime',figurineStack);
  for(let i=0;i<2;i++){square(0,(i+.5)*U,0,U,'red',figurineStack);triangle([U/2,i*U,0],[U/2,(i+1)*U,0],[1.15*U,(i+.5)*U,0],['lime','cyan','yellow'][i],figurineStack);figure(0,i*U+.12,.1,['blue','red','yellow'][i],['green','blue','green'][i],figurineStack,1.25);}
  pyramid(0,2*U,0,U,.8*U,U,['yellow','yellow','yellow','red'],figurineStack);
  figure(3.8*U,3*U+.2,.65*U,'yellow','blue',architecture,1.25);figure(5*U,2*U+.2,3.0*U,'blue','green',architecture,1.25);
  // Roadside signs are geometry and printed symbols, preserved as objects rather than UI labels.
  const traffic=group('original-traffic-furniture',0,0,0,world);
  function sign(x,z,kind,angle=0){const g=group('traffic-sign-'+kind+'-'+x+'-'+z,x,.08,z,traffic);g.rotation.y=angle;box(.55,.12,.44,0,.06,0,rims.blue,g);beam([0,.1,0],[0,2.0,0],white,.065,g);
    if(kind==='warning'){surface([[-.6,2.03,.02],[.6,2.03,.02],[0,3.04,.02]],yellow,g);for(const [a,b] of [[[ -.54,2.09,.04],[.54,2.09,.04]],[[.54,2.09,.04],[0,2.96,.04]],[[0,2.96,.04],[-.54,2.09,.04]]])beam(a,b,charcoal,.026,g);box(.07,.35,.03,0,2.53,.065,charcoal,g);mesh(new THREE.CircleGeometry(.047,12),charcoal,0,2.23,.065,g);}
    else if(kind==='light'){box(.46,1.25,.22,0,2.5,0,charcoal,g);for(const [i,color] of ['red','yellow','green'].entries())mesh(new THREE.CircleGeometry(.145,20),rims[color],0,2.88-i*.38,.13,g);}
    else if(kind==='parking'){box(.65,.75,.055,0,2.4,0,rims.blue,g);box(.065,.5,.035,-.14,2.4,.045,white,g);box(.3,.06,.035,0,2.62,.045,white,g);box(.3,.06,.035,0,2.41,.045,white,g);box(.06,.25,.035,.14,2.515,.045,white,g);}
    else {mesh(new THREE.CircleGeometry(.42,32),red,0,2.4,.035,g);mesh(new THREE.CircleGeometry(.33,32),white,0,2.4,.045,g);if(kind==='no-entry')box(.52,.13,.035,0,2.4,.07,red,g);else{const slash=box(.65,.07,.035,0,2.4,.08,red,g);slash.rotation.z=-Math.PI/4;box(.3,.13,.04,0,2.4,.07,charcoal,g);}}
    return g;
  }
  sign(-1.45,18.5,'no-entry');sign(-1.45,16.9,'warning');sign(5,21.4,'parking');sign(5,17.3,'light');sign(-5.1,6,'light');sign(-12.1,9.4,'warning');sign(17.8,13,'warning');sign(17.8,15.2,'parking');sign(-.9,11.7,'restriction');
  const wallSignal=group('tower-mounted-traffic-light',-3.55*U,1.5*U,-.07*U);box(.45,1.2,.12,0,0,0,charcoal,wallSignal);for(const [i,color] of ['red','yellow','green'].entries())mesh(new THREE.CircleGeometry(.13,18),rims[color],0,.36-i*.36,.08,wallSignal);
  function bollard(x,z,h=1.05){box(.27,.09,.27,x,.05,z,yellow,traffic);mesh(new THREE.CylinderGeometry(.11,.13,h,12),yellow,x,h/2+.08,z,traffic);for(let i=0;i<3;i++)mesh(new THREE.CylinderGeometry(.115,.115,.13,12),charcoal,x,.25+i*.3,z,traffic);}
  function barrier(x,z){const g=group('red-white-entry-barrier',x,.05,z,traffic);for(const side of [-1,1]){box(.38,1.1,.4,side*2.2,.55,0,yellow,g);for(let k=0;k<3;k++)box(.4,.14,.42,side*2.2,.18+k*.31,0,charcoal,g);}box(4.6,.13,.13,0,1.12,0,white,g);for(let i=0;i<8;i++){const stripe=box(.24,.145,.145,-2+i*.56,1.12,0,red,g);stripe.rotation.z=.2;}}
  barrier(1.8,24.4);barrier(-3.1,5.7);
  for(let i=0;i<8;i++){bollard(-1.4,14.2+i*1.35);bollard(5,14.2+i*1.35);}
  for(const [x,z] of [[-2,22],[-2,19],[5.8,23.5],[-6,13],[-10,14]]){mesh(new THREE.ConeGeometry(.2,.65,16),yellow,x,.39,z,traffic);box(.47,.06,.47,x,.05,z,yellow,traffic);}
  // Coloured panel fence follows the original foreground edge; no invented masonry enclosure.
  for(let i=0;i<7;i++){const x=7+i*1.65,z=21+i*.4,c=['yellow','purple','green','cyan','magenta','smoke','lime'][i];square(x,.85,z,1.65,c,traffic,-.24);if(i%2===0)triangle([x-.82,1.67,z],[x+.82,1.67,z],[x,2.7,z],c,traffic);}
  function car(x,z,color,angle=0,long=false){const g=group('original-vehicle-'+x+'-'+z,x,.12,z,world);g.rotation.y=angle;const paint=materials['car-'+color]||mat('car-'+color,color,{metalness:.45,roughness:.25}),length=long?3.8:2.6;box(1.18,.4,length,0,.4,0,paint,g);box(1.04,.48,length*.55,0,.82,-.15,glazing.smoke,g);box(1.07,.06,length*.55,0,1.09,-.15,paint,g);for(const sx of [-1,1])for(const sz of [-1,1]){const wheel=mesh(new THREE.CylinderGeometry(.25,.25,.16,16),charcoal,sx*.6,.25,sz*length*.3,g);wheel.rotation.z=Math.PI/2;}for(const side of [-1,1])box(.24,.08,.025,side*.33,.48,length/2+.015,warm,g);}
  car(.6,19.4,'#bb252b');car(3.0,19.4,'#246bab');car(.6,15.7,'#f0f0de',0,true);car(2.8,3.8,'#f0f0e6',.1);car(-.6,1.5,'#aa2733',0,true);car(-5.9,3.8,'#1aba6a');
  // Landscape follows the supplied render references while leaving the original road network open.
  const planting={trees:[[-18.5,18.5,4.1],[-7,22.5,3.3],[-18,-10,4.5],[20,-8,4.8]],shrubs:[],plants:[]};
  const garden=group('reference-garden',0,0,0,world);
  function plantedBed(x,z,w,d){
    box(w+.22,.12,d+.22,x,-.015,z,paving,garden);box(w,.08,d,x,.055,z,grass,garden);
    for(let i=0;i<=Math.floor(w/.65);i++){const px=x-w/2+i*w/Math.floor(w/.65);planting.shrubs.push([px,z-d/2,.46],[px,z+d/2,.46]);}
    for(let i=1;i<Math.floor(d/.65);i++){const pz=z-d/2+i*d/Math.floor(d/.65);planting.shrubs.push([x-w/2,pz,.46],[x+w/2,pz,.46]);}
  }
  plantedBed(-6.7,21,5.3,6.4);plantedBed(10.3,18.1,4.3,3.4);plantedBed(-19,1.5,3,15);plantedBed(20,4,2.7,17);
  box(4.9,.1,4.8,-17,.01,14.7,paving,garden);
  mesh(new THREE.CylinderGeometry(.8,.8,.09,32),wood,-17,.8,14.7,garden);beam([-17,.08,14.7],[-17,.75,14.7],charcoal,.095,garden);
  for(const side of [-1,1]){box(.7,.11,.64,-17+side*1.35,.48,14.7,wood,garden);box(.14,.65,.64,-17+side*1.65,.75,14.7,wood,garden);for(const dz of [-.2,.2])box(.07,.43,.07,-17+side*1.35,.23,14.7+dz,charcoal,garden);}
  beam([-17,.08,14.7],[-17,2.9,14.7],charcoal,.045,garden);mesh(new THREE.ConeGeometry(2,.45,12),fabric,-17,2.9,14.7,garden);
  for(let i=0;i<8;i++){const stone=box(.72,.055,.5,-12.7-i*.48,.025,19.3-i*.42,paving,garden);stone.rotation.y=-.15+i*.07;}
  for(const [x,z] of [[-3.6,17.6],[-3.6,24.5],[-9.6,17.6],[-9.6,24.5],[7.7,16.1],[12.9,16.1],[-15,12.5],[-15,17.1],[18,11]]){
    box(.12,.62,.12,x,.31,z,charcoal,garden);box(.2,.2,.2,x,.68,z,warm,garden);box(.27,.045,.27,x,.8,z,charcoal,garden);
    const lamp=new THREE.PointLight('#ffd098',1.3,4.8,2);lamp.position.set(x,.72,z);garden.add(lamp);lights.push(lamp);
  }
  for(const [x,z] of [[-18.8,12.7],[-15.5,16.3],[-3.8,23.8],[8.9,17.4],[11.7,18.6]])planting.plants.push([x,.1,z,.85]);
  for(let i=0;i<48;i++){const z=-14+i*.9;planting.shrubs.push([-22,z,.74],[22,z,.74]);}
  for(let i=0;i<47;i++){const x=-21+i*.9;planting.shrubs.push([x,-15,.8]);if(x< -2||x>5.8)planting.shrubs.push([x,28.5,.7]);}
  for(const y of [U+.25,2*U+.25,3*U+.25])planting.plants.push([-2,y,-4.3,.85]);
  return {world,architecture,glass,warm,lights,stairs,materials,planting,parts,roads,palette,moduleSize:U};
}
