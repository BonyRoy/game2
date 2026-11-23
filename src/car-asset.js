const components={SCALAR:1,VEC2:2,VEC3:3};
const readers={5121:['getUint8',1],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]};

const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

function multiply(a,b){
  return b.map((_,i)=>{
    const column=i-i%4,row=i%4;
    return a[row]*b[column]+a[row+4]*b[column+1]+a[row+8]*b[column+2]+a[row+12]*b[column+3];
  });
}

function localMatrix({matrix,rotation=[0,0,0,1],translation=[0,0,0],scale=[1,1,1]}){
  if(matrix)return matrix;
  const [x,y,z,w]=rotation,[sx,sy,sz]=scale;
  return [
    (1-2*(y*y+z*z))*sx,2*(x*y+w*z)*sx,2*(x*z-w*y)*sx,0,
    2*(x*y-w*z)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+w*x)*sy,0,
    2*(x*z+w*y)*sz,2*(y*z-w*x)*sz,(1-2*(x*x+y*y))*sz,0,
    ...translation,1
  ];
}

function transform(m,x,y,z,w=1){
  return [m[0]*x+m[4]*y+m[8]*z+m[12]*w,
    m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w];
}

function normalMatrix(m){
  const cross=([x,y,z],[a,b,c])=>[y*c-z*b,z*a-x*c,x*b-y*a];
  const a=m.slice(0,3),b=m.slice(4,7),c=m.slice(8,11);
  const first=cross(b,c);
  const sign=Math.sign(first.reduce((sum,value,i)=>sum+value*a[i],0))||1;
  return [...first,0,...cross(c,a),0,...cross(a,b),0,0,0,0,1].map(value=>value*sign);
}

