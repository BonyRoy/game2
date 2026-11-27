import {FROSTPINE_MOUNTAIN} from './frostpine-mountain';
import {COPPER_BUILDINGS,COPPER_SHORE,copperShoreRange,COPPER_CITY_ORIGIN,COPPER_CITY_SCALE,COPPER_GATE_WIDTH,COPPER_CITY_ROTATION,COPPER_DISTRICTS,COPPER_AVENUES,COPPER_CONNECTORS,inCopperDistrict} from './copper-island';
import {CITY,CITY_BRIDGE,CITY_APPROACHES,CITY_DISTRICTS,CITY_HALF_SIZE,CITY_LINKS,cityCoastRows,BEACH_KIT_NODES,BEACH_KIT_SIZES,harborBeachLayout,isCityBridge,isCityLand} from './city-island';
import {projectBridge} from './bridge-asset';
import {sceneryFiles,sceneryAssetConfig} from './scenery-assets';
import {loadCarAsset} from './car-asset';
import {POLICE_PAINT} from './pursuit';
import {daylight} from './lighting';
import {CARS,POLICE_ASSET} from './cars';
import {SIZE,WORLD_WIDTH,WORLD_HEIGHT,JUNIPER_ROWS,bridges,bridgeHeight,DESERT_CENTER,copperTerrainHeight,snowHalfWidth,isSnow,isDesert,isRoad,juniperShoreRange,routes,roadWidth,sidewalkWidth,overlapsSidewalk,buildings,breakableScenery,groundHeight,isPalm,stadiums,stadiumDriveLayout,lighthouse,basicTowerLot,sceneryRadius,fallenSceneryPose,CAR_AXLES,carGroundPose,isCityApproach} from './world';

const colors = new Map();
const sunDirection=[.65,.70,-.30];
const trafficLightLimit=4;
const material={world:0,terrain:1,pavement:2,vehicle:3,sky:4,contactShadow:5,streetShadow:6,rearLens:7,rearGlow:8,importedCar:9,lanternGlow:10,foliageBake:11,foliageCard:12,importedBuilding:13,grassTerrain:14,asphalt:15,ocean:16,sand:17,snow:18};
function rgb(hex){
  if(!colors.has(hex)){
    colors.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  }
  return colors.get(hex);
}

class Mesh {
  vertices = [];
  base = 0;
  triangle(a,b,c,color,shade=1){
    const tint=rgb(color).map(channel=>channel*shade);
    for(const [x,y,z] of [a,b,c]){
      this.vertices.push(this.swapAxes?z:x,y+this.base,this.swapAxes?x:z,...tint);
    }
  }
  quad(a,b,c,d,color,shade){
    this.triangle(a,b,c,color,shade);
    this.triangle(a,c,d,color,shade);
  }
  plane(x,z,w,d,y,color){
    this.quad([x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],color);
  }
  box(x,z,w,d,bottom,top,color,angle=0){
    const l=x-w/2,r=x+w/2,n=z-d/2,s=z+d/2;
    const cs=Math.cos(angle),sn=Math.sin(angle);
    const point=(px,y,pz)=>angle?[x+(px-x)*cs-(pz-z)*sn,y,z+(px-x)*sn+(pz-z)*cs]:[px,y,pz];
    const a=point(l,top,n),b=point(r,top,n),c=point(r,top,s),e=point(l,top,s);
    const f=point(l,bottom,n),g=point(r,bottom,n),h=point(r,bottom,s),i=point(l,bottom,s);
    this.quad(a,b,c,e,color,1);
    this.quad(a,b,g,f,color,.85);
    this.quad(b,c,h,g,color,.66);
    this.quad(c,e,i,h,color,.79);
    this.quad(e,a,f,i,color,.94);
  }
  strip(ax,az,bx,bz,width,y,color){
    const length=Math.hypot(bx-ax,bz-az);
    const dx=(bz-az)*width/(2*length),dz=(ax-bx)*width/(2*length);
    this.quad([ax+dx,y,az+dz],[bx+dx,y,bz+dz],[bx-dx,y,bz-dz],[ax-dx,y,az-dz],color);
  }
  disc(x,z,r,y,color){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
      this.triangle([x,y,z],[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+r*Math.cos(b),y,z+r*Math.sin(b)],color);
    }
  }
  cone(x,z,r,y,height,color,sides=6){
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
      this.triangle([x,y+height,z],[x+r*Math.cos(a),y,z+r*Math.sin(a)],
        [x+r*Math.cos(b),y,z+r*Math.sin(b)],color,.71+i/sides*.29);
    }
  }
}

function fitFrostpineMountain(parts,span){
  const {west,east,north,south}=FROSTPINE_MOUNTAIN;
  const divisions=128,columns=divisions+1;
  const heights=Float32Array.from({length:columns**2},(_,i)=>
    groundHeight(west+(east-west)*(i%columns)/divisions,north+(south-north)*Math.floor(i/columns)/divisions));
  return parts.flatMap(part=>{
    const {vertices,elements}=part;
    for(let i=0;i<vertices.length;i+=9){
      const u=Math.max(0,Math.min(divisions-.0001,(vertices[i]/span[0]+.5)*divisions));
      const v=Math.max(0,Math.min(divisions-.0001,(vertices[i+2]/span[1]+.5)*divisions));
      const col=Math.floor(u),row=Math.floor(v),tx=u-col,tz=v-row,cell=row*columns+col;
      const h0=heights[cell]+(heights[cell+1]-heights[cell])*tx;
      const h1=heights[cell+columns]+(heights[cell+columns+1]-heights[cell+columns])*tx;
      vertices[i]=west+(east-west)*u/divisions;
      vertices[i+1]=h0+(h1-h0)*tz;
      vertices[i+2]=north+(south-north)*v/divisions;
    }
    const visible=[];
    for(let i=0;i<elements.length;i+=3){
      const a=elements[i],b=elements[i+1],c=elements[i+2];
      if(vertices[a*9+1]>18&&vertices[b*9+1]>18&&vertices[c*9+1]>18)visible.push(a,b,c);
    }
    return visible.length?[{...part,elements:new elements.constructor(visible)}]:[];
  });
}

function terrain(mesh,grass,ocean,sandGround,snowGround,showCity){
  ocean.plane(-1500,-1500,WORLD_WIDTH+3000,WORLD_HEIGHT+3000,-.5,'#468c99');
  const step=26;
  const landRow=z=>{
    const [west,east]=juniperShoreRange(z);
    const beach=Math.min(40,(east-west)/2);
    return Array.from({length:161},(_,i)=>{
      const x=west+beach+(east-west-2*beach)*i/160;
      return [x,groundHeight(x,z),z];
    });
  };
  let row=landRow(0);
  for(let z=0;z<SIZE;z+=step){
    const nextZ=Math.min(z+step,SIZE),next=landRow(nextZ);
    for(let i=0;i<row.length-1;i++){
      const a=row[i],b=row[i+1],c=next[i+1],d=next[i];
      const slope=(a[1]-c[1])*.012+(d[1]-b[1])*.009;
      grass.quad(a,b,c,d,'#818c63',Math.max(.81,Math.min(1.13,1+slope)));
    }
    const banks=juniperShoreRange(z),nextBanks=juniperShoreRange(nextZ);
    for(const side of [0,1]){
      const sign=side===0?-1:1;
      const i=side===0?0:row.length-1;
      const a=[banks[side],0,z],b=[nextBanks[side],0,nextZ];
      sandGround.quad(row[i],a,b,next[i],'#e9c99c');
      mesh.quad(a,[a[0]+sign*48,-.3,z],[b[0]+sign*48,-.3,nextZ],b,'#69aba4');
    }
    row=next;
  }
  const desertRow=z=>{
    const [left,right]=copperShoreRange(z);
    return Array.from({length:281},(_,i)=>{
      const x=left+(right-left)*i/280;
      return [x,copperTerrainHeight(x,z),z];
    });
  };
  let sand=desertRow(COPPER_SHORE.north);
  for(let z=COPPER_SHORE.north;z<COPPER_SHORE.south;z+=30){
    const next=desertRow(Math.min(z+30,COPPER_SHORE.south));
    for(let i=0;i<sand.length-1;i++){
      const a=sand[i],b=sand[i+1],c=next[i+1],d=next[i];
      const shade=Math.max(.78,Math.min(1.18,1+(a[1]-c[1])*.014));
      sandGround.quad(a,b,c,d,'#c89e6b',shade);
    }
    sand=next;
  }
  const snowRow=z=>Array.from({length:241},(_,i)=>{
    const x=5500+snowHalfWidth(z)*(i/120-1);
    return [x,groundHeight(x,z,showCity),z];
  });
  let ice=snowRow(5610);
  for(let z=5610;z<8510;z+=17){
    const next=snowRow(Math.min(z+17,8510));
    for(let i=0;i<ice.length-1;i++){
      const a=ice[i],b=ice[i+1],c=next[i+1],d=next[i];
      const slope=Math.max(.78,Math.min(1.05,1+(a[1]-c[1])*.012));
      snowGround.quad(a,b,c,d,'#c5d8df',slope);
    }
    ice=next;
  }
  for(let i=0;i<225;i++){
    const z=(i*97)%SIZE,x=juniperShoreRange(z)[1]+32+(i*103)%650;
    mesh.strip(x,z,x+8+i%20,z+.2,1.2,-.1,i%3?'#74a6aa':'#acd0c5');
  }
}

const copperConnectorByPath=new Map(COPPER_CONNECTORS.map(connector=>[connector.path,connector]));

function streets(mesh,asphalt,paths,includeCrosswalks=false){
  for(const route of paths){
    const connector=copperConnectorByPath.get(route);
    const directions=route.slice(1).map(([x,z],i)=>{
      const [ax,az]=route[i];
      const length=Math.hypot(x-ax,z-az);
      return {dx:(x-ax)/length,dz:(z-az)/length,length};
    });
    if(!directions.length)continue;
    const length=directions.reduce((sum,part)=>sum+part.length,0);
    const offsets=route.map((_,i)=>{
      const previous=directions[Math.max(0,i-1)],next=directions[Math.min(i,directions.length-1)];
      const divisor=Math.max(.5,1+previous.dx*next.dx+previous.dz*next.dz);
      return [(previous.dz+next.dz)/divisor,-(previous.dx+next.dx)/divisor];
    });
    for(const [surface,width,profile,y,tint] of [
      [mesh,sidewalkWidth,connector?.sidewalk,.06,'#b5aa9d'],
      [asphalt,roadWidth,connector?.width,.12,'#474c52']
    ]){
      if(!profile){
        route.forEach(([x,z],i)=>{
          surface.disc(x,z,width/2,y,tint);
          if(i)surface.strip(...route[i-1],x,z,width,y,tint);
        });
        continue;
      }
      const edge=(i,side)=>{
        const [x,z]=route[i],[nx,nz]=offsets[i];
        return [x+nx*profile[i]*side/2,y,z+nz*profile[i]*side/2];
      };
      for(let i=1;i<route.length;i++)surface.quad(edge(i-1,-1),edge(i,-1),edge(i,1),edge(i-1,1),tint);
    }
    let progress=0;
    for(const [i,{dx,dz,length:segment}] of directions.entries()){
      const [ax,az]=route[i];
      const left=Math.max(0,12-progress),right=Math.min(segment,length-12-progress);
      if(left<right){
        const start=Math.floor((progress+left-9)/25)*25+9;
        for(let dash=start;dash<progress+right;dash+=25){
          const from=Math.max(left,dash-progress),to=Math.min(right,dash+11-progress);
          if(from<to)mesh.strip(ax+dx*from,az+dz*from,ax+dx*to,az+dz*to,.95,.15,'#e8c57f');
        }
        const stripe=(side,inset,width,y,color)=>{
          const point=(distance,edge)=>{
            const t=distance/segment;
            const profile=connector?.width;
            const pavedWidth=profile?profile[i]+(profile[i+1]-profile[i])*t:roadWidth;
            const offset=side*(pavedWidth/2+inset)+edge;
            const ox=offsets[i][0]*(1-t)+offsets[i+1][0]*t;
            const oz=offsets[i][1]*(1-t)+offsets[i+1][1]*t;
            return [ax+dx*distance+ox*offset,y,az+dz*distance+oz*offset];
          };
          mesh.quad(point(left,-width/2),point(right,-width/2),
            point(right,width/2),point(left,width/2),color);
        };
        for(const side of [-1,1]){
          stripe(side,.45,1,.145,'#d2c8b9');
          stripe(side,-3,.52,.16,'#ddd1ad');
        }
      }
      progress+=segment;
    }
  }
  if(includeCrosswalks)for(const row of JUNIPER_ROWS)for(const z of [row-47,row+47]){
    for(let x=1742;x<=1795;x+=6)mesh.plane(x,z,3.3,5,.19,'#cbc8b8');
  }
}

function boulevardDetails(mesh,decorations,fallbacks){
  const planterWidth=7.5,planterLength=18;
  const planterRadius=Math.hypot(planterWidth/2,planterLength/2);
  for(const [x,z] of [[1719,1928],[1822,1958],[1821,1860],[1718,1778],[1821,1735],[1719,2087],[1825,2077],[1720,2052]]){
    if(overlapsSidewalk(x,z,planterRadius))continue;
    mesh.box(x,z,planterWidth,planterLength,.10,.73,'#b2a797');
    mesh.box(x,z,6.7,17.3,.73,.84,'#514839');
    for(const offset of [-6,0,6]){
      const kind=offset===0?'flower':'shrub';
      decorations.push({kind,x,z:z+offset,y:.84,height:1.8,radius:2.9,angle:offset*.4});
      crown(fallbacks[kind],x,1.08,z+offset,1.85,1.45,2.2,
        kind==='flower'?'#c89286':'#618449',offset*.4);
    }
    const outer=x<1770?-1:1;
    const potX=x+outer*5.3;
    const potZ=z+11;
    if(!overlapsSidewalk(potX,potZ,2)){
      decorations.push({kind:'planter',x:potX,z:potZ,y:groundHeight(potX,potZ),height:2.0,radius:1.5,angle:z*.17});
    }
    for(const offset of [-7,4]){
      const grassX=x+outer*6;
      const grassZ=z+offset;
      if(overlapsSidewalk(grassX,grassZ,2.5))continue;
      decorations.push({kind:'grass',x:grassX,z:grassZ,y:groundHeight(grassX,grassZ),height:1.9,radius:2.5,angle:z*.35+offset});
    }
  }
  for(const [x,z] of [[1820,1936],[1720,1884],[1820,1787],[1820,2074],[1720,2063]]){
    if(overlapsSidewalk(x,z,3.2))continue;
    const y=groundHeight(x,z);
    decorations.push({kind:'bench',x,z,y,height:3.1,radius:3.2,angle:x<1770?Math.PI:0});
    const bench=fallbacks.bench;
    for(const dz of [-2.15,2.15])bench.box(x,z+dz,.74,.42,y,y+1.93,'#47504e');
    bench.box(x,z,1.36,5.2,y+1.84,y+2.13,'#80664d');
    bench.box(x+(x<1770?.61:-.61),z,.24,5.2,y+2.39,y+3.27,'#92765e');
  }
  for(const [x,z] of [[1733,1957],[1807,2041]]){
    mesh.box(x,z,.46,.46,.1,12.6,'#545f65');
    mesh.box(x,z,1.55,1.52,8.7,12.6,'#303a3d');
    const face=z<2000?z-.79:z+.79;
    mesh.box(x,face,.89,.19,11.52,12.2,'#ae443b');
    mesh.box(x,face,.89,.19,10.43,11.11,'#957443');
    mesh.box(x,face,.89,.19,9.33,10.01,'#5a9871');
  }
}

