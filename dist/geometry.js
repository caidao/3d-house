import * as THREE from './vendor/three.module.js';

// Make glazing watertight so rays enter and leave a physical volume.
export function solidPanelGeometry(vertices,thickness=.045){
  const normal=new THREE.Vector3(...vertices[1]).sub(new THREE.Vector3(...vertices[0])).cross(new THREE.Vector3(...vertices[2]).sub(new THREE.Vector3(...vertices[0]))).normalize();
  const front=vertices.map(v=>new THREE.Vector3(...v).addScaledVector(normal,thickness/2).toArray());
  const back=vertices.map(v=>new THREE.Vector3(...v).addScaledVector(normal,-thickness/2).toArray());
  const positions=[];
  function face(v){for(let i=1;i<v.length-1;i++)positions.push(...v[0],...v[i],...v[i+1]);}
  face(front);face([...back].reverse());
  for(let i=0;i<vertices.length;i++){const j=(i+1)%vertices.length;face([front[i],back[i],back[j],front[j]]);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+1]]:[]),2));geometry.computeVertexNormals();return geometry;
}

// The path tracer needs ordinary meshes; preserve instance transforms, UVs and colours when baking.
export function bakeInstancedMesh(source){
  source.updateWorldMatrix(true,false);
  const src=source.geometry,p=src.attributes.position,n=src.attributes.normal,uv=src.attributes.uv,c=src.attributes.color;
  const total=p.count*source.count,positions=new Float32Array(total*3),normals=new Float32Array(total*3),uvs=new Float32Array(total*2),colors=new Float32Array(total*3);
  const perIndex=src.index?src.index.count:p.count,indices=new Uint32Array(perIndex*source.count);
  const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),v=new THREE.Vector3(),instanceColor=new THREE.Color();
  for(let i=0;i<source.count;i++){
    source.getMatrixAt(i,matrix);matrix.premultiply(source.matrixWorld);normalMatrix.getNormalMatrix(matrix);instanceColor.set(0xffffff);if(source.instanceColor)source.getColorAt(i,instanceColor);
    for(let j=0;j<p.count;j++){
      const offset=i*p.count+j;v.fromBufferAttribute(p,j).applyMatrix4(matrix).toArray(positions,offset*3);
      if(n)v.fromBufferAttribute(n,j).applyMatrix3(normalMatrix).normalize().toArray(normals,offset*3);
      if(uv){uvs[offset*2]=uv.getX(j);uvs[offset*2+1]=uv.getY(j);}
      colors[offset*3]=instanceColor.r*(c?c.getX(j):1);colors[offset*3+1]=instanceColor.g*(c?c.getY(j):1);colors[offset*3+2]=instanceColor.b*(c?c.getZ(j):1);
    }
    for(let j=0;j<perIndex;j++)indices[i*perIndex+j]=i*p.count+(src.index?src.index.getX(j):j);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));
  const material=source.material.clone();material.vertexColors=Boolean(source.instanceColor||c);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=source.name;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;return mesh;
}
