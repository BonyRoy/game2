// Round the centerline with quadratic bends while keeping junctions within the paved width.
export function roundRoad(points,closed=false,cornerTrim=()=>76){
  const path=points.filter(([x,y],i)=>i===0||x!==points[i-1][0]||y!==points[i-1][1]);
  if(path.length<3)return path;
  if(closed&&path[0][0]===path.at(-1)[0]&&path[0][1]===path.at(-1)[1])path.pop();
  const rounded=[];
  for(let i=0;i<path.length;i++){
    const corner=path[i];
    if(!closed&&(i===0||i===path.length-1)){
      rounded.push(corner);
      continue;
    }
    const [x,y]=corner;
    const [ax,ay]=path[(i+path.length-1)%path.length];
    const [bx,by]=path[(i+1)%path.length];
    const incoming=Math.hypot(x-ax,y-ay),outgoing=Math.hypot(bx-x,by-y);
    const ux=(x-ax)/incoming,uy=(y-ay)/incoming;
    const vx=(bx-x)/outgoing,vy=(by-y)/outgoing;
    const turn=Math.hypot(vx-ux,vy-uy);
    if(turn<.045||turn>1.95){
      rounded.push(corner);
      continue;
    }
    const limit=cornerTrim(x,y);
    const trim=Math.min(limit,incoming*.28,outgoing*.28,(94*limit/76)/turn);
    const start=[x-ux*trim,y-uy*trim],end=[x+vx*trim,y+vy*trim];
    for(let j=0;j<=6;j++){
      const t=j/6,inv=1-t;
      rounded.push([
        inv*inv*start[0]+2*t*inv*x+t*t*end[0],
        inv*inv*start[1]+2*t*inv*y+t*t*end[1]
      ]);
    }
  }
  if(closed)rounded.push(rounded[0]);
  return rounded;
}