function straitBridge(mesh,span,paintDeck=true){
  const {west,east,y,width,vertical}=span;
  const height=x=>bridgeHeight(x,span);
  mesh.swapAxes=vertical;
  function band(a,b,center,w,lift,color){
    const h1=height(a)+lift,h2=height(b)+lift;
    const l=y+center-w/2,r=y+center+w/2;
    mesh.quad([a,h1,l],[b,h2,l],[b,h2,r],[a,h1,r],color);
  }
  for(let x=west;x<east;x+=20){
    const end=Math.min(x+20,east);
    if(paintDeck)band(x,end,0,width,.2,'#505658');
    for(const side of [-1,1]){
      const offset=side*(width/2-2);
      band(x,end,offset,4,3.2,'#bdc4bd');
      for(const edge of [offset-2,offset+2]){
        const z=y+edge;
        mesh.quad([x,height(x)-1,z],[end,height(end)-1,z],
          [end,height(end)+3.2,z],[x,height(x)+3.2,z],'#9ba9a4');
      }
      if(paintDeck){
        band(x,end,side*(width/2-6),.95,.24,'#d9dacf');
        band(x,Math.min(x+9,end),side*31,.88,.24,'#e6e1d0');
        band(x,end,side*.9,.65,.24,'#f1bf66');
      }
    }
  }
  for(let x=west+160;x<east-100;x+=110){
    for(const side of [-1,1]){
      mesh.box(x,y+side*39,12,9,-1,height(x),'#a6afa8');
    }
    mesh.box(x,y,15,105,height(x)-2.4,height(x)-.5,'#949f9c');
  }
  for(let x=west+260;x<east-150;x+=280){
    for(const side of [-1,1]){
      const z=y+side*(width/2-2);
      mesh.box(x,z,1.3,1.3,8,29,'#718182');
      mesh.box(x,z-side*5,1.4,11,28,29,'#718182');
    }
  }
  mesh.swapAxes=false;
}

function harborRoadVertices(){
  const vertices=[];
  const {west,east,y,width}=CITY_BRIDGE;
  const start=CITY_APPROACHES[0][0][0];
  const end=CITY.x-515;
  const halfWidth=x=>{
    const blend=Math.max(0,1-Math.max((west-x)/85,(x-east)/(end-east),0));
    return (68+(width-68)*blend)/2;
  };
  const point=(x,side)=>{
    const slope=(bridgeHeight(x+1,CITY_BRIDGE)-bridgeHeight(x-1,CITY_BRIDGE))/2;
    return [x,bridgeHeight(x,CITY_BRIDGE)+.065,y+side*halfWidth(x),(x-end)/117,(side+1)/2,0,-slope,1,0];
  };
  const sections=[start,west-85,west,east,end];
  for(let i=1;i<sections.length;i++){
    const limit=sections[i];
    for(let x=sections[i-1];x<limit;x+=12){
      const next=Math.min(x+12,limit);
      const a=point(x,-1),b=point(next,-1),c=point(next,1),d=point(x,1);
      vertices.push(...a,...b,...c,...a,...c,...d);
    }
  }
  for(const [[ax,ay],[bx,by]] of CITY_LINKS){
    const length=Math.hypot(bx-ax,by-ay);
    const dx=(bx-ax)/length,dz=(by-ay)/length;
    const corner=(along,side)=>[ax+dx*along-dz*side*34,.065,ay+dz*along+dx*side*34,
      along/117,(side+1)/2,0,0,1,0];
    const a=corner(0,-1),b=corner(length,-1),c=corner(length,1),d=corner(0,1);
    vertices.push(...a,...b,...c,...a,...c,...d);
  }
  return new Float32Array(vertices);
}

function harborBeach(mesh){
  const bands=[
    {inset:0,height:-.47,color:'#9d9471'},
    {inset:12,height:-.29,color:'#bfaa7a'},
    {inset:32,height:-.18,color:'#d6bd89'}
  ].map(band=>({...band,rows:cityCoastRows(band.inset).map(([z,west,east])=>[
    [west,band.height,z],[east,band.height,z]
  ])}));
  for(let layer=1;layer<bands.length;layer++){
    const outer=bands[layer-1],inner=bands[layer];
    for(let i=1;i<outer.rows.length;i++){
      for(const side of [0,1]){
        mesh.quad(outer.rows[i-1][side],outer.rows[i][side],inner.rows[i][side],inner.rows[i-1][side],outer.color);
      }
    }
    for(const row of [0,outer.rows.length-1]){
      mesh.quad(...outer.rows[row],...inner.rows[row].slice().reverse(),outer.color);
    }
  }
  const inland=bands.at(-1);
  for(let i=1;i<inland.rows.length;i++){
    mesh.quad(...inland.rows[i-1],...inland.rows[i].slice().reverse(),inland.color);
  }
}

function desertScenery(mesh){
  for(let i=0;i<1120;i++){
    const x=COPPER_SHORE.west+(i*173.79)%(COPPER_SHORE.east-COPPER_SHORE.west);
    const z=COPPER_SHORE.north+(i*103.61)%(COPPER_SHORE.south-COPPER_SHORE.north);
    if(!isDesert(x,z)||inCopperDistrict(x,z,30)||isRoad(x,z)||overlapsSidewalk(x,z,12))continue;
    mesh.base=copperTerrainHeight(x,z);
    const h=5+i%10,color=i%2?'#59784f':'#4a6c4c';
    branch(mesh,[x,0,z],[x,h,z],.64,.45,color);
    for(const side of [-1,1]){
      const arm=1.5+(i%4)*.25;
      branch(mesh,[x,h*.37,z],[x+side*arm,h*.47,z],.34,.30,color);
      branch(mesh,[x+side*arm,h*.47,z],[x+side*arm,h*(side===1?.78:.66),z],.30,.20,color);
    }
  }
  mesh.base=0;
}

function gable(mesh,x,z,w,d,y,rise,color){
  const l=x-w/2,r=x+w/2,n=z-d/2,s=z+d/2;
  const a=[l,y,n],b=[r,y,n],c=[r,y,s],e=[l,y,s];
  const north=[x,y+rise,n],south=[x,y+rise,s];
  mesh.quad(a,north,south,e,color,.89);
  mesh.quad(north,b,c,south,color,1.06);
  mesh.triangle(a,b,north,color,.69);
  mesh.triangle(e,south,c,color,.79);
}

function facade(mesh,b,base,top,spacing,kind){
  const {x,y:z,w,d}=b;
  const glass=kind==='glass';
  for(const side of [-1,1]){
    for(let y=base;y+4<top;y+=spacing){
      for(const facingX of [true,false]){
        const span=facingX?d:w;
        const count=Math.max(2,Math.floor(span/(glass?5.1:8.2)));
        const bay=span/count;
        for(let i=0;i<count;i++){
          const offset=(i+.5)*bay-span/2;
          const wx=facingX?x+side*(w/2+.12):x+offset;
          const wz=facingX?z+offset:z+side*(d/2+.12);
          const width=bay*(glass?.89:.56);
          const tint=glass?['#6f939d','#567782','#779ca4'][(i+Math.floor(y/spacing))%3]
            : i%4===0?'#80918a':'#42606a';
          mesh.box(wx,wz,facingX?.47:width,facingX?width:.47,y,y+(glass?spacing-1.05:3.6),tint);
          const lit=(i*3+Math.round(x+z+y)+side)%7;
          if(lit>=0&&lit<4){
            const glow=mesh.windowLights;
            glow.base=mesh.base;
            glow.box(wx+(facingX?side*.22:0),wz+(facingX?0:side*.22),
              facingX?.28:width*.88,facingX?width*.88:.28,y+.16,y+(glass?spacing-1.24:3.4),
              lit===0?'#ffe6ba':lit===1?'#e8ecda':'#ffcb83');
          }
          if(!glass){
            mesh.box(wx,wz,facingX?.86:width+.65,facingX?width+.65:.86,y-.27,y,'#c8b69b');
          }
        }
      }
    }
  }
}

function towerFrontage(mesh,b,side){
  const {x,y:z,w,d,h}=b;
  const face=x+side*w*.44;
  // Recess the ground-floor glass behind a stone frame and a continuous canopy.
  mesh.box(x+side*w*.5,z,.78,d*.84,.72,8.1,'#34454d');
  for(const fraction of [-.42,-.24,-.075,.075,.24,.42]){
    mesh.box(x+side*(w*.5+.5),z+d*fraction,1.35,.78,.55,8.9,'#c5bcb0');
  }
  mesh.box(x+side*(w*.5+2.2),z,5.3,d*.89,7.89,8.36,'#aaa49c');
  mesh.box(x+side*(w*.5+4.65),z,.41,d*.89,8.20,8.48,'#e2dacf');

  for(let y=19.1;y+6<h;y+=14.2){
    for(const fraction of [-.23,.23]){
      const center=z+d*fraction;
      const span=d*.38;
      mesh.box(face+side*1.67,center,4.3,span,y-.55,y,'#c7c4bb');
      mesh.box(face+side*3.68,center,.33,span,y,y+1.48,'#93aaaf');
      mesh.box(face+side*3.72,center,.37,span,y+1.48,y+1.62,'#d1d6d3');
      for(const post of [-.48,-.16,.16,.48]){
        mesh.box(face+side*3.76,center+span*post,.24,.24,y,y+1.62,'#687d83');
      }
    }
  }
}

function downtown(mesh,b){
  const {x,y:z,w,d,h,style}=b;
  const side=b.desert?(x<7350?1:-1):(x<1770?1:-1);
  const curb=x+side*w/2;
  const lotWidth=w+10;
  mesh.box(x+side*3,z,lotWidth,d+11,-2,.48,'#aaa99a');
  if(style==='glass'){
    mesh.box(x,z,w,d,.5,11,'#aaa89d');
    mesh.box(x,z,w*.88,d*.89,11,h,'#344d55');
    facade(mesh,{...b,w:w*.88,d:d*.89},12,h,7.1,style);
    mesh.box(x,z,w*.9,d*.91,h,h+1.2,'#c3c2b5');
    mesh.box(x,z,w*.42,d*.46,h+1.2,h+8,'#758588');
    mesh.box(x-3,z+4,.65,.65,h+8,h+17,'#6b7472');
    towerFrontage(mesh,b,side);
  }else if(style==='stucco'){
    mesh.box(x,z,w,d,.5,h,b.desert?'#e2b589':'#d9c4a1');
    facade(mesh,b,10,h,8,style);
    for(let y=10;y+4<h;y+=8){
      for(const shift of [-d*.27,0,d*.27]){
        mesh.box(curb+side*1.8,z+shift,4.4,7.4,y-.8,y-.16,'#e8d7bd');
        mesh.box(curb+side*3.7,z+shift,.27,7.4,y+1.12,y+1.28,'#6c7778');
        for(let i=-3;i<=3;i++){
          mesh.box(curb+side*3.7,z+shift+i*1.1,.22,.21,y-.16,y+1.12,'#758283');
        }
      }
    }
    mesh.box(x,z,w+1.45,d+1.45,h,h+1.4,'#ece0c7');
    gable(mesh,x,z,w+1.6,d+1.5,h+1.4,7,'#a05945');
  }else if(style==='brick'){
    mesh.box(x,z,w,d,.5,h,b.desert?'#ae7150':'#a36e58');
    facade(mesh,b,10,h,8.2,style);
    for(let y=8;y<h;y+=8.2){
      mesh.box(x,z,w+.22,d+.22,y-.15,y+.23,'#be8f74');
    }
    mesh.box(x,z,w+1.1,d+1.1,h,h+1.45,'#ccaa8c');
    mesh.box(x-4,z+6,w*.35,d*.32,h+1.45,h+6.2,'#826a5e');
    mesh.box(curb,z,3.5,12,7.1,8,'#6c574c');
  }else{
    mesh.box(x,z,w,d,.5,h,'#c7aa88');
    mesh.box(x,z,w+1.2,d+1.2,h-1,h+1,'#d6c0a0');
    for(let i=-2;i<=2;i++){
      mesh.box(curb+side*.17,z+i*d*.18,.45,d*.155,1.25,6.6,'#41626a');
      mesh.box(curb+side*1.8,z+i*d*.18,4,d*.183,6.45,7.34,i%2?'#e5cead':'#577c70');
    }
    mesh.box(x-2,z+4,12,9,h+1,h+3.5,'#8c8f87');
  }
  mesh.box(curb+side*.28,z,.65,7.2,.53,5.9,'#506a70');
  mesh.box(curb+side*.65,z,.45,.32,.55,5.9,'#c4baac');
  mesh.box(curb+side*3,z+d*.38,3.2,4.4,.48,1.85,'#797c69');
}

function architecture(mesh,replaced){
  for(const b of buildings){
    if(b.fullOnly||replaced.has(b))continue;
    const {x,y:z,w,d,h,roof,style}=b;
    mesh.base=groundHeight(x,z);
    if(b.importedTower){
      downtown(mesh,basicTowerLot(b));
      continue;
    }
    if(style){downtown(mesh,b);continue;}
    const wall=b.snow?'#987d69':roof==='#99a6a2'?'#b4c3bc':roof==='#b97964'?'#d6b59a':'#e0c39d';
    const eaves=h*.71;
    mesh.box(x,z,w+4,d+4,-3,.8,'#b2a58d');
    mesh.box(x,z,w,d,.8,eaves,wall);
    gable(mesh,x,z,w+2.2,d+2.2,eaves,h*.28,b.snow?'#d9e4e7':roof==='#99a6a2'?'#657675':'#9f624b');
    facade(mesh,b,4,eaves,8,'house');
    mesh.box(x+w*.15,z+d*.51,3.5,1.2,.8,6.5,'#685a4d');
    mesh.box(x+w*.15,z+d*.54,8,4,5.9,6.7,'#b88b6a');
    mesh.box(x-w*.22,z-d*.17,2.8,2.8,eaves,h+2,'#8f6a58');
  }
  mesh.base=0;
}

function branch(mesh,a,b,r1,r2,color){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
  const length=Math.hypot(dx,dy,dz);
  const flat=Math.hypot(dx,dz);
  const side=flat?[dz/flat,0,-dx/flat]:[1,0,0];
  const up=[-dy*side[2]/length,(dx*side[2]-dz*side[0])/length,dy*side[0]/length];
  const point=(p,r,i)=>p.map((value,j)=>value+r*(side[j]*Math.cos(i*Math.PI/3)+up[j]*Math.sin(i*Math.PI/3)));
  for(let i=0;i<6;i++)mesh.quad(point(a,r1,i),point(a,r1,i+1),point(b,r2,i+1),point(b,r2,i),color,.77+i*.06);
}

function crown(mesh,x,y,z,rx,ry,rz,color,phase){
  const ring=i=>{
    const a=i*Math.PI/3+phase;
    const rough=.83+.16*Math.sin(i*3.2+phase*4);
    return [x+Math.cos(a)*rx*rough,y+Math.sin(i*2.2+phase)*ry*.24,z+Math.sin(a)*rz*rough];
  };
  for(let i=0;i<6;i++){
    mesh.triangle([x-rx*.16,y+ry,z+rz*.13],ring(i),ring(i+1),color,.91+i*.035);
    mesh.triangle([x+rx*.12,y-ry*.69,z],ring(i+1),ring(i),color,.64+i*.035);
  }
}

function palm(mesh,x,z,height,phase){
  const foot=[x,0,z],mid=[x+Math.cos(phase)*1.6,height*.46,z+Math.sin(phase)*1.6];
  const top=[x+Math.cos(phase)*4.1,height,z+Math.sin(phase)*4.1];
  branch(mesh,foot,mid,.82,.56,'#8d7859');
  branch(mesh,mid,top,.56,.44,'#a08a69');
  for(let i=0;i<11;i++){
    const a=i*Math.PI*2/11+phase;
    const length=7.1+height*.075+(i%3)*1.23;
    const point=(step,side)=>{
      const t=step/5;
      const spread=Math.sin(t*Math.PI)*1.17*side;
      return [top[0]+Math.cos(a)*length*t-Math.sin(a)*spread,
        height+Math.sin(t*Math.PI)*2.6-t*t*(2.2+i%3*.41)-Math.abs(side)*.34,
        top[2]+Math.sin(a)*length*t+Math.cos(a)*spread];
    };
    const leaf=i%3===0?'#779441':i%3===1?'#4e743a':'#45663a';
    for(let j=0;j<8;j++){
      const t=j*5/8,next=(j+1)*5/8;
      mesh.quad(point(t,-.09),point(next,-.09),point(next,.09),point(t,.09),'#889052');
      if(j===0)continue;
      for(const side of [-1,1]){
        const root=point(t,0),tip=point(Math.min(5,next+.35),side*1.36);
        mesh.triangle(root,point(next,0),tip,leaf);
        mesh.triangle(root,tip,point(next-.12,side*.51),leaf,.87);
      }
    }
  }
}

