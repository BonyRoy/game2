import {bridgeHeight} from './world.js';

// The GLB road profile is the reference for every piece, including the rails and supports.
export function projectBridge(groups,materials,span){
  const roadIndex=materials.findIndex(material=>material.name==='Road');
  const road=groups.get(roadIndex);
  if(!road?.length)throw new Error('Bridge road mesh is missing.');
  const stations=new Map();
  for(let i=0;i<road.length;i+=9){
    const along=-road[i+2],height=road[i+1];
    stations.set(along,Math.max(height,stations.get(along)??-Infinity));
  }
  const profile=[...stations].sort((a,b)=>a[0]-b[0]);
  const first=profile[0][0],last=profile.at(-1)[0];
  const length=span.east-span.west;
  const alongScale=length/(last-first);
  const crossScale=(span.width/2-7)/208.55;
  const elevation=along=>{
    for(let i=1;i<profile.length;i++){
      const [end,top]=profile[i];
      if(along>end)continue;
      const [start,bottom]=profile[i-1];
      return bottom+(top-bottom)*(along-start)/(end-start);
    }
    return profile.at(-1)[1];
  };
  const convert=([cross,height,negativeAlong,u,v,tag,nx,ny,nz])=>{
    const source=-negativeAlong;
    const along=span.west+(source-first)*alongScale;
    const across=span.y+(cross+.173)*crossScale;
    const y=bridgeHeight(along,span)+.22+(height-elevation(source))*crossScale;
    const normalAlong=-nz/alongScale,normalAcross=nx/crossScale;
    return span.vertical
      ?[across,y,along,u,v,tag,normalAcross,ny/crossScale,normalAlong]
      :[along,y,across,u,v,tag,normalAlong,ny/crossScale,normalAcross];
  };

  // Subdivide long approach faces so they follow the same ramp as the wheels.
  const clip=(polygon,boundary,keepLow)=>{
    const output=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length];
      const ax=-a[2],bx=-b[2];
      const insideA=keepLow?ax<=boundary:ax>=boundary;
      const insideB=keepLow?bx<=boundary:bx>=boundary;
      if(insideA)output.push(a);
      if(insideA!==insideB){
        const t=(boundary-ax)/(bx-ax);
        output.push(a.map((value,j)=>value+(b[j]-value)*t));
      }
    }
    return output;
  };
  const count=Math.ceil(length/20);
  const step=(last-first)/count;
  return new Map([...groups].map(([material,vertices])=>{
    const fitted=[];
    for(let i=0;i<vertices.length;i+=27){
      const triangle=[vertices.slice(i,i+9),vertices.slice(i+9,i+18),vertices.slice(i+18,i+27)];
      const bounds=triangle.map(vertex=>-vertex[2]);
      const start=Math.max(0,Math.min(count-1,Math.floor((Math.min(...bounds)-first)/step)));
      const end=Math.max(start,Math.min(count-1,Math.floor((Math.max(...bounds)-first)/step)));
      for(let chunk=start;chunk<=end;chunk++){
        const left=chunk===start?triangle:clip(triangle,first+chunk*step,false);
        const polygon=chunk===end?left:clip(left,first+(chunk+1)*step,true);
        for(let j=1;j+1<polygon.length;j++)fitted.push(...convert(polygon[0]),...convert(polygon[j]),...convert(polygon[j+1]));
      }
    }
    return [material,fitted];
  }));
}