export async function loadCarAsset({url,scale,lift=0,paint={},bakedWheels=false,clusterLights=false,combinedWheels,lensMaterials,origin=[0,0,0],wheelNodes,roofLightMaterial,normalize=false,groundAnchor=false,footprintMesh,keepIndices=false,textureOnly,splitNodes,omitMaterials=[]},signal){
  const response=await fetch(url,{signal});
  if(!response.ok)throw new Error(`Car model request failed (${response.status})`);
  const file=new DataView(await response.arrayBuffer());
  if(file.getUint32(0,true)!==0x46546c67||file.getUint32(4,true)!==2){
    throw new Error('Expected a binary glTF 2 car model');
  }
  const jsonSize=file.getUint32(12,true);
  const model=JSON.parse(new TextDecoder().decode(new Uint8Array(file.buffer,20,jsonSize)));
  const binaryStart=28+jsonSize;
  function accessor(index){
    const spec=model.accessors[index];
    const view=model.bufferViews[spec.bufferView];
    const [read,size]=readers[spec.componentType];
    const count=components[spec.type];
    const stride=view.byteStride??count*size;
    const offset=binaryStart+(view.byteOffset??0)+(spec.byteOffset??0);
    return (row,column=0)=>file[read](offset+row*stride+column*size,true);
  }

  const body=new Map(),wheelGroups=new Map(),indexedParts=[],separateBuildings=new Map();
  const rearLenses=[],headLenses=[],redStrobe=[],blueStrobe=[],collisionFaces=[];
  const position=([x,y,z])=>[(z-origin[2])*scale,(y-origin[1])*scale+lift,(origin[0]-x)*scale];
  function visit(index,parent,axle,group=body){
    const node=model.nodes[index];
    const matrix=multiply(parent,localMatrix(node));
    if(splitNodes?.includes(node.name)){
      group=new Map();
      separateBuildings.set(node.name,group);
    }
    const joint=node.name?.match(/^3DWheel (Front|Rear) ([LR])$/);
    if(joint||wheelNodes?.test(node.name)){
      const key=joint?joint[1][0]+joint[2]:index;
      const pivot=position(transform(matrix,0,0,0));
      axle={pivot,front:joint?joint[1]==='Front':pivot[0]>0,groups:new Map()};
      wheelGroups.set(key,axle);
    }
    if(node.mesh!==undefined&&!node.name?.includes('_glows_')){
      const sourceMesh=model.meshes[node.mesh];
      if(bakedWheels&&sourceMesh.primitives.some(p=>model.materials[p.material].name==='rphong15SG1'||model.materials[p.material].name==='rphong18SG1')){
        const bounds=model.accessors[sourceMesh.primitives[0].attributes.POSITION];
        const center=bounds.min.map((value,i)=>(value+bounds.max[i])/2);
        const key=(center[2]>0?'F':'B')+(center[0]>0?'L':'R');
        if(!wheelGroups.has(key)){
          wheelGroups.set(key,{pivot:position(transform(matrix,...center)),front:center[2]>0,groups:new Map()});
        }
        axle=wheelGroups.get(key);
      }
      const wheel=node.name?.match(/:Wheel([FB][LR])_/);
      if(wheel){
        const key=wheel[1];
        if(!wheelGroups.has(key)){
          const tyre=model.meshes.find(mesh=>mesh.name.includes(`Wheel${key}_tyre`));
          const bounds=model.accessors[tyre.primitives[0].attributes.POSITION];
          const center=bounds.min.map((value,i)=>(value+bounds.max[i])/2);
          wheelGroups.set(key,{pivot:position(transform(matrix,...center)),front:key[0]==='F',groups:new Map()});
        }
        axle=wheelGroups.get(key);
      }
      const groups=axle?.groups??group;
      const pivot=axle?.pivot??[0,0,0];
      const normals=normalMatrix(matrix);
      for(const primitive of sourceMesh.primitives){
        const {POSITION,NORMAL,TEXCOORD_0}=primitive.attributes;
        const pos=accessor(POSITION),normal=NORMAL===undefined?null:accessor(NORMAL);
        const material=primitive.material;
        const source=model.materials[material];
        if(omitMaterials.includes(source.name))continue;
        const texture=source.pbrMetallicRoughness?.baseColorTexture??source.extensions?.KHR_materials_pbrSpecularGlossiness?.diffuseTexture;
        const uvTransform=texture?.extensions?.KHR_texture_transform;
        const texCoord=uvTransform?.texCoord??texture?.texCoord??0;
        const accessorIndex=primitive.attributes[`TEXCOORD_${texCoord}`]??TEXCOORD_0;
        const uv=accessorIndex===undefined?()=>0:accessor(accessorIndex);
        const indices=primitive.indices===undefined?i=>i:accessor(primitive.indices);
        const count=model.accessors[primitive.indices??POSITION].count;
        if(keepIndices&&primitive.indices!==undefined&&model.accessors[POSITION].count<=65536){
          const vertices=new Float32Array(model.accessors[POSITION].count*9);
          for(let j=0;j<model.accessors[POSITION].count;j++){
            const point=position(transform(matrix,pos(j),pos(j,1),pos(j,2)));
            const [nx,ny,nz]=normal?transform(normals,normal(j),normal(j,1),normal(j,2),0):[0,1,0];
            vertices.set([...point,uv(j),uv(j,1),0,nz,ny,-nx],j*9);
          }
          const elements=new Uint16Array(count);
          for(let i=0;i<count;i++)elements[i]=indices(i);
          indexedParts.push({material,vertices,elements});
          continue;
        }
        const name=node.name??'';
        const rear=source.name===lensMaterials?.rear||name.includes('TailLight')&&name.includes('LightGlassNormal_Red');
        const head=source.name===lensMaterials?.front||name.includes('HeadLight')&&name.includes('LightGlassNormal_Clear');
        if(name.includes('TailLight')&&name.includes('LightGlassNormal_Clear'))continue;
        if(clusterLights&&(name.includes('M_GlassColor_High')||name.includes('M_GlassLights_High'))){
          for(let i=0;i<count;i+=3){
            const points=Array.from({length:3},(_,offset)=>{
              const j=indices(i+offset);
              return transform(matrix,pos(j),pos(j,1),pos(j,2));
            });
            const center=points[0].map((_,axis)=>points.reduce((sum,point)=>sum+point[axis],0)/3);
            const [lateral,height,longitudinal]=center.map(value=>value*scale/8);
            const front=name.includes('M_GlassLights_High')&&longitudinal>1.82&&height>.59&&height<.88&&Math.abs(lateral)>.48;
            const back=name.includes('M_GlassColor_High')&&longitudinal< -1.76&&height>.69&&height<1.02&&Math.abs(lateral)>.43;
            for(const point of points){
              const [x,y,z]=position(point);
              if(front)headLenses.push(x+.027,y+.013,z,1,.94,.78);
              if(back)rearLenses.push(x-.028,y,z,1,.24,.13);
            }
          }
        }
        if(combinedWheels?.materials.includes(source.name)){
          for(let i=0;i<count;i+=3){
            const triangle=[indices(i),indices(i+1),indices(i+2)];
            const front=triangle.reduce((sum,j)=>sum+pos(j,2),0)>0;
            const left=triangle.reduce((sum,j)=>sum+pos(j),0)>0;
            const key=(front?'F':'B')+(left?'L':'R');
            if(!wheelGroups.has(key)){
              const center=transform(matrix,left?combinedWheels.track:-combinedWheels.track,
                combinedWheels.centerY,front?combinedWheels.front:combinedWheels.rear);
              wheelGroups.set(key,{pivot:position(center),front,groups:new Map()});
            }
            const target=wheelGroups.get(key);
            if(!target.groups.has(material))target.groups.set(material,[]);
            const vertices=target.groups.get(material);
            for(const j of triangle){
              const point=position(transform(matrix,pos(j),pos(j,1),pos(j,2))).map((value,axis)=>value-target.pivot[axis]);
              const [nx,ny,nz]=normal?transform(normals,normal(j),normal(j,1),normal(j,2),0):[0,1,0];
              vertices.push(...point,uv(j),uv(j,1),0,nz,ny,-nx);
            }
          }
          continue;
        }
        if(source.name===roofLightMaterial){
          for(let i=0;i<count;i+=3){
            const points=[indices(i),indices(i+1),indices(i+2)].map(j=>position(transform(matrix,pos(j),pos(j,1),pos(j,2))));
            const red=points.reduce((sum,point)=>sum+point[2],0)<0;
            const lamp=red?redStrobe:blueStrobe;
            const color=red?[1,.11,.17]:[.14,.40,1];
            for(const [x,y,z] of points)lamp.push(x,y+.012,z,...color);
          }
        }
        if(!groups.has(material))groups.set(material,[]);
        const vertices=groups.get(material);
        for(let i=0;i<count;i++){
          const j=indices(i);
          const point=position(transform(matrix,pos(j),pos(j,1),pos(j,2))).map((value,axis)=>value-pivot[axis]);
          if(node.mesh===footprintMesh)collisionFaces.push(point);
          const [nx,ny,nz]=normal?transform(normals,normal(j),normal(j,1),normal(j,2),0):[0,1,0];
          const u=uv(j)*(uvTransform?.scale?.[0]??1)+(uvTransform?.offset?.[0]??0);
          const v=uv(j,1)*(uvTransform?.scale?.[1]??1)+(uvTransform?.offset?.[1]??0);
          const frontLens=head&&(source.name!=='Material.014'||point[0]>0);
          if(frontLens)headLenses.push(point[0]+.024,point[1]+.024,point[2],1,.94,.78);
          if(!frontLens||source.name==='Material.014')vertices.push(...point,u,v,0,nz,ny,-nx);
          if(rear)rearLenses.push(point[0]-.028,point[1],point[2],1,.24,.13);
        }
      }
    }
    for(const child of node.children??[])visit(child,matrix,axle,group);
  }
  if(!textureOnly)for(const root of model.scenes[model.scene??0].nodes)visit(root,identity,null);

  function normalizeGeometry(geometry,faces=[],anchor=false){
    const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    for(const vertices of geometry){
      for(let i=0;i<vertices.length;i+=9){
        for(let axis=0;axis<3;axis++){
          low[axis]=Math.min(low[axis],vertices[i+axis]);
          high[axis]=Math.max(high[axis],vertices[i+axis]);
        }
      }
    }
    const height=high[1]-low[1];
    if(!Number.isFinite(height)||height<=0)throw new Error('Scenery model has no usable bounds');
    const span=[(high[0]-low[0])/height,(high[2]-low[2])/height];
    const center=[anchor?0:(low[0]+high[0])/2,low[1],anchor?0:(low[2]+high[2])/2];
    const footprint=Math.hypot(Math.max(high[0]-center[0],center[0]-low[0]),
      Math.max(high[2]-center[2],center[2]-low[2]))/height;
    for(const point of faces){
      for(let axis=0;axis<3;axis++)point[axis]=(point[axis]-center[axis])/height;
    }
    for(const vertices of geometry){
      for(let i=0;i<vertices.length;i+=9){
        for(let axis=0;axis<3;axis++)vertices[i+axis]=(vertices[i+axis]-center[axis])/height;
      }
    }
    return {footprint,span};
  }
  const dimensions=normalize&&!splitNodes
    ?normalizeGeometry([...body.values(),...indexedParts.map(part=>part.vertices)],collisionFaces,groundAnchor)
    :{};
  const variants=new Map([...separateBuildings].map(([name,geometry])=>[
    name,{body:geometry,...normalizeGeometry([...geometry.values()])}
  ]));
  const images=new Map();
  try {
    await Promise.all(model.materials.map(async material=>{
      if((textureOnly&&material.name!==textureOnly)||omitMaterials.includes(material.name))return;
      const index=(material.pbrMetallicRoughness?.baseColorTexture??material.extensions?.KHR_materials_pbrSpecularGlossiness?.diffuseTexture)?.index;
      if(index===undefined||images.has(index))return;
      const image=model.images[model.textures[index].source];
      const view=model.bufferViews[image.bufferView];
      const bytes=new Uint8Array(file.buffer,binaryStart+(view.byteOffset??0),view.byteLength);
      const bitmap=createImageBitmap(new Blob([bytes],{type:image.mimeType}),{colorSpaceConversion:'none'});
      images.set(index,bitmap);
      await bitmap;
    }));
  }catch(error){
    for(const bitmap of images.values())bitmap.then(image=>image.close(),()=>{});
    throw error;
  }
  const materials=await Promise.all(model.materials.map(async material=>{
    const pbr=material.pbrMetallicRoughness??{};
    const specular=material.extensions?.KHR_materials_pbrSpecularGlossiness;
    const baseTexture=pbr.baseColorTexture??specular?.diffuseTexture;
    const glass=material.name?.includes('WindowFront')||material.name==='phong2'||material.name==='rphong1SG1'||material.name==='windows'||material.name==='glass'||material.name==='Material.004';
    const tint=paint[material.name]??(glass?[.13,.21,.25]:(pbr.baseColorFactor??specular?.diffuseFactor??[1,1,1]).slice(0,3).map(channel=>channel**(1/2.2)));
    return {
      name:material.name,tint,gloss:glass?.65:1-(pbr.roughnessFactor??1),
      cutout:!glass&&(material.alphaMode==='BLEND'||material.alphaMode==='MASK'),
      repeat:Boolean(pbr.baseColorTexture?.extensions?.KHR_texture_transform),
      image:await images.get(baseTexture?.index)
    };
  }));
  return {body,indexedParts,...dimensions,variants,collisionFaces,rearLenses,headLenses,redStrobe,blueStrobe,wheels:[...wheelGroups.values()],materials};
}