function evergreen(mesh,x,z,h,r,phase,leaf,snow=false){
  const tips=9;
  for(let tier=0;tier<6;tier++){
    const y=h*(.29+tier*.135);
    const width=r*(.68-tier*.091);
    const a=phase+tier*.45;
    const point=i=>{
      const angle=i*Math.PI*2/tips+a;
      const spread=width*(.78+.19*Math.cos(i*2.7+tier)+.09*Math.sin(i*4.2+a));
      return [x+Math.cos(angle)*spread,y+Math.sin(i*2.3+a)*h*.057,z+Math.sin(angle)*spread];
    };
    for(let i=0;i<tips;i++){
      mesh.triangle([x+Math.sin(a)*width*.18,y+h*.31,z+Math.cos(a)*width*.19],
        point(i),point(i+1),snow&&i%4!==0?'#c1d4d9':leaf,.72+i*.035);
      const p=point(i),q=point(i+1);
      mesh.triangle([x,y-h*.039,z],p,q,'#38543d',.76+i*.025);
    }
  }
}

function projectStreetShadow(source,target,start=0){
  // The downtown boulevard and sidewalks sit on a common, level grade.
  const [sx,sy,sz]=sunDirection;
  for(let i=start;i<source.vertices.length;i+=6){
    const [x,y,z]=source.vertices.slice(i,i+3);
    target.vertices.push(x-y*sx/sy,.205,z-y*sz/sy,0,0,0);
  }
}

function sceneryGeometry(mesh,t,x=t.x,z=t.y){
  if(t.streetlight){
    const height=t.footpathLamp?8:13.6;
    mesh.box(x,z,.7,.7,0,height-.6,'#53666a');
    mesh.box(x,z,1.65,1.65,height-1.65,height,'#d4d2ad');
    return;
  }
  const {r,shade,type,snow}=t;
  if(isPalm(t)){
    palm(mesh,x,z,t.height??13+r*.76,t.phase??shade*6.28);
    return;
  }
  const phase=shade*6.28;
  const h=r*(1.38+shade*.47);
  const trunk=[x+r*.12*Math.cos(phase),h*.62,z+r*.12*Math.sin(phase)];
  branch(mesh,[x,0,z],trunk,r*.09,r*.045,'#79664d');
  const leaf=shade>.65?'#718854':shade>.31?'#597744':'#4b6a47';
  if(snow||type<.27){
    branch(mesh,trunk,[x,h*1.15,z],r*.045,.22,'#77644c');
    evergreen(mesh,x,z,h,r,phase,shade>.5?'#54734c':'#496646',snow);
  }else{
    for(let i=0;i<4;i++){
      const a=i*Math.PI*.5+phase;
      const cx=x+Math.cos(a)*r*.43,cz=z+Math.sin(a)*r*.43;
      const cy=h*(.68+(i%3)*.105);
      branch(mesh,trunk,[cx,cy,cz],r*.043,r*.019,'#76644c');
      crown(mesh,cx,cy+r*.11,cz,r*.53,r*.41,r*.51,leaf,a);
      crown(mesh,cx+Math.cos(a)*r*.26,cy+r*.29,cz+Math.sin(a)*r*.26,r*.37,r*.28,r*.34,
        i%2?'#6d8752':leaf,a+.7);
    }
    crown(mesh,x,h*.99,z,r*.49,r*.43,r*.49,leaf,phase);
  }
}

function landmarks(mesh,replaced){
  for(const site of stadiums)if(!replaced.has(site))drawStadium(mesh,site);
  if(!replaced.has(lighthouse))drawLighthouse(mesh);
}

function drawStadium(mesh,stadium){
  const {x,y:z,w,d}=stadium;
  const {fieldWidth,fieldDepth,boxes}=stadiumDriveLayout(stadium);
  mesh.box(x,z,w,d,-.65,.04,'#b8ada1');
  mesh.plane(x-fieldWidth/2,z-fieldDepth/2,fieldWidth,fieldDepth,.10,'#5e844c');
  for(const stand of boxes){
    mesh.box(stand.x,stand.y,stand.w,stand.d,.04,17,'#8f989c');
    mesh.box(stand.x,stand.y,stand.w,stand.d,17,19,'#bdc3c5');
  }
  for(const side of [-1,1])for(const end of [-1,1]){
    const px=x+end*w*.36,pz=z+side*d*.41;
    mesh.box(px,pz,2,2,19,stadium.h*.84,'#68747a');
    mesh.box(px,pz,13,4,stadium.h*.84,stadium.h*.90,'#e8dcc0');
  }
  mesh.strip(x,z-fieldDepth/2,x,z+fieldDepth/2,.6,.13,'#e0e0c7');
}

function drawLighthouse(mesh){
  const beacon=lighthouse;
  mesh.base=groundHeight(beacon.x,beacon.y);
  mesh.box(beacon.x,beacon.y,25,25,-3,.34,'#ab9c81');
  for(let i=0;i<5;i++){
    branch(mesh,[beacon.x,i*8,beacon.y],[beacon.x,(i+1)*8,beacon.y],10-i*.9,9.1-i*.9,
      i%2?'#a34e40':'#e4d9bf');
  }
  mesh.disc(beacon.x,beacon.y,8.1,40.15,'#a9a38c');
  branch(mesh,[beacon.x,40,beacon.y],[beacon.x,46,beacon.y],5.3,5.3,'#577f83');
  mesh.cone(beacon.x,beacon.y,6.7,46,5,'#884a40',8);
  mesh.box(beacon.x,beacon.y,5,4,-.2,6,'#62584d');
  mesh.base=0;
}

function roadside(mesh){
  const palette=['#899150','#657843','#a49d62','#767d49'];
  let seed=149;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
  for(let i=0;i<7900;i++){
    const x=random()*SIZE,z=random()*SIZE;
    const banks=juniperShoreRange(z);
    if(!banks||x<banks[0]+47||x>banks[1]-47||buildings.some(b=>Math.abs(x-b.x)<b.w/2+7&&Math.abs(z-b.y)<b.d/2+7))continue;
    const elevation=groundHeight(x,z);
    if(elevation<.28)continue;
    mesh.base=elevation-.15;
    if(i%18===0){
      const r=1.8+random()*4.1,phase=random()*6.28;
      if(!overlapsSidewalk(x,z,r))crown(mesh,x,r*.16,z,r,r*.59,r*.68,i%2?'#8f8d79':'#aaa58b',phase);
    }else{
      const height=.85+random()*2.1;
      const clear=!overlapsSidewalk(x,z,height*.46+.27);
      for(let j=0;j<4;j++){
        const a=random()*6.28,dx=Math.cos(a),dz=Math.sin(a);
        const bladeHeight=height*(.45+random()*.65);
        if(clear)mesh.triangle([x-dz*.27,0,z+dx*.27],[x+dz*.27,0,z-dx*.27],
          [x+dx*height*.46,bladeHeight,z+dz*height*.46],palette[(i+j)%4]);
      }
    }
  }
  mesh.base=0;
}

export const WHEEL_RADIUS=2.75;
const axles=CAR_AXLES;
const track=4.93;

function makeShadow(){
  const mesh=new Mesh();
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
    mesh.triangle([0,.18,0],[21*Math.cos(a),.18,10.3*Math.sin(a)],
      [21*Math.cos(b),.18,10.3*Math.sin(b)],'#3d4545');
  }
  return mesh;
}

function bodySection(x,width,bottom,shoulder,top,arch){
  const side=arch>bottom?width*.99:width*.88;
  return [[x,Math.max(bottom,arch),-side],[x,Math.max(shoulder,arch+.12),-width],[x,top,-width*.83],
    [x,top,width*.83],[x,Math.max(shoulder,arch+.12),width],[x,Math.max(bottom,arch),side]];
}

const singleExhaust=[-4.2];

function insetQuad(mesh,corners,outer,inner,amount=.09){
  const center=corners[0].map((_,axis)=>corners.reduce((sum,point)=>sum+point[axis],0)/4);
  const inset=corners.map(point=>point.map((value,axis)=>value+(center[axis]-value)*amount));
  for(let i=0;i<4;i++){
    const next=(i+1)%4;
    mesh.quad(corners[i],corners[next],inset[next],inset[i],outer);
  }
  mesh.quad(...inset,inner);
}

function makeCar({paint,roof,cabin,spoiler,rails,rugged,exhausts=singleExhaust,beltLift=rugged?1.9:0}){
  const m=new Mesh();
  const profile=[
    [-16.7,5.6,2.25,4.15,5.15],
    [-14.8,6.6,2.05,4.95,6.02],
    [-10,7.35,2.25,5.62,6.27],
    [-5.8,6.9,2.23,5.18,6.34],
    [4.7,6.73,2.26,5.17,6.35],
    [9.7,7.43,2.24,5.62,6.25],
    [13.4,6.84,2.25,4.95,5.96],
    [16.65,5.65,2.15,4.14,4.95],
  ];
  const archRadius=3.22;
  const archPoints=axles.flatMap(axle=>Array.from({length:13},(_,i)=>axle+archRadius*Math.cos(i*Math.PI/12)));
  const positions=[...new Set([...profile.map(([x])=>x),...archPoints])].sort((a,b)=>a-b);
  const sections=positions.map(x=>{
    const right=profile.findIndex(([position])=>position>=x);
    const start=profile[Math.max(0,right-1)],end=profile[right];
    const fraction=right===0?0:(x-start[0])/(end[0]-start[0]);
    const dimensions=start.slice(1).map((value,i)=>value+(end[i+1]-value)*fraction);
    dimensions[2]+=beltLift*.76;
    dimensions[3]+=beltLift;
    const offset=Math.min(...axles.map(axle=>Math.abs(x-axle)));
    const arch=offset<=archRadius+.0001
      ? WHEEL_RADIUS+.14+Math.sqrt(Math.max(0,archRadius**2-offset**2))
      : 0;
    return bodySection(x,...dimensions,arch);
  });
  for(let i=1;i<sections.length;i++){
    const previous=sections[i-1],next=sections[i];
    for(let f=0;f<5;f++)m.quad(previous[f],next[f],next[f+1],previous[f+1],paint[f]);
    for(const edge of [0,5]){
      const a=previous[edge],b=next[edge];
      if(a[1]<2.5&&b[1]<2.5)continue;
      const inside=([x,y,z])=>[x,y-.13,z-Math.sign(z)*.68];
      m.quad(a,b,inside(b),inside(a),paint[0]);
    }
  }
  for(const end of [0,sections.length-1]){
    const face=sections[end];
    for(let i=1;i<face.length-1;i++)m.triangle(face[0],face[i],face[i+1],paint[3]);
  }
  const [roofFront,roofRear,glassRear,roofHeight]=cabin;
  const front=[5.8,6.21+beltLift,4.95],rear=[glassRear,6.06+beltLift,4.96];
  const nw=[roofFront,roofHeight+.06,-3.86],ne=[roofFront,roofHeight+.06,3.86];
  const sw=[roofRear,roofHeight,-3.94],se=[roofRear,roofHeight,3.94];
  insetQuad(m,[[front[0],front[1],-front[2]],front,ne,nw],'#242c32','#526f79');
  insetQuad(m,[[rear[0],rear[1],-rear[2]],rear,se,sw],'#23292e','#324e5c');
  m.quad(nw,ne,se,sw,roof);
  if(spoiler){
    for(const z of [-3.5,3.5])m.box(-15,z,.85,.7,5.7,7.1,'#343d41');
    m.box(-15,0,2.3,12.7,7.06,7.59,paint[1]);
  }
  if(rails){
    for(const z of [-3,3]){
      for(const x of [-10,0])m.box(x,z,.8,.6,roofHeight,roofHeight+.75,'#444e50');
      m.box(-5,z,12,.46,roofHeight+.7,roofHeight+1.04,'#586366');
    }
  }
  for(const side of [-1,1]){
    const lower=(x,y,z)=>[x,y,z*side];
    const a=lower(front[0],front[1],5),b=lower(rear[0],rear[1],5),c=lower(roofRear,roofHeight,3.94),d=lower(roofFront,roofHeight+.06,3.86);
    insetQuad(m,[a,b,c,d],'#252b2d',side===1?'#496771':'#65818a');
    const pillarX=(roofFront+roofRear)/2;
    m.quad(lower(pillarX-.24,6.15+beltLift,5.02),lower(pillarX+.24,6.15+beltLift,5.02),
      lower(pillarX+.24,roofHeight+.03,3.94),lower(pillarX-.24,roofHeight+.03,3.94),'#2c3035');
    m.box(3.35,side*6.1,1.9,1.45,6.4+beltLift,7.15+beltLift,paint[1]);
    m.box(-3.15,side*6.21,1.15,.28,4.8+beltLift*.65,5.08+beltLift*.65,'#dec0a1');
    m.box(-.55,side*6.05,9.1,.35,2.21,2.63,'#393e40');
    m.box(-2.4,side*6.2,.11,.12,2.68,4.61,'#693b33');
  }
  m.box(-16.72,0,.85,11.25,1.85,2.42,'#343d41');
  m.box(16.68,0,.65,10.7,2.0,2.52,'#303c40');
  m.box(-16.71,0,.26,9.8,3.08,4.64,'#403c3a');
  m.box(-16.9,0,.15,3.39,3.01,3.91,'#272b2d');
  m.box(-17.01,0,.11,3.04,3.12,3.79,'#e2ddd0');
  m.box(-17.09,0,.07,2.81,3.64,3.74,'#9a764a');
  for(const z of [-.91,-.59,-.21,.18,.55,.85]){
    m.box(-17.09,z,.06,.105,3.29,3.55,'#41403c');
  }
  m.box(-17.20,0,.12,10.9,2.40,2.53,'#a5a4a1');
  m.box(-16.93,0,.14,.67,4.31,4.64,'#aaa8a0');
  m.box(16.72,0,.19,5.3,2.95,3.77,'#252f32');
  for(const z of [-3.85,3.85]){
    m.box(-16.96,z,.31,2.73,3.43,4.63,'#24262b');
    m.box(-17.15,z,.11,2.43,4.07,4.49,'#ac262c');
    m.box(-17.15,z+Math.sign(z)*.77,.12,.84,3.60,3.99,'#aa602b');
    m.box(-17.15,z-Math.sign(z)*.48,.12,1.29,3.60,3.99,'#8c252b');
    for(let i=-2;i<=2;i++)m.box(-17.22,z+i*.45,.045,.10,4.10,4.44,'#e45751');
    if(rugged){
      const side=Math.sign(z);
      m.box(16.76,z,.31,2.75,4.14,5.73,'#24333b');
      m.box(16.95,z,.17,2.42,4.35,5.53,'#6c8795');
      m.box(17.06,z-side*.34,.12,1.17,4.61,5.23,'#e8f3f5');
      m.box(17.08,z,.11,2.47,5.38,5.57,'#f2fbff');
      m.box(17.08,z+side*1.12,.11,.22,4.44,5.47,'#f2fbff');
      m.box(17.04,z+side*.83,.11,.35,4.4,4.65,'#d99047');
    }else{
      m.box(16.72,z,.21,2.25,3.88,4.66,'#e9dfbf');
    }
  }
  if(rugged){
    for(const z of [-6.6,6.6])m.box(0,z,11,.8,1.65,2.45,'#2d363b');
    m.box(17,0,.9,10.3,2.24,3.25,'#404b50');
    m.box(-17,0,.65,10.3,1.85,2.7,'#404b50');
  }
  for(const side of exhausts){
    m.box(-16.65,side,1.65,.89,1.5,2.01,'#839194');
    m.box(-17.49,side,.13,.61,1.62,1.89,'#262d30');
  }
  return m;
}

function rearLamps({x=-17.24,y=4.285,z:offset=3.85,width=2.43}={}){
  const lenses=new Mesh(),glow=new Mesh();
  for(const z of [-offset,offset]){
    lenses.box(x,z,.08,width,y-.195,y+.195,'#ff533d');
    const corners=[
      [x-.06,y-3.1,z-4.1,0,0,0],[x-.06,y-3.1,z+4.1,1,0,0],
      [x-.06,y+3.1,z+4.1,1,1,0],[x-.06,y+3.1,z-4.1,0,1,0]
    ];
    for(const index of [0,1,2,0,2,3])glow.vertices.push(...corners[index]);
  }
  return {lenses,glow};
}

function makeWheel({spokes,split=false,rim,finish,lip,inner,outer,sweep=0,bolts=false}){
  const m=new Mesh();
  const point=(r,a,z)=>[r*Math.cos(a),r*Math.sin(a),z];
  const rings=[[WHEEL_RADIUS-.43,-1.56],[WHEEL_RADIUS,-1.11],[WHEEL_RADIUS,1.11],[WHEEL_RADIUS-.43,1.56]];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    for(let j=1;j<rings.length;j++){
      const [r1,z1]=rings[j-1],[r2,z2]=rings[j];
      const color=j===2?(i%2?'#292e30':'#363b3e'):'#22272b';
      m.quad(point(r1,a,z1),point(r1,b,z1),point(r2,b,z2),point(r2,a,z2),color);
    }
    for(const side of [-1,1]){
      const z=side*1.57;
      m.quad(point(rim,a,z),point(rim,b,z),point(rings[0][0],b,z),point(rings[0][0],a,z),'#282e32');
      m.triangle([0,0,z],point(rim,a,z),point(rim,b,z),'#414b51');
      m.quad(point(rim,a,z+side*.04),point(rim,b,z+side*.04),
        point(rim-.2,b,z+side*.04),point(rim-.2,a,z+side*.04),lip);
    }
  }
  for(const side of [-1,1]){
    const z=side*1.62;
    for(let i=0;i<spokes;i++){
      const a=i*Math.PI*2/spokes;
      for(const branch of (split?[-1,1]:[0])){
        const root=a+branch*.075;
        const tip=a+side*sweep+branch*.13;
        m.quad(point(.28,root-inner,z),point(rim-.09,tip-outer,z),
          point(rim-.09,tip+outer,z),point(.28,root+inner,z),finish);
      }
    }
    if(bolts){
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        const radius=rim-.125;
        const x=radius*Math.cos(a),y=radius*Math.sin(a),face=z+side*.014;
        m.quad([x-.055,y-.055,face],[x+.055,y-.055,face],
          [x+.055,y+.055,face],[x-.055,y+.055,face],'#c2ccce');
      }
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      m.triangle([0,0,z+side*.03],point(.36,a,z+side*.03),point(.36,b,z+side*.03),finish);
    }
  }
  return m;
}

function makeGate(){
  const m=new Mesh();
  for(const x of [-23,23]){
    m.box(x,0,2.3,2.3,0,17,'#f8b644');
    m.box(x,0,4,4,0,1.2,'#ba8951');
  }
  m.box(0,0,48,2,16,18,'#ffcb65');
  m.quad([-3,17,0],[0,21,0],[3,17,0],[0,13,0],'#fff0a4');
  return m;
}

function shader(gl,type,source){
  const object=gl.createShader(type);
  gl.shaderSource(object,source);
  gl.compileShader(object);
  if(!gl.getShaderParameter(object,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(object));
  return object;
}

export function makeScene(canvas,onProgress=()=>{},{basic=false}={}){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,stencil:true});
  if(!gl)return null;
  const program=gl.createProgram();
  const derivatives=gl.getExtension('OES_standard_derivatives');
  const fragmentPrecision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'highp':'mediump';
  gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,`
    attribute vec3 position;
    attribute vec3 color, modelNormal;
    uniform ${fragmentPrecision} vec3 eye;
    uniform vec3 right, up, forward, origin;
    uniform vec2 turn, spin;
    uniform float aspect, zoom, meshScale;
    uniform mediump float smokeScale;
    varying ${fragmentPrecision} vec3 tint;
    varying ${fragmentPrecision} float depth, rearAngle;
    varying ${fragmentPrecision} vec2 surface;
    varying ${fragmentPrecision} vec3 worldPosition, importedNormal;
    void main(){
      vec3 local=vec3(position.x*spin.x-position.y*spin.y, position.x*spin.y+position.y*spin.x, position.z)*meshScale;
      worldPosition=vec3(local.x*turn.x-local.z*turn.y,local.y,local.x*turn.y+local.z*turn.x)+origin;
      vec3 n=vec3(modelNormal.x*spin.x-modelNormal.y*spin.y,modelNormal.x*spin.y+modelNormal.y*spin.x,modelNormal.z);
      importedNormal=vec3(n.x*turn.x-n.z*turn.y,n.y,n.x*turn.y+n.z*turn.x);
      vec3 p=worldPosition-eye;
      float z=dot(p,forward);
      gl_Position=vec4(dot(p,right)*zoom/aspect,dot(p,up)*zoom,z*1.001-2.001,z);
      if(smokeScale>0.0){
        float size=color.y==3.0?5.0+color.x*2.0:2.0+color.x*(color.y>0.5?12.0:7.0);
        gl_PointSize=clamp(size*smokeScale/max(z,1.0),1.0,84.0);
      }
      tint=color;
      depth=z;
      rearAngle=dot(p.xz,turn);
      surface=position.xz;
    }
  `));
  gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,`
    ${derivatives?"#extension GL_OES_standard_derivatives : enable":""}
    precision ${fragmentPrecision} float;
    uniform vec3 haze;
    uniform float material, dusk, night, lamps, emissive, waterTime;
    uniform vec3 eye;
    uniform vec3 skyTop, assetTint;
    uniform float assetGloss,assetCutout,assetRepeat,windowGlass;
    uniform sampler2D assetTexture;
    uniform vec3 headlightOrigin;
    uniform vec4 trafficHeadlights[${trafficLightLimit}];
    uniform vec4 trafficLightHeights;
    uniform int trafficLightCount;
    uniform vec2 headlightDirection;
    uniform mediump float smokeScale;
    varying ${fragmentPrecision} vec3 tint;
    varying ${fragmentPrecision} float depth, rearAngle;
    varying ${fragmentPrecision} vec2 surface;
    varying ${fragmentPrecision} vec3 worldPosition, importedNormal;
    float hash(vec2 cell){
      vec3 p=fract(vec3(cell.xyx)*0.1031);
      p+=dot(p,p.yzx+33.33);
      return fract((p.x+p.y)*p.z);
    }
    float noise(vec2 p){
      vec2 cell=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),f.x),
        mix(hash(cell+vec2(0.0,1.0)),hash(cell+1.0),f.x),f.y);
    }
    vec3 skyColor(vec3 ray){
      float height=max(0.0,ray.y);
      vec3 sky=mix(haze,skyTop,smoothstep(0.0,0.64,height));
      vec2 p=ray.xz/(height+0.22)*3.8;
      float clouds=noise(p)*0.64+noise(p*2.18)*0.25+noise(p*4.6)*0.11;
      float cover=smoothstep(0.53,0.74,clouds)*smoothstep(0.01,0.19,height);
      return mix(sky,mix(vec3(0.99,0.98,0.94),vec3(1.0,0.67,0.46),dusk),cover*(0.84-night*0.84));
    }
    float headlightBeam(vec2 delta,vec2 direction,float height,float range){
      float forwardDistance=dot(delta,direction);
      float sideDistance=abs(dot(delta,vec2(-direction.y,direction.x)));
      float spread=6.5+max(0.0,forwardDistance)*0.21;
      float cone=(1.0-smoothstep(spread*.3,spread,sideDistance))
        *smoothstep(0.0,15.0,forwardDistance)*(1.0-smoothstep(range*.27,range,forwardDistance));
      return cone*(1.0-smoothstep(7.0,19.0,height));
    }
    void main(){
      float fog=smoothstep(260.0,1550.0,depth);
      if(material==${material.sky}.0){
        gl_FragColor=vec4(skyColor(normalize(worldPosition-eye)),1.0);
        return;
      }
      if(material==${material.streetShadow}.0){
        gl_FragColor=vec4(0.14,0.20,0.29,0.34*(1.0-night)*(1.0-fog));
        return;
      }
      if(material==${material.rearLens}.0){
        vec3 red=mix(vec3(.45,.018,.025),vec3(1.0,.24,.13),emissive);
        gl_FragColor=vec4(mix(red,haze,fog*.8),1.0);
        return;
      }
      if(material==${material.lanternGlow}.0){
        float radius=length(tint.xy*2.0-1.0);
        float halo=exp(-5.8*radius*radius)*(1.0-smoothstep(.58,1.0,radius));
        gl_FragColor=vec4(1.0,.78,.42,halo*emissive*(1.0-fog));
        return;
      }
      if(material==${material.rearGlow}.0){
        float radius=length(tint.xy*2.0-1.0);
        float halo=exp(-5.3*radius*radius)*(1.0-smoothstep(.60,1.0,radius));
        float facing=smoothstep(0.0,18.0,rearAngle);
        gl_FragColor=vec4(1.0,.065,.031,halo*emissive*facing*(1.0-fog));
        return;
      }
      if(material==${material.contactShadow}.0){
        float opacity=1.0-smoothstep(0.19,1.0,length(surface/vec2(21.0,10.3)));
        gl_FragColor=vec4(0.09,0.12,0.15,opacity*mix(0.58,0.36,night)*(1.0-fog));
        return;
      }
      if(smokeScale>0.0){
        float radius=length(gl_PointCoord-vec2(0.5));
        float edge=1.0-smoothstep(0.06,0.5,radius);
        vec3 smoke=tint.y>1.5?vec3(0.82,0.89,0.92)
          :tint.y>0.5?vec3(0.67,0.57,0.43):vec3(0.72,0.75,0.76);
        float alpha=edge*edge*(1.0-tint.x)*tint.z;
        if(tint.y==4.0)smoke=vec3(0.055,0.062,0.068);
        if(tint.y==3.0){
          smoke=mix(vec3(1.0,0.91,0.49),vec3(1.0,0.22,0.025),smoothstep(0.03,0.5,radius));
          alpha=edge*(1.0-tint.x)*tint.z;
        }
        gl_FragColor=vec4(smoke,alpha);
        return;
      }
      if(emissive>0.0){
        gl_FragColor=vec4(mix(tint,haze,fog*.55),emissive*(1.0-fog*.8));
        return;
      }
      vec3 view=normalize(eye-worldPosition);
      vec3 normal=vec3(0.0,1.0,0.0);
      float directional=0.65;
      ${derivatives?`
        vec3 face=cross(dFdx(worldPosition-eye),dFdy(worldPosition-eye));
        normal=face*inversesqrt(max(dot(face,face),0.000001));
        directional=max(0.0,dot(normal,normalize(vec3(${sunDirection.join(",")}))));
      `:""}
      float variation=1.0;
      if(material==${material.terrain}.0||material==${material.grassTerrain}.0){
        variation+=0.21*(noise(surface*0.035)-0.5)+0.07*(noise(surface*0.32)-0.5);
      }
      if(material==${material.pavement}.0||material==${material.asphalt}.0){
        float aggregate=(noise(surface*4.0)-0.5)*(1.0-smoothstep(18.0,125.0,depth));
        float repairs=noise(surface*0.065);
        variation+=0.16*aggregate+0.16*(repairs-0.5)-0.09*smoothstep(0.59,0.75,repairs);
        if(tint.b>tint.r && abs(surface.x-1770.0)<32.0 && abs(surface.y-1950.0)<380.0){
          float wheelPath=abs(abs(surface.x-1770.0)-17.0);
          float rubber=(1.0-smoothstep(2.6,14.0,wheelPath))*(0.42+0.58*noise(surface*vec2(0.49,0.032)));
          float jointDistance=abs(fract(surface.y/73.0)-0.5);
          float joint=(1.0-smoothstep(0.003,0.009,jointDistance))*smoothstep(0.14,0.45,repairs);
          variation-=0.12*rubber+0.12*joint;
        }
      }
      vec3 ambient=mix(vec3(0.63,0.70,0.79),vec3(0.24,0.32,0.49),night);
      vec3 sunlight=mix(vec3(0.53,0.48,0.40),vec3(0.58,0.32,0.19),dusk)*(1.0-night);
      vec3 base=tint*variation*(ambient+sunlight*directional);
      if(material==${material.asphalt}.0){
        vec3 road=texture2D(assetTexture,worldPosition.xz/27.0).rgb;
        base=road*variation*(ambient+sunlight*directional);
      }
      if(material==${material.grassTerrain}.0){
        vec2 uv=worldPosition.xz;
        vec2 rotated=vec2(dot(uv,vec2(.60,.80)),dot(uv,vec2(-.80,.60)));
        vec3 fine=texture2D(assetTexture,uv/14.0).rgb;
        vec3 broad=texture2D(assetTexture,rotated/29.0).rgb;
        float patch=noise(uv*.065);
        float contour=clamp(tint.g/.55,.77,1.16);
        vec3 grass=mix(fine,broad,.30+patch*.38);
        grass=mix(grass*1.37,tint,.20)*contour;
        base=grass*variation*(ambient+sunlight*directional);
      }
      if(material==${material.ocean}.0){
        vec2 waves=worldPosition.xz/380.0;
        vec3 a=texture2D(assetTexture,waves+vec2(waterTime*.028,waterTime*.013)).rgb;
        vec3 b=texture2D(assetTexture,waves.yx*.62+vec2(-waterTime*.017,waterTime*.009)).rgb;
        vec3 water=mix(a,b,.35)*vec3(.9,1.03,1.06);
        base=mix(water*1.12,water*.27,night);
        base=mix(base,haze,.20*pow(1.0-abs(view.y),3.0));
      }
      if(material==${material.sand}.0||material==${material.snow}.0){
        bool snow=material==${material.snow}.0;
        vec2 position=worldPosition.xz;
        vec2 rotated=vec2(dot(position,vec2(.8,.6)),dot(position,vec2(-.6,.8)));
        float size=snow?118.0:72.0;
        vec3 fine=texture2D(assetTexture,position/size).rgb;
        vec3 broad=texture2D(assetTexture,rotated/(size*2.7)).rgb;
        vec3 detail=mix(fine,broad,.34);
        vec3 balance=snow?vec3(1.54,1.41,1.23):vec3(1.12,1.03,.89);
        float grain=snow?1.0:1.0+(noise(position*1.6)-.5)*.18+(noise(position*.11)-.5)*.23;
        base=mix(tint,detail*balance,.67)*grain*(ambient+sunlight*directional);
      }
      float glass=step(tint.r+0.065,tint.b)*step(tint.r+0.035,tint.g);
      if(material==${material.vehicle}.0 || (material==${material.world}.0 && glass>0.0)){
        vec3 reflection=reflect(-view,normal);
        float fresnel=pow(1.0-max(0.0,dot(normal,view)),3.0);
        vec3 reflected=mix(haze,skyTop,smoothstep(-0.12,0.55,reflection.y));
        if(material==${material.vehicle}.0 && glass>0.0){
          vec3 sky=skyColor(reflection);
          reflected=mix(vec3(0.17,0.22,0.25),sky,smoothstep(-0.36,0.36,reflection.y));
        }
        float strength=material==${material.vehicle}.0?mix(0.08*assetGloss,0.26,glass):0.12;
        base=mix(base,reflected,strength*(0.36+0.64*fresnel)*(1.0-night*0.65));
        if(material==${material.vehicle}.0){
          vec3 halfway=normalize(view+normalize(vec3(${sunDirection.join(",")})));
          base+=vec3(1.0,0.89,0.74)*pow(max(0.0,dot(normal,halfway)),14.0)*0.33*assetGloss*(1.0-night);
        }
      }
      if(material==${material.foliageBake}.0||material==${material.foliageCard}.0){
        vec4 texel=texture2D(assetTexture,tint.xy);
        if(texel.a<.35)discard;
        vec3 albedo=texel.rgb*assetTint;
        if(material==${material.foliageBake}.0){
          float shape=.75+.25*max(0.0,dot(normalize(importedNormal),vec3(.48,.76,-.43)));
          gl_FragColor=vec4(albedo*shape,1.0);
        }else{
          gl_FragColor=vec4(mix(albedo*(ambient+sunlight*.57),haze,fog),1.0);
        }
        return;
      }
      if(material==${material.importedCar}.0||material==${material.importedBuilding}.0){
        vec3 n=normalize(importedNormal);
        vec3 sun=normalize(vec3(${sunDirection.join(",")}));
        vec4 texel=texture2D(assetTexture,assetRepeat>0.0?fract(tint.xy):tint.xy);
        if(assetCutout>0.0&&texel.a<.4)discard;
        vec3 albedo=texel.rgb*assetTint;
        vec3 reflected=reflect(-view,n);
        vec3 environment=mix(haze,skyTop,smoothstep(-.2,.55,reflected.y));
        float fresnel=pow(1.0-max(0.0,dot(n,view)),3.0);
        float specular=pow(max(0.0,dot(n,normalize(view+sun))),18.0);
        base=albedo*(ambient+sunlight*max(0.0,dot(n,sun)));
        base=mix(base,environment,assetGloss*(.05+.24*fresnel)*(1.0-night*.76));
        base+=vec3(1.0,.90,.74)*specular*assetGloss*.39*(1.0-night);
        if(windowGlass>0.0){
          float across=abs(n.x)>abs(n.z)?worldPosition.z:worldPosition.x;
          vec2 pane=windowGlass>3.5?vec2(across/9.0,worldPosition.y/13.0)
            :vec2(across/15.0,worldPosition.y/27.0);
          float side=abs(n.x)>abs(n.z)?sign(n.x):sign(n.z)+3.0;
          vec2 cell=floor(pane)+vec2(side*71.0,side*33.0);
          float occupancy=hash(cell);
          float variation=hash(cell+vec2(16.0,43.0));
          vec3 warm=vec3(1.0,.74,.12);
          vec3 cool=vec3(.21,.54,1.0);
          vec3 room=mix(warm,cool,step(.54,variation));
          vec2 inset=smoothstep(vec2(.01),vec2(.12),fract(pane))
            *(1.0-smoothstep(vec2(.90),vec2(.99),fract(pane)));
          float visibleGlass=1.0-smoothstep(.25,.73,abs(n.y));
          float glow=smoothstep(.12,.79,night)*visibleGlass;
          float beams=inset.x*inset.y*step(.31,occupancy)*mix(.43,.91,variation);
          float mullions=mix(.54,1.0,smoothstep(.10,.46,max(texel.r,max(texel.g,texel.b))));
          if(windowGlass>3.5){
            float brightness=dot(texel.rgb,vec3(.30,.59,.11));
            float coolGlass=smoothstep(-.045,.04,texel.b-texel.r);
            float darkPane=1.0-smoothstep(.36,.58,brightness);
            float brightGlass=coolGlass*smoothstep(.16,.40,texel.b)*(1.0-smoothstep(.65,.86,brightness));
            float windowMask=max(darkPane*mix(.47,1.0,coolGlass),brightGlass)*smoothstep(.035,.12,brightness);
            glow*=windowMask*.69;
            vec2 lightingRegion=pane+vec2(side*71.0,side*33.0);
            float litRoom=noise(lightingRegion);
            float roomTone=noise(lightingRegion+vec2(16.0,43.0));
            room=mix(warm,cool,smoothstep(.38,.62,roomTone));
            beams=smoothstep(.29,.58,litRoom)*mix(.58,.95,roomTone);
          }else if(windowGlass>2.5){
            vec2 uv=tint.xy;
            float top=step(.075,uv.y)*(1.0-step(.242,uv.y))*
              (step(.525,uv.x)*(1.0-step(.626,uv.x))+step(.719,uv.x)*(1.0-step(.816,uv.x)));
            float middle=step(.386,uv.y)*(1.0-step(.516,uv.y))*step(.054,uv.x)*(1.0-step(.264,uv.x));
            float lower=step(.723,uv.y)*(1.0-step(.879,uv.y))*step(.088,uv.x)*(1.0-step(.353,uv.x));
            float stores=step(.012,uv.y)*(1.0-step(.235,uv.y))*step(.043,uv.x)*(1.0-step(.348,uv.x));
            glow*=max(max(top,middle),max(lower,stores));
            beams=step(.30,occupancy)*mix(.62,.94,variation);
          }else if(windowGlass>1.5){
            float row=fract(tint.y*7.0);
            float paneX=step(.03,tint.x)*(1.0-step(.93,tint.x))*(1.0-step(.421,tint.x)*(1.0-step(.525,tint.x)));
            float paneY=smoothstep(.40,.46,row)*(1.0-smoothstep(.90,.95,row));
            float brightness=dot(texel.rgb,vec3(.30,.59,.11));
            glow*=paneX*paneY*(1.0-smoothstep(.43,.61,brightness));
            beams=step(.28,occupancy)*mix(.58,.96,variation);
          }
          base+=glow*(vec3(.055,.115,.205)+room*beams*.98)*mullions;
        }

      }
      vec3 lit=base;
      if(lamps>0.0){
        float playerBeam=headlightBeam(worldPosition.xz-headlightOrigin.xz,headlightDirection,
          worldPosition.y-headlightOrigin.y,148.0);
        float trafficBeam=0.0;
        for(int i=0;i<${trafficLightLimit};i++){
          if(i>=trafficLightCount)break;
          vec4 light=trafficHeadlights[i];
          trafficBeam+=headlightBeam(worldPosition.xz-light.xy,light.zw,
            worldPosition.y-trafficLightHeights[i],112.0);
        }
        lit+=vec3(1.0,0.91,0.73)*lamps*(playerBeam*.57+min(trafficBeam,1.38)*.40);
      }
      float distanceHaze=material==${material.importedBuilding}.0?smoothstep(420.0,2750.0,depth):fog;
      gl_FragColor=vec4(mix(lit,haze,distanceHaze),1.0);
    }
  `));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const uniforms=Object.fromEntries('eye right up forward origin turn spin aspect zoom meshScale haze skyTop material smokeScale dusk night lamps emissive waterTime headlightOrigin headlightDirection trafficHeadlights[0] trafficLightHeights trafficLightCount assetTint assetGloss assetTexture assetCutout assetRepeat windowGlass'.split(' ').map(name=>[name,gl.getUniformLocation(program,name)]));
  const attributes=['position','color'].map(name=>gl.getAttribLocation(program,name));
  attributes.forEach(attribute=>gl.enableVertexAttribArray(attribute));
  const normalAttribute=gl.getAttribLocation(program,'modelNormal');

  function upload(mesh){
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices),gl.STATIC_DRAW);
    return {buffer,count:mesh.vertices.length/6};
  }
  function buildMesh(build){
    const mesh=new Mesh();
    build(mesh);
    return upload(mesh);
  }

  const atmosphere=buildMesh(mesh=>mesh.box(0,0,1200,1200,-600,600,'#ffffff'));
  const grassTerrain=new Mesh(),oceanTerrain=new Mesh(),sandTerrain=new Mesh(),snowTerrain=new Mesh();
  const landscape=buildMesh(mesh=>terrain(mesh,grassTerrain,oceanTerrain,sandTerrain,snowTerrain,!basic));
  if(!basic)harborBeach(sandTerrain);
  const juniperGround=upload(grassTerrain);
  const terrainSurfaces=[
    {name:'ocean',mesh:upload(oceanTerrain),mode:material.ocean},
    {name:'sand',mesh:upload(sandTerrain),mode:material.sand},
    {name:'snow',mesh:upload(snowTerrain),mode:material.snow}
  ];
  const juniperGrass={};
  const copperRoutes=routes.filter(route=>route.every(([x,y])=>isDesert(x,y)));
  const roadSurface=new Mesh(),copperRoadSurface=new Mesh();
  const pavement=buildMesh(mesh=>{
    streets(mesh,roadSurface,routes.filter(route=>!copperRoutes.includes(route)),true);
    streets(mesh,copperRoadSurface,copperRoutes);
    for(const {x,y,w,d,snow,frontage} of buildings){
      if(!frontage)continue;
      const {curbX,curbY,horizontal}=frontage;
      const paving=snow?'#a8afb3':'#aaa498';
      if(horizontal){
        const edge=curbY+Math.sign(y-curbY)*(sidewalkWidth/2-1);
        const far=y+Math.sign(y-curbY)*(d/2+4);
        mesh.plane(x-w/2-4,Math.min(edge,far),w+8,Math.abs(far-edge),.072,paving);
      }else{
        const edge=curbX+Math.sign(x-curbX)*(sidewalkWidth/2-1);
        const far=x+Math.sign(x-curbX)*(w/2+4);
        mesh.plane(Math.min(edge,far),y-d/2-4,Math.abs(far-edge),d+8,.072,paving);
      }
    }
  });
  const asphalt=upload(roadSurface),copperAsphalt=upload(copperRoadSurface);
  const windowLights=new Mesh();
  const shadowGeometry=new Mesh();
  const decorations=[];
  const fallbackDecorations={bench:new Mesh(),flower:new Mesh(),shrub:new Mesh()};
  const buildingModels={};
  const buildingFiles={
    tower:'modern_tower_official_complex_building_apartment',
    building03:'building_03',
    cityBuilding:'game_ready_city_building',
    newYork:'new_york_buildings',
    lighthouse:'lighthouse',
    stadium:'metasiberia_stadium__football_arena'
  };
  const buildingPlacements=basic?[]:buildings.filter(lot=>lot.importedTower).map(lot=>({
    lot,kind:lot.model??'tower',angle:lot.angle??Math.PI/2
  }));
  if(!basic){
    buildingPlacements.push({lot:lighthouse,kind:'lighthouse',angle:0});
    for(const lot of stadiums)buildingPlacements.push({lot,kind:'stadium',angle:Math.PI/2});
  }
  let buildingFallback;
  const preparedBuildings=[];
  const buildingFootprints=new Map();
  const replacedBuildings=basic?new Set():new Set([...buildings,lighthouse,...stadiums]);
  const bridgeModel={};
  const bridgeFallback=buildMesh(mesh=>{
    for(const span of bridges)straitBridge(mesh,span);
  });
  const world=buildMesh(mesh=>{
    mesh.windowLights=windowLights;
    architecture(mesh,replacedBuildings);
    boulevardDetails(mesh,decorations,fallbackDecorations);
    desertScenery(mesh);
    landmarks(mesh,replacedBuildings);
    roadside(mesh);
  });
  for(const b of buildings){
    if(!b.style||b.desert||b.snow||b.importedTower||replacedBuildings.has(b))continue;
    const block=new Mesh();
    const scale=b.style==='glass'?.89:1;
    block.box(b.x,b.y,b.w*scale,b.d*scale,0,b.h,'#000000');
    projectStreetShadow(block,shadowGeometry);
  }
  const basicTreeRanges=new Map();
  const basicScenery=basic?buildMesh(mesh=>{
    for(const item of breakableScenery){
      mesh.base=groundHeight(item.x,item.y);
      const start=mesh.vertices.length/6;
      sceneryGeometry(mesh,item);
      basicTreeRanges.set(item,{start,end:mesh.vertices.length/6});
    }
  }):null;
  const shadowRanges=new Map();
  for(const item of breakableScenery){
    if(!item.streetPalm&&!item.streetlight||!basic&&isCityApproach(item.x,item.y,46))continue;
    const caster=new Mesh();
    caster.base=groundHeight(item.x,item.y,!basic);
    sceneryGeometry(caster,item);
    const start=shadowGeometry.vertices.length/6;
    projectStreetShadow(caster,shadowGeometry);
    shadowRanges.set(item,{start,end:shadowGeometry.vertices.length/6});
  }
  const placedTrees=breakableScenery.filter(item=>basic||!isCityApproach(item.x,item.y,46)).map(item=>({item,kind:sceneryKind(item),
    angle:item.phase??(item.shade??0)*6.28,y:groundHeight(item.x,item.y,!basic)}));
  const detailedBroadleaf=new Set(placedTrees.filter(tree=>tree.kind==='broadleaf')
    .sort((a,b)=>(a.item.x-1770)**2+(a.item.y-2000)**2-(b.item.x-1770)**2-(b.item.y-2000)**2)
    .slice(0,4).map(tree=>tree.item));
  let broadleafCard;
  const decorationFallbacks=Object.entries(fallbackDecorations).map(([kind,mesh])=>[kind,upload(mesh)]);
  const sceneryModels={};
  const debrisMeshes=new Map();
  const streetShadows=upload(shadowGeometry);
  const hasStencil=gl.getContextAttributes().stencil;
  const windows=upload(windowLights);
  windowLights.vertices=[];
  const vehicles=CARS.map(model=>{
    const {length=1,width=1}=model;
    const uploadScaled=mesh=>{
      for(let i=0;i<mesh.vertices.length;i+=6){
        mesh.vertices[i]*=length;
        mesh.vertices[i+2]*=width;
      }
      return upload(mesh);
    };
    const headlights=new Mesh();
    for(const z of [-3.85,3.85]){
      if(model.rugged){
        headlights.box(17.17,z-Math.sign(z)*.34,.06,1.15,4.61,5.23,'#f6fcff');
        headlights.box(17.16,z,.05,2.45,5.38,5.57,'#eaf7ff');
      }else headlights.box(16.86,z,.04,2.16,3.94,4.64,'#fff5cb');
    }
    const body=uploadScaled(makeCar(model));
    body.gloss=model.gloss??1;
    const {lenses,glow}=rearLamps();
    return {length,width,wheel:upload(makeWheel(model.alloy)),body,
      rearLenses:uploadScaled(lenses),rearGlow:uploadScaled(glow),
      headlights:uploadScaled(headlights),shadow:uploadScaled(makeShadow())};
  });
  const assetBuffers=[],assetTextures=new Set();
  let destroyed=false;
  const assetRequests=new AbortController();
  const terrainTextures=Promise.all(terrainSurfaces.map(async surface=>{
    try{
      const url=`${import.meta.env.BASE_URL}3js%20/scenery/${surface.name}-surface.webp`;
      const response=await fetch(url,{signal:assetRequests.signal});
      if(!response.ok)throw new Error(`Texture request returned ${response.status}`);
      const image=await createImageBitmap(await response.blob());
      try{
        if(destroyed)return;
        const texture=gl.createTexture();
        if(!texture)return;
        assetTextures.add(texture);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        surface.texture=texture;
      }finally{image.close();}
    }catch(error){
      if(!destroyed)console.warn(`Could not load ${surface.name} surface`,error);
    }
  }));
  const policeVehicle={...vehicles[0]};
  function loadVehicleModel(vehicle,model){
    if(!model.asset)return;
    return loadCarAsset(model.asset,assetRequests.signal).then(asset=>{
      const pictures=new Set(asset.materials.map(material=>material.image).filter(Boolean));
      try{
        if(destroyed)return;
        const textures=new Map();
        const textureFor=(image,repeat=false)=>{
          if(textures.has(image))return textures.get(image);
          const texture=gl.createTexture();
          assetTextures.add(texture);
          textures.set(image,texture);
          gl.bindTexture(gl.TEXTURE_2D,texture);
          if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
          else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
          const wrap=repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap);
          if(repeat)gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,repeat?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          return texture;
        };
        const uploadPart=(index,vertices,elements,surface=false)=>{
          const {name,image,tint,gloss,cutout,repeat}=asset.materials[index];
          const buffer=gl.createBuffer();
          assetBuffers.push(buffer);
          gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
          gl.bufferData(gl.ARRAY_BUFFER,vertices instanceof Float32Array?vertices:new Float32Array(vertices),gl.STATIC_DRAW);
          let elementBuffer;
          if(elements){
            elementBuffer=gl.createBuffer();
            assetBuffers.push(elementBuffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elementBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,elements,gl.STATIC_DRAW);
          }
          const powerOfTwo=size=>size>0&&(size&(size-1))===0;
          const nativeRepeat=(model.asset.useTextureSamplers&&repeat||model.asset.repeatMaterials?.includes(name))&&image&&
            powerOfTwo(image.width)&&powerOfTwo(image.height);
          return {buffer,elementBuffer,count:elements?.length??vertices.length/9,
            texture:textureFor(image,nativeRepeat),tint,gloss,cutout,repeat:repeat&&!nativeRepeat,
            depthBias:model.asset.asphaltMaterial&&!surface?(image?index%7:12+index%7):0,
            windowGlass:model.asset.texturedWindows&&image?4
              :model.asset.windowMaterials?.includes(name)?(model.asset.windowAtlas??1):0};
        };
        const uploadGroups=groups=>[...groups].filter(([,vertices])=>vertices.length)
          .map(([index,vertices])=>uploadPart(index,vertices));
        if(model.asset.bridge){
          const spans=bridges.map(span=>({span,parts:uploadGroups(projectBridge(asset.body,asset.materials,span))}));
          if(spans.some(span=>!span.parts.length)||gl.isContextLost()||gl.getError()!==gl.NO_ERROR){
            throw new Error('Bridge upload failed.');
          }
          vehicle.spans=spans;
          const roadImage=asset.materials.find(material=>material.name==='Road')?.image;
          if(roadImage){
            // Crop clear asphalt from between the markings; city lane paint follows the route.
            const tile=document.createElement('canvas');
            tile.width=tile.height=256;
            const context=tile.getContext('2d');
            if(context){
              context.drawImage(roadImage,roadImage.width*.125,roadImage.height*.125,
                roadImage.width*.25,roadImage.height*.25,0,0,tile.width,tile.height);
              vehicle.asphalt=textureFor(tile,true);
            }
          }
          return;
        }
        if(model.asset.textureOnly){
          const image=asset.materials.find(material=>material.name===model.asset.textureOnly)?.image;
          if(!image)throw new Error('Grass surface texture is missing.');
          const powerOfTwo=value=>value>0&&(value&(value-1))===0;
          if(!powerOfTwo(image.width)||!powerOfTwo(image.height))throw new Error('Grass surface cannot tile.');
          const texture=textureFor(image,true);
          if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw new Error('Grass surface upload failed.');
          vehicle.texture=texture;
          return;
        }
        if(model.asset.splitNodes){
          vehicle.asset={variants:new Map([...asset.variants].map(([name,variant])=>[
            name,{parts:uploadGroups(variant.body),span:variant.span}
          ]))};
          if(vehicle.asset.variants.size!==model.asset.splitNodes.length||gl.isContextLost()||gl.getError()!==gl.NO_ERROR){
            vehicle.asset=null;
            throw new Error('Building pack upload failed.');
          }
          return;
        }
        if(model.asset.normalize||model.asset.city||model.asset.staticModel){
          const indexedParts=model.asset.mountain?fitFrostpineMountain(asset.indexedParts,asset.span):asset.indexedParts;
          const parts=[...uploadGroups(asset.body),...indexedParts.map(part=>uploadPart(part.material,part.vertices,part.elements,part.surface))];
          if(!parts.length||gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw new Error('Scenery upload failed');
          if(model.asset.asphaltMaterial){
            const road=asset.materials.findIndex(material=>material.name===model.asset.asphaltMaterial);
            const image=asset.materials[road]?.image;
            if(image){
              const tile=document.createElement('canvas');
              tile.width=tile.height=256;
              const context=tile.getContext('2d');
              if(context){
                context.drawImage(image,0,0,256,256);
                vehicle.asphalt=textureFor(tile,true);
              }
            }
          }
          if(model.asset.city){
            const road=asset.materials.findIndex(material=>material.name==='Material.001');
            if(road<0||!asset.materials[road].image)throw new Error('Harbor City road texture missing.');
            vehicle.road={parts:[uploadPart(road,harborRoadVertices())]};
            // Reuse the city mesh buffers while leaving the original pier on the west shore.
            vehicle.district={parts:parts.filter((_,index)=>{
              const vertices=asset.indexedParts[index]?.vertices;
              if(!vertices)return true;
              for(let i=0;i<vertices.length;i+=9){
                if(vertices[i]*CITY.scale>=-500)return true;
              }
              return false;
            })};
          }
          vehicle.asset={parts,footprint:asset.footprint,span:asset.span,collisionFaces:asset.collisionFaces};
          return;
        }
        const lamps=rearLamps(model.asset.rear);
        if(asset.rearLenses.length)lamps.lenses.vertices=asset.rearLenses;
        const front=asset.headLenses.length?{vertices:asset.headLenses}:new Mesh();
        if(model.asset.front){
          const {x,y,z,width}=model.asset.front;
          for(const side of [-1,1])front.box(x,z*side,.08,width,y-.23,y+.23,'#fff4d0');
        }
        const headlights=front.vertices.length?upload(front):null;
        const redStrobe=asset.redStrobe.length?upload({vertices:asset.redStrobe}):null;
        const blueStrobe=asset.blueStrobe.length?upload({vertices:asset.blueStrobe}):null;
        vehicle.asset={body:[...uploadGroups(asset.body),...asset.indexedParts.map(part=>uploadPart(part.material,part.vertices,part.elements,part.surface))],
          wheels:asset.wheels.map(({groups,...wheel})=>({...wheel,parts:uploadGroups(groups)})),
          rearLenses:upload(lamps.lenses),rearGlow:upload(lamps.glow),headlights,redStrobe,blueStrobe};
        if(!vehicle.asset.body.length||gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw new Error('Vehicle upload failed');
      }finally{
        for(const image of pictures)image.close();
      }
    }).catch(error=>{throw new Error(`Could not load ${model.name}.`,{cause:error});});
  }
  const frostpineMountain={};
  const copperCity={};
  const copperFallback=buildMesh(mesh=>{
    for(const avenue of COPPER_AVENUES)for(let i=1;i<avenue.length;i++){
      mesh.strip(...avenue[i-1],...avenue[i],COPPER_GATE_WIDTH,.13,'#5d6064');
    }
    for(const {x,y,w,d,h,angle} of COPPER_BUILDINGS){
      mesh.box(x,y,w,d,0,h,'#bc9471',angle);
    }
  });
  const cityModel={};
  const beachKit={};
  const {props:beachProps,palms:beachPalms}=basic?{props:[],palms:[]}:harborBeachLayout();
  // Align the GLB's textured road surface with the game's driving plane.
  const cityRoadLevel=-.423945;
  const cityModelHeight=.035-cityRoadLevel*CITY.scale;
  const cityIsland=new Mesh();
  if(!basic){
    for(const {x,y} of CITY_DISTRICTS){
      cityIsland.plane(x-CITY_HALF_SIZE,y-CITY_HALF_SIZE,CITY_HALF_SIZE*2,CITY_HALF_SIZE*2,-.12,'#626b62');
    }
    cityIsland.plane(CITY.x-945,CITY.y-215,410,430,-.12,'#626b62');
  }
  const cityConnection=basic?null:buildMesh(mesh=>straitBridge(mesh,CITY_BRIDGE,false));
  const cityGround=basic?null:upload(cityIsland);
  const modelJobs=CARS.flatMap((model,index)=>model.asset&&!model.asset.onDemand?[[vehicles[index],model]]:[]);
  const requestedCars=new Set();
  let loadingCar=false;
  function loadVisibleCar(index){
    if(basic||loadingCar||!CARS[index]?.asset?.onDemand||requestedCars.has(index))return;
    loadingCar=true;
    requestedCars.add(index);
    loadVehicleModel(vehicles[index],CARS[index]).catch(error=>{
      vehicles[index].asset=null;
      if(!destroyed)console.warn(error);
    }).finally(()=>{loadingCar=false;});
  }
  if(!basic)modelJobs.push([cityModel,{name:'Harbor City',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/city/city_scene.glb`,scale:1,city:true,keepIndices:true,repeatMaterials:['Material.001']
  }},true]);
  modelJobs.push([policeVehicle,{name:'Police car',asset:POLICE_ASSET}]);
  if(!basic)modelJobs.push([frostpineMountain,{name:'Frostpine mountain',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/scenery/snowy_mountain.glb`,scale:1,
    normalize:true,keepIndices:true,mountain:true
  }},true]);
  if(!basic)modelJobs.push([copperCity,{name:'Copper Island districts',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/city/beautiful_city.glb`,scale:1,origin:COPPER_CITY_ORIGIN,
    staticModel:true,keepIndices:true,useTextureSamplers:true,asphaltMaterial:'Material.007'
  }},true]);
  if(!basic)modelJobs.push([beachKit,{name:'Beach Kit',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/scenery/beach_kit.glb`,scale:1,splitNodes:BEACH_KIT_NODES
  }},true]);
  for(const [kind,file] of Object.entries(sceneryFiles)){
    const slot=sceneryModels[kind]={};
    modelJobs.push([slot,{name:kind,asset:sceneryAssetConfig(kind,file)}]);
  }
  if(!basic)for(const [kind,file] of Object.entries(buildingFiles)){
    const slot=buildingModels[kind]={};
    const url=`${import.meta.env.BASE_URL}3js%20/buildings/${file}.glb`;
    const tower=kind==='tower',apartment=kind==='building03',city=kind==='cityBuilding';
    modelJobs.push([slot,{name:kind,asset:{url,scale:1,normalize:true,footprintMesh:tower?8:undefined,
      texturedWindows:kind==='newYork',
      splitNodes:kind==='newYork'?[...new Set(buildingPlacements.filter(({lot})=>lot.variant).map(({lot})=>lot.variant))]:undefined,
      keepIndices:apartment||kind==='stadium',windowAtlas:apartment?2:city?3:undefined,
      windowMaterials:tower?['Solid_Glass','03_-_Default']:apartment?['building3','building3.001']:city?['atlas']:undefined}},true]);
  }
  if(!basic)modelJobs.push([juniperGrass,{name:'Juniper grass',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/scenery/realistic_grass.glb`,scale:1,textureOnly:'grasss'
  }},true]);
  if(!basic)modelJobs.push([bridgeModel,{name:'American road bridge',asset:{
    url:`${import.meta.env.BASE_URL}3js%20/buildings/american_road_bridge.glb`,scale:1,bridge:true,
    omitMaterials:['Ground01','Water_002_COLOR','edge_color000255']
  }},true]);
  const total=modelJobs.length+2;
  let loaded=1;
  if(!basic)onProgress(loaded,total);
  const ready=basic?terrainTextures:Promise.all(modelJobs.map(([vehicle,model,allowFallback])=>
    loadVehicleModel(vehicle,model).catch(error=>{
      if(!allowFallback)throw error;
      if(!destroyed)console.warn(error);
    }).then(()=>{
    if(!destroyed)onProgress(++loaded,total);
  }))).then(async()=>{
    if(destroyed)return;
    await terrainTextures;
    if(destroyed)return;
    broadleafCard=bakeSceneryCard(sceneryModels.broadleaf.asset);
    prepareBuildings();
    onProgress(++loaded,total);
  });
  const lampGlow=upload({vertices:[
    0,-1.45,-1.45,0,0,0, 0,-1.45,1.45,1,0,0, 0,1.45,1.45,1,1,0,
    0,-1.45,-1.45,0,0,0, 0,1.45,1.45,1,1,0, 0,1.45,-1.45,0,1,0
  ]});

  const patrolBody=upload(makeCar({...CARS[0],exhausts:singleExhaust,paint:POLICE_PAINT,roof:'#d1dce3'}));
  const lightBar=new Mesh();
  lightBar.box(-2.7,0,2.8,9,9.7,10.22,'#26303b');
  const redLamp=new Mesh(),blueLamp=new Mesh();
  redLamp.box(-2.7,-2.6,2.45,3.3,10.16,10.82,'#ff4a4e');
  blueLamp.box(-2.7,2.6,2.45,3.3,10.16,10.82,'#468dff');
  const policeBar=upload(lightBar),redStrobe=upload(redLamp),blueStrobe=upload(blueLamp);
  const gate=upload(makeGate());

  function draw({buffer,count},x=0,z=0,angle=0,height=0,roll=0,first=0,end=count){
    gl.uniform1f(uniforms.meshScale,1);
    gl.uniform3f(uniforms.origin,x,height,z);
    gl.uniform2f(uniforms.spin,Math.cos(roll),Math.sin(roll));
    gl.uniform2f(uniforms.turn,Math.cos(angle),Math.sin(angle));
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    attributes.forEach((attribute,i)=>gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,i*12));
    gl.drawArrays(gl.TRIANGLES,first,end-first);
  }

  function drawAssetParts(parts,x,z,angle,height,roll,scale=1){
    gl.uniform1f(uniforms.meshScale,scale);
    gl.uniform3f(uniforms.origin,x,height,z);
    gl.uniform2f(uniforms.spin,Math.cos(roll),Math.sin(roll));
    gl.uniform2f(uniforms.turn,Math.cos(angle),Math.sin(angle));
    for(const part of parts){
      if(part.depthBias){
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(0,part.depthBias);
      }
      gl.bindTexture(gl.TEXTURE_2D,part.texture);
      gl.uniform3fv(uniforms.assetTint,part.tint);
      gl.uniform1f(uniforms.assetGloss,part.gloss);
      gl.uniform1f(uniforms.assetCutout,Number(part.cutout));
      gl.uniform1f(uniforms.assetRepeat,Number(part.repeat));
      gl.uniform1f(uniforms.windowGlass,part.windowGlass??0);
      gl.bindBuffer(gl.ARRAY_BUFFER,part.buffer);
      attributes.forEach((attribute,i)=>gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,36,i*12));
      gl.vertexAttribPointer(normalAttribute,3,gl.FLOAT,false,36,24);
      if(part.elementBuffer){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.elementBuffer);
        gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_SHORT,0);
      }else gl.drawArrays(gl.TRIANGLES,0,part.count);
      if(part.depthBias)gl.disable(gl.POLYGON_OFFSET_FILL);
    }
  }

  function bakeSceneryCard(asset){
    const size=512;
    const texture=gl.createTexture();
    assetTextures.add(texture);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const framebuffer=gl.createFramebuffer(),depthBuffer=gl.createRenderbuffer();
    const extent=Math.max(.55,asset.footprint)*1.12;
    try{
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      gl.bindRenderbuffer(gl.RENDERBUFFER,depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthBuffer);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Could not prepare distant scenery.');
      gl.viewport(0,0,size,size);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(uniforms.eye,-24,.5,0);
      gl.uniform3f(uniforms.forward,1,0,0);
      gl.uniform3f(uniforms.up,0,1,0);
      gl.uniform3f(uniforms.right,0,0,1);
      gl.uniform1f(uniforms.aspect,1);
      gl.uniform1f(uniforms.zoom,24/extent);
      gl.uniform1f(uniforms.material,material.foliageBake);
      gl.enableVertexAttribArray(normalAttribute);
      drawAssetParts(asset.parts,0,0,0,0,0);
    }finally{
      gl.disableVertexAttribArray(normalAttribute);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.bindRenderbuffer(gl.RENDERBUFFER,null);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteRenderbuffer(depthBuffer);
    }
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    const low=.5-extent,high=.5+extent;
    const buffer=gl.createBuffer();
    assetBuffers.push(buffer);
    const corners=[[0,low,-extent,0,0],[0,low,extent,1,0],[0,high,extent,1,1],[0,high,-extent,0,1]];
    const vertices=[0,1,2,0,2,3].flatMap(i=>[...corners[i],0,1,0,0]);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    return {card:true,parts:[{buffer,count:6,texture,tint:[1,1,1],gloss:0,cutout:true,repeat:false}]};
  }

  function drawImportedCar(asset,x,z,angle,height,pitch,wheelSpin,steer,lift=0){
    gl.uniform1f(uniforms.material,material.importedCar);
    gl.uniform1i(uniforms.assetTexture,0);
    gl.enableVertexAttribArray(normalAttribute);
    drawAssetParts(asset.body,x,z,angle,height,pitch);
    const c=Math.cos(angle),s=Math.sin(angle);
    for(const {pivot:[axle,radius,offset],front,parts} of asset.wheels){
      const wx=x+axle*c-offset*s,wz=z+axle*s+offset*c;
      drawAssetParts(parts,wx,wz,angle+(front?steer:0),(lift?height+Math.sin(pitch)*axle:groundHeight(wx,wz))+radius,wheelSpin);
    }
    gl.disableVertexAttribArray(normalAttribute);
    gl.uniform1f(uniforms.material,material.world);
  }

  function drawUnbroken(batch,ranges,brokenScenery){
    const hidden=[];
    for(const tree of brokenScenery.keys()){
      const range=ranges.get(tree);
      if(range)hidden.push(range);
    }
    hidden.sort((a,b)=>a.start-b.start);
    let first=0;
    for(const {start,end} of hidden){
      if(start>first)draw(batch,0,0,0,0,0,first,start);
      first=end;
    }
    if(first<batch.count)draw(batch,0,0,0,0,0,first);
  }

  function sceneryKind(item){
    if(item.streetlight)return 'streetlight';
    if(isPalm(item))return 'palm';
    return item.snow||item.type<.27?'pine':'broadleaf';
  }

  function sceneryHeight(item,asset,kind){
    if(item.streetlight)return item.footpathLamp?8:13.6;
    if(kind==='palm')return item.height??13+item.r*.76;
    return Math.min(item.r*(kind==='pine'?1.84:1.68),(item.r+2)/asset.footprint);
  }

  function drawSceneryModel(asset,x,z,angle,y,scale,roll=0,mode=material.importedCar){
    gl.uniform1f(uniforms.material,asset.card?material.foliageCard:mode);
    gl.uniform1i(uniforms.assetTexture,0);
    gl.enableVertexAttribArray(normalAttribute);
    drawAssetParts(asset.parts,x,z,angle,y,roll,scale);
    gl.disableVertexAttribArray(normalAttribute);
    gl.uniform1f(uniforms.material,material.world);
  }

  function towerCollision(lot,angle,scale,points){
    const c=Math.cos(angle),s=Math.sin(angle);
    const vertices=points.map(([x,,z])=>[(x*c-z*s)*scale+lot.x,(x*s+z*c)*scale+lot.y]);
    const triangles=[];
    for(let i=0;i<vertices.length;i+=3){
      const [a,b,d]=vertices.slice(i,i+3);
      const area=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
      if(Math.abs(area)>.01)triangles.push([a,b,d]);
    }
    if(!triangles.length)throw new Error('Could not prepare tower collision.');
    const contains=(x,y,triangle)=>{
      const side=([ax,ay],[bx,by])=>(bx-ax)*(y-ay)-(by-ay)*(x-ax);
      const [a,b,d]=triangle;
      const signs=[side(a,b),side(b,d),side(d,a)];
      return signs.every(value=>value>=0)||signs.every(value=>value<=0);
    };
    const columns=Math.ceil(lot.w/6),rows=Math.ceil(lot.d/6);
    const width=lot.w/columns,depth=lot.d/rows,boxes=[];
    for(let row=0;row<rows;row++){
      const y=lot.y-lot.d/2+(row+.5)*depth;
      let start=-1;
      for(let column=0;column<=columns;column++){
        const x=lot.x-lot.w/2+(column+.5)*width;
        const solid=column<columns&&triangles.some(triangle=>contains(x,y,triangle));
        if(solid&&start<0)start=column;
        if(!solid&&start>=0){
          boxes.push({x:lot.x-lot.w/2+(start+column)*width*.5,y,w:(column-start)*width,d:depth});
          start=-1;
        }
      }
    }
    if(!boxes.length)throw new Error('Tower collision footprint is empty.');
    return boxes;
  }

  function prepareBuildings(){
    const unavailable=new Set();
    const towerAvailable=Boolean(buildingModels.tower.asset);
    for(const lot of buildings){
      if(lot.importedTower)continue;
      if(towerAvailable)buildingFootprints.set(lot,null);
      else unavailable.add(lot);
    }
    for(const {lot,kind,angle} of buildingPlacements){
      const model=buildingModels[kind],asset=lot.variant?model.asset?.variants.get(lot.variant):model.asset;
      if(!asset){
        if(!lot.fullOnly)unavailable.add(lot);
        continue;
      }
      const sideways=Math.abs(Math.sin(angle))>.5;
      const [width,length]=sideways?[asset.span[1],asset.span[0]]:asset.span;
      const scale=Math.min(lot.h??49,(lot.w-1.1)/width,(lot.d-1.1)/length);
      const site={x:lot.x,y:lot.y,w:width*scale,d:length*scale};
      const halfWidth=site.w*.5,halfLength=site.d*.5;
      let low=Infinity;
      for(const x of [-1,-.5,0,.5,1]){
        for(const z of [-1,-.5,0,.5,1]){
          low=Math.min(low,groundHeight(site.x+x*halfWidth,site.y+z*halfLength));
        }
      }
      let y=low-.4;
      if(kind==='tower'){
        const floor=Math.min(...asset.collisionFaces.map(point=>point[1]));
        y-=floor*scale;
        buildingFootprints.set(lot,{bounds:site,boxes:towerCollision(site,angle,scale,asset.collisionFaces)});
      }else if(kind==='stadium'){
        // Bring the pitch and entry slabs down to the wheel contact surface.
        y=low+.10-scale*(.7/14.821);
        buildingFootprints.set(lot,stadiumDriveLayout(site));
      }else{
        buildingFootprints.set(lot,{bounds:site,boxes:[site]});
      }
      preparedBuildings.push({lot,site,asset,angle,y,scale});
    }
    if(unavailable.size){
      const lights=new Mesh();
      const structure=buildMesh(mesh=>{
        mesh.windowLights=lights;
        architecture(mesh,new Set(buildings.filter(lot=>!unavailable.has(lot))));
      });
      const landmarks=buildMesh(mesh=>{
        if(unavailable.has(lighthouse))drawLighthouse(mesh);
        for(const site of stadiums)if(unavailable.has(site))drawStadium(mesh,site);
      });
      buildingFallback={structure,lights:upload(lights),landmarks};
    }
  }

  function drawImportedBuildings(eyeX,eyeZ,fx,fz,aspect){
    if(buildingFallback){
      draw(buildingFallback.structure);
      draw(buildingFallback.landmarks);
    }
    for(const {lot,site,asset,angle,y,scale} of preparedBuildings){
      const dx=site.x-eyeX,dz=site.y-eyeZ;
      const depth=dx*fx+dz*fz;
      const radius=Math.hypot(site.w,site.d)*.5;
      if(depth< -radius||depth>(lot.importedTower?3200:1700)+radius)continue;
      if(Math.abs(dz*fx-dx*fz)>Math.max(0,depth)*aspect*.78+radius)continue;
      drawSceneryModel(asset,site.x,site.y,angle,y,scale,0,
        lot.importedTower?material.importedBuilding:material.importedCar);
    }
  }

  function drawPlacedScenery(cam,brokenScenery,eyeX,eyeZ,fx,fz,aspect){
    const lamps=[];
    for(const {item,kind,angle,y} of placedTrees){
      if(brokenScenery.has(item))continue;
      const dx=item.x-eyeX,dz=item.y-eyeZ;
      const depth=dx*fx+dz*fz;
      const lateral=Math.abs(dz*fx-dx*fz);
      if(depth< -60||depth>1800||lateral>Math.max(0,depth)*aspect*.79+70)continue;
      const asset=sceneryModels[kind].asset;
      const height=sceneryHeight(item,asset,kind);
      if(kind==='broadleaf'&&!detailedBroadleaf.has(item)){
        drawSceneryModel(broadleafCard,item.x,item.y,angle,y,height);
        drawSceneryModel(broadleafCard,item.x,item.y,angle+Math.PI/2,y,height);
      }else drawSceneryModel(asset,item.x,item.y,angle,y,height);
      if(item.streetlight)lamps.push(item);
    }
    const visibleDecorations=decorations.filter(item=>sceneryModels[item.kind].asset&&
      Math.abs(item.x-cam.x)<360&&Math.abs(item.z-cam.y)<360);
    const distance=item=>(item.x-cam.x)**2+(item.z-cam.y)**2;
    visibleDecorations.sort((a,b)=>distance(a)-distance(b));
    const budgets={bench:5,planter:3,flower:4,shrub:16,grass:8};
    for(const item of visibleDecorations){
      if(budgets[item.kind]<=0)continue;
      budgets[item.kind]--;
      const asset=sceneryModels[item.kind].asset;
      const size=Math.min(item.height,item.radius/asset.footprint);
      drawSceneryModel(asset,item.x,item.z,item.angle,item.y,size);
    }
    return lamps;
  }

  function drawStreetlightBulbs(replaced,lamps,angle){
    if(lamps<=0)return;
    const xOffset=-Math.cos(angle)*.83,zOffset=-Math.sin(angle)*.83;
    gl.uniform1f(uniforms.material,material.lanternGlow);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    gl.depthMask(false);
    gl.uniform1f(uniforms.emissive,Math.sqrt(lamps)*.85);
    for(const item of replaced){
      if(!item.streetlight)continue;
      const height=groundHeight(item.x,item.y)+(item.footpathLamp?8:13.6)*.90;
      draw(lampGlow,item.x+xOffset,item.y+zOffset,angle,height);
    }
    gl.depthMask(true);
    gl.uniform1f(uniforms.emissive,0);
    gl.disable(gl.BLEND);
    gl.uniform1f(uniforms.material,material.world);
  }

  function drawFallenScenery(brokenScenery,cam){
    for(const [item,impact] of brokenScenery){
      if(Math.abs(item.x-cam.x)>1600||Math.abs(item.y-cam.y)>1600)continue;
      if(!debrisMeshes.has(item)){
        const radius=sceneryRadius(item);
        const base=buildMesh(mesh=>{
          if(item.streetlight){
            mesh.box(0,0,.84,.84,0,.92,'#53666a');
            mesh.box(0,0,.55,.55,.89,1.03,'#a8b3b6');
          }else{
            branch(mesh,[0,0,0],[0,.95,0],radius*1.12,radius*.84,'#71543b');
            mesh.disc(0,0,radius*.79,.95,'#c5a277');
            mesh.cone(-radius*.37,radius*.22,radius*.33,.90,1.0,'#ac855a',5);
          }
        });
        const debris=basic?buildMesh(mesh=>sceneryGeometry(mesh,item,0,0)):null;
        debrisMeshes.set(item,{base,debris});
      }
      const {base,debris}=debrisMeshes.get(item);
      const pose=fallenSceneryPose(item,impact);
      draw(base,item.x,item.y,0,groundHeight(item.x,item.y));
      const y=groundHeight(pose.x,pose.y)+.70;
      if(debris){
        draw(debris,pose.x,pose.y,impact.angle,y,-pose.tilt);
        continue;
      }
      const kind=sceneryKind(item);
      const asset=sceneryModels[kind].asset;
      const height=sceneryHeight(item,asset,kind);
      const model=kind==='broadleaf'&&!detailedBroadleaf.has(item)?broadleafCard:asset;
      drawSceneryModel(model,pose.x,pose.y,impact.angle,y,height,-pose.tilt);
    }
  }

  function drawVehicle(mesh,x,z,angle,height,pitch=0){
    gl.uniform1f(uniforms.material,material.vehicle);
    gl.uniform1f(uniforms.assetGloss,mesh.gloss??1);
    draw(mesh,x,z,angle,height,pitch);
    gl.uniform1f(uniforms.material,material.world);
  }

  function drawContactShadow(mesh,x,z,angle,height,pitch=0){
    gl.uniform1f(uniforms.material,material.contactShadow);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    draw(mesh,x,z,angle,height,pitch);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform1f(uniforms.material,material.world);
  }

  const trafficLightData=new Float32Array(trafficLightLimit*4);
  const trafficLightHeights=new Float32Array(trafficLightLimit);

  function updateTrafficHeadlights(cam,traffic,patrols,enabled){
    const lights=[];
    if(enabled){
      for(const car of [...traffic,...patrols]){
        const x=car.x-cam.x,z=car.y-cam.y;
        const distance=x*x+z*z;
        if(distance<300*300)lights.push({car,distance});
      }
      lights.sort((a,b)=>a.distance-b.distance);
    }
    const count=Math.min(lights.length,trafficLightLimit);
    for(let i=0;i<count;i++){
      const {x,y,angle,model,police}=lights[i].car;
      const c=Math.cos(angle),s=Math.sin(angle);
      const front=17*(police?1:vehicles[model??0].length);
      trafficLightData.set([x+c*front,y+s*front,c,s],i*4);
      trafficLightHeights[i]=groundHeight(x,y);
    }
    if(count){
      gl.uniform4fv(uniforms['trafficHeadlights[0]'],trafficLightData);
      gl.uniform4fv(uniforms.trafficLightHeights,trafficLightHeights);
    }
    gl.uniform1i(uniforms.trafficLightCount,count);
  }

  function drawHeadlamps(mesh,x,z,angle,height,intensity,pitch=0){
    if(intensity<=0)return;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(uniforms.emissive,Math.sqrt(intensity));
    draw(mesh,x,z,angle,height,pitch);
    gl.uniform1f(uniforms.emissive,0);
    gl.disable(gl.BLEND);
  }

  function drawRearLamps(vehicle,x,z,angle,height,running,braking,pitch=0){
    if(!braking&&running<=0)return;
    gl.uniform1f(uniforms.material,material.rearLens);
    gl.uniform1f(uniforms.emissive,braking?1:Math.sqrt(running)*.39);
    draw(vehicle.rearLenses,x,z,angle,height,pitch);
    gl.uniform1f(uniforms.material,material.rearGlow);
    gl.uniform1f(uniforms.emissive,braking?.23+running*.38:running*.15);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    gl.depthMask(false);
    draw(vehicle.rearGlow,x,z,angle,height,pitch);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform1f(uniforms.emissive,0);
    gl.uniform1f(uniforms.material,material.world);
  }

  const smokeBuffer=gl.createBuffer();
  const particleLimit=64;
  const smokeData=new Float32Array(particleLimit*6);
  let particles=[],exhaustClock=0,dustClock=0,flameClock=0,lastEmission=null;

  function drawSmoke(car,length,width,elevation,dt,road,exhausts,flames,blackExhaust){
    if(lastEmission?.generation!==car.smokeGeneration){
      particles=[];
      exhaustClock=0;
      dustClock=0;
      flameClock=0;
    }
    const previous=lastEmission?.generation===car.smokeGeneration?lastEmission:null;
    lastEmission={x:car.x,z:car.y,generation:car.smokeGeneration};
    for(const puff of particles){
      puff.age+=dt;
      puff.x+=puff.vx*dt;
      puff.z+=puff.vz*dt;
      puff.y+=puff.rise*dt;
    }
    particles=particles.filter(puff=>puff.age<puff.life);
    const speed=Math.abs(car.speed);
    const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    function emit(back,side,height,kind,offset){
      const mix=dt>0?offset/dt:0;
      const x=car.x+(previous?previous.x-car.x:0)*mix;
      const z=car.y+(previous?previous.z-car.y:0)*mix;
      const flame=kind===3;
      const dust=kind===1||kind===2;
      const drift=flame?23:dust?4:7;
      particles.push({
        x:x-back*cos-side*sin,y:elevation+height,z:z-back*sin+side*cos,
        vx:-cos*drift,vz:-sin*drift,rise:flame?.8:dust?3.3:5.1,
        age:0,life:flame?.11:dust?.92:.65,kind,opacity:flame?.88:kind===4?.62:dust?.28:.22
      });
    }
    if(speed>6){
      const interval=Math.max(.045,.14-speed*.00036);
      exhaustClock+=dt;
      while(exhaustClock>=interval){
        exhaustClock-=interval;
        for(const side of exhausts)emit(17.6*length,side*width,1.8,blackExhaust?4:0,exhaustClock);
      }
    }else exhaustClock=0;
    if(flames&&car.speed>12){
      flameClock+=dt;
      while(flameClock>=.045){
        flameClock-=.045;
        for(const side of exhausts)emit(18.1*length,side*width,1.8,3,flameClock);
      }
    }else flameClock=0;
    if(!road&&speed>22){
      dustClock+=dt;
      const kind=isSnow(car.x,car.y)?2:1;
      while(dustClock>=.066){
        dustClock-=.066;
        for(const side of [-1,1])emit(11.8*length,side*track*width,1.15,kind,dustClock);
      }
    }else dustClock=0;
    if(particles.length>particleLimit)particles.splice(0,particles.length-particleLimit);
    if(!particles.length)return;

    particles.forEach((puff,i)=>smokeData.set([
      puff.x,puff.y,puff.z,puff.age/puff.life,puff.kind,puff.opacity
    ],i*6));
    gl.uniform3f(uniforms.origin,0,0,0);
    gl.uniform2f(uniforms.spin,1,0);
    gl.uniform2f(uniforms.turn,1,0);
    gl.uniform1f(uniforms.meshScale,1);
    gl.uniform1f(uniforms.smokeScale,canvas.height*.865);
    gl.bindBuffer(gl.ARRAY_BUFFER,smokeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,smokeData.subarray(0,particles.length*6),gl.DYNAMIC_DRAW);
    attributes.forEach((attribute,i)=>gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,i*12));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS,0,particles.length);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform1f(uniforms.smokeScale,0);
  }

  return {
    ready,buildingFootprints,
    get cityAvailable(){return Boolean(cityModel.asset);},
    render(cam,car,targets,wide,orbit,dt=0,road=true,accelerating=false,seconds=0,patrols=[],time=0,civilians=[],brokenScenery=new Map()){
      if(canvas.width===0||canvas.height===0)return;
      const preview=orbit!==null;
      if(!car.police)loadVisibleCar(car.model??0);
      const viewAngle=preview?orbit:cam.angle;
      const fx=Math.cos(viewAngle),fz=Math.sin(viewAngle);
      const pitch=preview?.34:wide?.55:.174;
      const cp=Math.cos(pitch),sp=Math.sin(pitch);
      const aspect=canvas.width/canvas.height;
      const distance=preview?50:(wide?115:57)+Math.abs(car.speed)*.095;
      const elevation=groundHeight(car.x,car.y);
      const height=elevation+(car.lift??0)*.72+(preview?23:wide?78:19.5);
      const light=daylight(seconds);
      const carX=Math.cos(car.angle),carZ=Math.sin(car.angle);
      const headlamps=preview?0:light.lamps;
      gl.uniform3fv(uniforms.haze,light.sky);
      gl.uniform3fv(uniforms.skyTop,light.zenith);
      gl.uniform1f(uniforms.dusk,light.dusk);
      gl.uniform1f(uniforms.night,light.night);
      gl.uniform1f(uniforms.waterTime,(time%3600000)/1000);
      gl.uniform1f(uniforms.lamps,headlamps);
      updateTrafficHeadlights(cam,civilians,patrols,headlamps>0);
      gl.uniform3f(uniforms.headlightOrigin,car.x+carX*17,elevation,car.y+carZ*17);
      gl.uniform2f(uniforms.headlightDirection,carX,carZ);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(...light.sky,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
      gl.uniform3f(uniforms.eye,cam.x-fx*distance,height,cam.y-fz*distance);
      gl.uniform3f(uniforms.right,-fz,0,fx);
      gl.uniform3f(uniforms.up,fx*sp,cp,fz*sp);
      gl.uniform3f(uniforms.forward,fx*cp,-sp,fz*cp);
      gl.uniform1f(uniforms.aspect,aspect);
      gl.uniform1f(uniforms.zoom,preview?Math.min(1.53,aspect*2.02):1.73);
      gl.disable(gl.DEPTH_TEST);
      gl.uniform1f(uniforms.material,material.sky);
      draw(atmosphere,cam.x-fx*distance,cam.y-fz*distance,0,height);
      gl.enable(gl.DEPTH_TEST);
      gl.uniform1i(uniforms.assetTexture,0);
      for(const surface of terrainSurfaces){
        gl.uniform1f(uniforms.material,surface.texture?surface.mode:material.terrain);
        if(surface.texture)gl.bindTexture(gl.TEXTURE_2D,surface.texture);
        draw(surface.mesh);
      }
      gl.uniform1f(uniforms.material,material.terrain);
      draw(landscape);
      if(juniperGrass.texture){
        gl.uniform1i(uniforms.assetTexture,0);
        gl.bindTexture(gl.TEXTURE_2D,juniperGrass.texture);
        gl.uniform1f(uniforms.material,material.grassTerrain);
      }
      draw(juniperGround);
      gl.uniform1f(uniforms.material,material.pavement);
      if(bridgeModel.asphalt){
        gl.uniform1i(uniforms.assetTexture,0);
        gl.bindTexture(gl.TEXTURE_2D,bridgeModel.asphalt);
        gl.uniform1f(uniforms.material,material.asphalt);
      }
      draw(asphalt);
      if(copperCity.asphalt){
        gl.uniform1i(uniforms.assetTexture,0);
        gl.bindTexture(gl.TEXTURE_2D,copperCity.asphalt);
        gl.uniform1f(uniforms.material,material.asphalt);
      }
      draw(copperAsphalt);

      gl.uniform1f(uniforms.material,material.pavement);
      draw(pavement);
      gl.uniform1f(uniforms.material,material.world);
      draw(world);
      if(bridgeModel.spans){
        for(const asset of bridgeModel.spans){
          const {span}=asset;
          const along=span.vertical?cam.y:cam.x,across=span.vertical?cam.x:cam.y;
          if(along<span.west-1900||along>span.east+1900||Math.abs(across-span.y)>1900)continue;
          drawSceneryModel(asset,0,0,0,0,1);
        }
      }else draw(bridgeFallback);
      if(cityModel.asset&&CITY_DISTRICTS.some(({x,y})=>Math.hypot(x-cam.x,y-cam.y)<2900)){
        draw(cityGround);
        for(const district of CITY_DISTRICTS){
          const dx=district.x-(cam.x-fx*distance),dz=district.y-(cam.y-fz*distance);
          const depth=dx*fx+dz*fz;
          const radius=district===CITY?1100:800;
          if(depth< -radius||Math.hypot(dx,dz)>2400||
            Math.abs(dz*fx-dx*fz)>Math.max(0,depth)*aspect*.8+radius)continue;
          const asset=district===CITY?cityModel.asset:cityModel.district;
          drawSceneryModel(asset,district.x,district.y,0,cityModelHeight,CITY.scale);
        }
        if(Math.hypot(CITY.x-cam.x,CITY.y-cam.y)<2900)draw(cityConnection);
        drawSceneryModel(cityModel.road,0,0,0,0,1);
        if(beachKit.asset)for(const {name,x,y,angle} of beachProps){
          if(Math.hypot(x-cam.x,y-cam.y)>680)continue;
          const asset=beachKit.asset.variants.get(name);
          const height=Math.min(BEACH_KIT_SIZES[name],14/Math.max(...asset.span));
          drawSceneryModel(asset,x,y,angle,-.18,height);
        }
        const beachPalm=sceneryModels.palm?.asset;
        if(beachPalm)for(const {x,y,angle,height} of beachPalms){
          if(Math.hypot(x-cam.x,y-cam.y)<1050)drawSceneryModel(beachPalm,x,y,angle,-.18,height);
        }
      }
      if(copperCity.asset){
        for(const district of COPPER_DISTRICTS){
          const dx=district.x-cam.x,dz=district.y-cam.y;
          if(Math.hypot(dx,dz)>3900||dx*fx+dz*fz< -1700)continue;
          drawSceneryModel(copperCity.asset,district.x,district.y,district.angle+COPPER_CITY_ROTATION,.025,COPPER_CITY_SCALE);
        }
      }else if(Math.hypot(cam.x-DESERT_CENTER,cam.y-2520)<5300)draw(copperFallback);
      if(frostpineMountain.asset&&Math.hypot(cam.x-6950,cam.y-7485)<4300){
        drawSceneryModel(frostpineMountain.asset,0,0,0,3,1);
      }
      drawImportedBuildings(cam.x-fx*distance,cam.y-fz*distance,fx,fz,aspect);
      const lamps=basic
        ?breakableScenery.filter(item=>item.streetlight&&!brokenScenery.has(item))
        :drawPlacedScenery(cam,brokenScenery,cam.x-fx*distance,cam.y-fz*distance,fx,fz,aspect);
      if(basicScenery)drawUnbroken(basicScenery,basicTreeRanges,brokenScenery);
      for(const [kind,batch] of decorationFallbacks)if(!sceneryModels[kind].asset)draw(batch);
      drawFallenScenery(brokenScenery,cam);
      if(hasStencil&&light.night<1){
        gl.uniform1f(uniforms.material,material.streetShadow);
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.EQUAL,0,255);
        gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        drawUnbroken(streetShadows,shadowRanges,brokenScenery);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.STENCIL_TEST);
        gl.uniform1f(uniforms.material,material.world);
      }
      drawStreetlightBulbs(lamps,light.lamps,viewAngle);
      if(light.lamps>0){
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(uniforms.emissive,light.lamps*.94);
        draw(windows);
        if(buildingFallback)draw(buildingFallback.lights);
        gl.uniform1f(uniforms.emissive,0);
        gl.disable(gl.BLEND);
      }
      if(targets.length){
        gl.uniform1f(uniforms.emissive,Math.max(.01,light.lamps));
        for(const target of targets)draw(gate,target.x,target.y,target.angle);
        gl.uniform1f(uniforms.emissive,0);
      }
      const policeCars=[...patrols,...civilians.filter(other=>other.police)];
      if(car.police)policeCars.push(car);
      for(const [index,patrol] of policeCars.entries()){
        const {x,y,angle,wheelSpin,braking,steer=0,lift=0,airPitch=0,landingCompression=0}=patrol;
        if(basic&&(isCityLand(x,y)||isCityBridge(x,y)))continue;
        if(Math.abs(x-cam.x)>900||Math.abs(y-cam.y)>900)continue;
        const elevation=groundHeight(x,y);
        const ground=carGroundPose({...patrol,model:0});
        const bodyHeight=(lift?ground.height:Math.max(ground.height,elevation-.25))+lift-landingCompression;
        const bodyAngle=lift?airPitch:ground.slope;
        const {asset}=policeVehicle;
        drawContactShadow(policeVehicle.shadow,x,y,angle,ground.height,ground.slope);
        if(asset)drawImportedCar(asset,x,y,angle,bodyHeight,bodyAngle,wheelSpin,steer,lift);
        else{
          drawVehicle(patrolBody,x,y,angle,bodyHeight,bodyAngle);
          draw(policeBar,x,y,angle,bodyHeight,bodyAngle);
        }
        drawHeadlamps(asset?.headlights??policeVehicle.headlights,x,y,angle,bodyHeight,headlamps,bodyAngle);
        drawRearLamps(asset??policeVehicle,x,y,angle,bodyHeight,headlamps,braking,bodyAngle);
        const flash=patrol.traffic?null:(Math.floor(time/140)+index)%2;
        if(!asset||flash!==null){
          gl.uniform1f(uniforms.emissive,flash===null?0:flash?.98:.35);
          if(!asset||asset.redStrobe)draw(asset?.redStrobe??redStrobe,x,y,angle,bodyHeight,bodyAngle);
          gl.uniform1f(uniforms.emissive,flash===null?0:flash?.35:.98);
          if(!asset||asset.blueStrobe)draw(asset?.blueStrobe??blueStrobe,x,y,angle,bodyHeight,bodyAngle);
          gl.uniform1f(uniforms.emissive,0);
        }
        if(asset)continue;
        const c=Math.cos(angle),s=Math.sin(angle);
        for(const axle of axles)for(const offset of [-track,track]){
          const wx=x+axle*c-offset*s,wz=y+axle*s+offset*c;
          draw(vehicles[0].wheel,wx,wz,angle,(lift?bodyHeight+Math.sin(bodyAngle)*axle:groundHeight(wx,wz))+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      for(const other of civilians){
        if(other.police||(basic&&(isCityLand(other.x,other.y)||isCityBridge(other.x,other.y)))||Math.abs(other.x-cam.x)>800||Math.abs(other.y-cam.y)>800)continue;
        const {x,y,angle,model,wheelSpin,braking,lift=0,airPitch=0}=other;
        loadVisibleCar(model);
        const vehicle=vehicles[model];
        const {asset}=vehicle;
        const {length,width,body,wheel,headlights,shadow}=vehicle;
        const ground=carGroundPose(other);
        const bodyHeight=(lift?ground.height:Math.max(ground.height,groundHeight(x,y)-.25))+lift;
        const bodyAngle=lift?airPitch:ground.slope;
        const cos=Math.cos(angle),sin=Math.sin(angle);
        drawContactShadow(shadow,x,y,angle,ground.height,ground.slope);
        if(asset)drawImportedCar(asset,x,y,angle,bodyHeight,bodyAngle,wheelSpin,0,lift);
        else drawVehicle(body,x,y,angle,bodyHeight,bodyAngle);
        drawHeadlamps(asset?.headlights??headlights,x,y,angle,bodyHeight,headlamps,bodyAngle);
        drawRearLamps(asset??vehicle,x,y,angle,bodyHeight,headlamps,braking,bodyAngle);
        if(asset)continue;
        for(const axle of axles)for(const offset of [-track,track]){
          const wx=x+axle*length*cos-offset*width*sin,wz=y+axle*length*sin+offset*width*cos;
          draw(wheel,wx,wz,angle,(lift?bodyHeight+Math.sin(bodyAngle)*axle*length:groundHeight(wx,wz))+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      if(car.police)return;
      const {x,y:z,angle,wheelSpin,steer,braking,pitch:bodyPitch,lift=0,airPitch=0,landingCompression=0}=car;
      const cos=Math.cos(angle),sin=Math.sin(angle);
      const vehicle=vehicles[car.model??0];
      const {length,width,body,wheel,headlights,shadow}=vehicle;
      const ground=carGroundPose(car);
      const bodyHeight=ground.height+lift-landingCompression;
      const bodyAngle=lift?airPitch:bodyPitch+ground.slope;
      drawContactShadow(shadow,x,z,angle,ground.height,ground.slope);
      if(vehicle.asset)drawImportedCar(vehicle.asset,x,z,angle,bodyHeight,bodyAngle,wheelSpin,steer,lift);
      else drawVehicle(body,x,z,angle,bodyHeight,bodyAngle);
      drawHeadlamps(vehicle.asset?.headlights??headlights,x,z,angle,bodyHeight,headlamps,bodyAngle);
      drawRearLamps(vehicle.asset??vehicle,x,z,angle,bodyHeight,headlamps,braking,bodyAngle);
      if(!vehicle.asset)for(const offsetX of axles){
        for(const offsetZ of [-track,track]){
          const wx=x+offsetX*length*cos-offsetZ*width*sin,wz=z+offsetX*length*sin+offsetZ*width*cos;
          draw(wheel,wx,wz,angle+(offsetX>0?steer:0),(lift?bodyHeight+Math.sin(bodyAngle)*offsetX*length:groundHeight(wx,wz))+WHEEL_RADIUS+.14,wheelSpin);
        }
      }
      if(!preview&&!lift){
        const model=CARS[car.model??0];
        drawSmoke(car,length,width,bodyHeight,dt,road,model.exhausts??singleExhaust,accelerating&&model.flameExhaust,model.blackExhaust);
      }
    },
    destroy(){
      destroyed=true;
      assetRequests.abort();
      if(buildingFallback){
        gl.deleteBuffer(buildingFallback.structure.buffer);
        gl.deleteBuffer(buildingFallback.lights.buffer);
        gl.deleteBuffer(buildingFallback.landmarks.buffer);
      }
      for(const buffer of assetBuffers)gl.deleteBuffer(buffer);
      for(const texture of assetTextures)gl.deleteTexture(texture);
      for(const {asset} of [...vehicles,policeVehicle]){
        if(!asset)continue;
        for(const lamp of [asset.headlights,asset.redStrobe,asset.blueStrobe])if(lamp)gl.deleteBuffer(lamp.buffer);
        gl.deleteBuffer(asset.rearLenses.buffer);
        gl.deleteBuffer(asset.rearGlow.buffer);
      }
      gl.deleteBuffer(lampGlow.buffer);
      for(const [,batch] of decorationFallbacks)gl.deleteBuffer(batch.buffer);
      gl.deleteBuffer(smokeBuffer);
      for(const {mesh} of terrainSurfaces)gl.deleteBuffer(mesh.buffer);
      for(const mesh of [atmosphere,landscape,juniperGround,pavement,asphalt,copperAsphalt,bridgeFallback,world,streetShadows,windows,gate,patrolBody,policeBar,redStrobe,blueStrobe])gl.deleteBuffer(mesh.buffer);
      for(const {body,wheel,rearLenses,rearGlow,headlights,shadow} of vehicles){
        for(const mesh of [body,wheel,rearLenses,rearGlow,headlights,shadow])gl.deleteBuffer(mesh.buffer);
      }
      if(basicScenery)gl.deleteBuffer(basicScenery.buffer);
      gl.deleteBuffer(copperFallback.buffer);
      if(cityGround)gl.deleteBuffer(cityGround.buffer);
      if(cityConnection)gl.deleteBuffer(cityConnection.buffer);
      for(const {base,debris} of debrisMeshes.values()){
        gl.deleteBuffer(base.buffer);
        if(debris)gl.deleteBuffer(debris.buffer);
      }
      gl.deleteProgram(program);
    }
  };
}
