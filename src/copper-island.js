export const COPPER_CITY_SCALE=205*.988**2*.987/1.5**2;
export const COPPER_GATE_WIDTH=1.34215*COPPER_CITY_SCALE;
export const COPPER_CITY_ORIGIN=[-4.18,-.4925,.715];
export const COPPER_CITY_ROTATION=-Math.PI/2;
// Keep the two bridge landings fixed while drawing the city and north shore inward.
const compactX=x=>x<=7300?x:7300+(x-7300)*.76;
const compactY=y=>y>=4300?y:4300+(y-4300)*.76;
const compactPoint=([x,y])=>[compactX(x),compactY(y)];

const copperDistrictCenters=[
  {x:7990,y:500,angle:.36},
  {x:12205,y:1060,angle:.35},
  {x:7900,y:3590,angle:-.36}
].map(({x,y,angle})=>({x:compactX(x),y:compactY(y),angle}));

// Place both blocks along the same avenue, with room for a short connector.
const blockSpacing=18.5*COPPER_CITY_SCALE;
const copperDistrictPairs=copperDistrictCenters.map(({x,y,angle})=>[-.5,.5].map(offset=>({
  x:x+Math.cos(angle)*blockSpacing*offset,
  y:y+Math.sin(angle)*blockSpacing*offset,
  angle
})));
export const COPPER_DISTRICTS=copperDistrictPairs.flat();

export const COPPER_SHORE={west:5890,east:12880,north:205,south:5290};
export const COPPER_GRID={west:6160,center:compactX(10060),east:compactX(14150),north:compactY(-972),middle:compactY(2150),south:5035};
const {west,center,east,north,middle,south}=COPPER_GRID;
export const COPPER_JUNCTION=[center,middle];
const centerNorth=[center,compactY(-840)],centerSouth=[center,4685];
const eastNorth=[east,compactY(440)],eastSouth=[east,compactY(2320)];
const roundedTurns=[[west,north],[west,south],eastSouth];

export function copperCornerTrim(x,y){
  return roundedTurns.some(([cx,cy])=>x===cx&&y===cy)?340:76;
}

export const COPPER_NORTH_EDGE=[
  [west,north],...[[7850,-988],[9180,-970]].map(compactPoint),centerNorth,
  ...[[11120,-650],[12430,-430],[13665,-110],[14055,190]].map(compactPoint),eastNorth
];
export const COPPER_SOUTH_EDGE=[[west,south],[7300,south],...[[8380,4980],[9250,4885]].map(compactPoint),centerSouth];

export const COPPER_EAST_EDGE=[eastSouth,...[[13280,2490],[11625,2505],[10675,2370]].map(compactPoint),COPPER_JUNCTION];

export const COPPER_ROUTES=[
  [[6100,4300],[west,4300]],
  [[west,middle],...COPPER_NORTH_EDGE,...COPPER_EAST_EDGE,[west,middle]],
  [[west,middle],[west,4300],...COPPER_SOUTH_EDGE,[center,middle],[west,middle]],
  [centerNorth,COPPER_JUNCTION,centerSouth]
];

export const COPPER_SOUTH_ROAD=[[7300,south],[7300,south+60]];

// The wide eastern point sweeps down toward the southern bridge head.
const coastSections=[
  [205,6780,6780],[216,6570,7350],[231,6410,8650],[275,6280,9280],
  [360,6150,10060],[510,6050,10800],[670,5970,11600],[850,6015,12250],
  [1040,6050,12600],[1260,6010,12770],[1510,5940,12835],
  [1780,5960,12790],[2030,6030,12835],[2290,6000,12880],
  [2530,6025,12837],[2750,5960,12720],[2970,5970,12335],
  [3230,6045,11875],[3500,6060,11410],[3780,6010,10915],
  [4050,5930,10465],[4300,5890,10080],[4540,5975,9750],
  [4740,6010,9550],[4890,6010,9390],[5010,6080,9060],
  [5090,6230,8725],[5170,6610,8200],[5250,7010,7800],[5290,7440,7440]
];

export function copperShoreRange(y){
  if(y<COPPER_SHORE.north||y>COPPER_SHORE.south)return null;
  let low=0,high=coastSections.length-1;
  while(high-low>1){
    const mid=(low+high)>>1;
    if(coastSections[mid][0]<=y)low=mid;
    else high=mid;
  }
  const [ay,aw,ae]=coastSections[low],[by,bw,be]=coastSections[high];
  const t=(y-ay)/(by-ay),smooth=t*.65+t*t*(3-2*t)*.35;
  return [aw+(bw-aw)*smooth,ae+(be-ae)*smooth];
}

const coastalDunes=[
  [6050,-465,78,258,29,.2],[6070,-290,60,216,22,.21],[6060,410,73,285,24,-.1],
  [6050,620,72,240,26,-.12],[6025,1540,82,310,34,.13],[6040,1750,76,245,24,.15],
  [6062,2770,77,255,27,-.12],[6060,2980,74,215,23,-.14],
  [6018,3985,78,185,27,-.2],[6000,4140,74,160,21,-.2],
  [9960,-921,120,74,23,.12],[10950,-760,150,74,28,.1],
  [12110,-565,155,88,26,.17],[12410,-501,180,83,29,.18],[13260,-320,175,96,35,.19],
  [13580,-200,153,88,25,.12],[14266,475,90,208,31,.07],[14287,665,82,189,26,.13],
  [14289,1120,103,275,36,-.11],[14315,1320,107,218,29,-.08],
  [14265,1740,95,220,29,.12],[14278,1930,92,185,30,.14],
  [13340,2590,215,118,28,.29],[12980,2585,182,102,25,.17],
  [11825,2640,212,140,36,.32],[11570,2700,176,105,24,.2],
  [10560,2785,165,140,32,.34],[10308,3240,138,250,29,-.14],
  [10255,3490,118,235,28,-.13],[10278,4010,106,250,32,-.17],
  [10215,4590,100,193,26,.19],[10170,4760,73,159,19,.16]
];

function makeCopperDunes(){
  return [
    ...coastalDunes.map(([x,y,rx,ry,...shape])=>[...compactPoint([x,y]),rx*.85,ry*.85,...shape]),
    ...COPPER_DISTRICTS.flatMap(district=>[
      [4,2.4,140,185,31,.36],[4.7,2.8,130,170,26,.42],[-2.2,4.5,105,144,23,.46],
      [11,-3.2,163,153,32,-.35],[11.8,-3.7,151,140,27,-.29],[10,5.3,135,132,25,.3],
      [10.7,5.8,128,130,28,.32],[11.6,5.6,119,110,23,-.3]
    ].map(([u,v,...shape])=>[...toWorld(district,u,v),...shape]))
  ];
}


export function copperDuneHeight(x,y){
  let height=0;
  for(const [cx,cy,rx,ry,rise,lean] of COPPER_DUNES){
    const along=(y-cy)/ry;
    if(Math.abs(along)>=1)continue;
    const across=(x-cx)/rx-along*lean;
    const radius=across*across+along*along;
    if(radius>=1)continue;
    const crest=rise*(1-radius)**2*(1+across*.42);
    height+=crest*(1-height/60);
  }
  return height;
}

const meshLeft=-4.25,meshTop=-5.25,samplesPerUnit=24;
const cell=COPPER_CITY_SCALE/samplesPerUnit;
export const COPPER_STREET_HEIGHT=.15;

function toWorld(district,progress,lateral){
  const u=(progress+COPPER_CITY_ORIGIN[0])*COPPER_CITY_SCALE;
  const v=(lateral+COPPER_CITY_ORIGIN[2])*COPPER_CITY_SCALE;
  const c=Math.cos(district.angle),s=Math.sin(district.angle);
  return [district.x+u*c-v*s,district.y+u*s+v*c];
}

function toLocal(district,x,y){
  const dx=x-district.x,dy=y-district.y,c=Math.cos(district.angle),s=Math.sin(district.angle);
  return [dx*c+dy*s,dy*c-dx*s];
}

export const COPPER_DUNES=makeCopperDunes();

// Ground-level footprints rasterized from the Beautiful City GLB.
const buildingBounds=[
  [5.5,-4.792,10.333,-2.0,4.5],
  [-4.042,-4.75,3.0,-1.917,3.6],
  [-4.0,0.5,2.917,3.208,3.2],
  [5.458,0.542,13.042,4.458,4.8]
];
export const COPPER_BUILDINGS=COPPER_DISTRICTS.flatMap(district=>buildingBounds.map(([left,top,right,bottom,height])=>{
  const [x,y]=toWorld(district,(left+right)/2,(top+bottom)/2);
  return {x,y,angle:district.angle,w:(right-left)*COPPER_CITY_SCALE,d:(bottom-top)*COPPER_CITY_SCALE,h:height*COPPER_CITY_SCALE};
}));

export function inCopperDistrict(x,y,margin=0){
  return COPPER_DISTRICTS.some(district=>{
    const [u,v]=toLocal(district,x,y);
    return Math.abs(u)<9.05*COPPER_CITY_SCALE+margin&&v>-4.5*COPPER_CITY_SCALE-margin&&v<7.85*COPPER_CITY_SCALE+margin;
  });
}

const avenue=[[-3.5,-.715],[11.87,-.715]];
const districtAvenues=copperDistrictPairs.map(pair=>pair.map(district=>
  avenue.map(([x,y])=>toWorld(district,x,y))
));
export const COPPER_AVENUES=districtAvenues.flat();
export const COPPER_THROUGH_AVENUES=districtAvenues.map(pair=>pair.flat());

function cityConnector(anchor,gate,heading,reverse=false,entryHeading){
  const [ax,ay]=anchor,[gx,gy]=gate;
  const dx=gx-ax,dy=gy-ay,length=Math.hypot(dx,dy);
  const handle=Math.min(285,length*.48);
  const approach=entryHeading??Math.atan2(dy,dx);
  const bx=ax+Math.cos(approach)*handle,by=ay+Math.sin(approach)*handle;
  const cx=gx-Math.cos(heading)*handle,cy=gy-Math.sin(heading)*handle;
  const steps=Math.max(7,Math.ceil(length/36));
  const path=Array.from({length:steps+1},(_,i)=>{
    if(i===0)return anchor;
    if(i===steps)return gate;
    const t=i/steps,u=1-t;
    return [u**3*ax+3*u*u*t*bx+3*u*t*t*cx+t**3*gx,u**3*ay+3*u*u*t*by+3*u*t*t*cy+t**3*gy];
  });
  const width=[],sidewalk=[];
  let distance=0;
  for(let i=path.length-1;i>=0;i--){
    if(i<path.length-1)distance+=Math.hypot(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]);
    const t=Math.max(0,1-distance/270);
    const flare=t*t*(3-2*t);
    width[i]=68+(COPPER_GATE_WIDTH-68)*flare;
    sidewalk[i]=79+(2.63593*COPPER_CITY_SCALE-79)*flare;
  }
  if(reverse){path.reverse();width.reverse();sidewalk.reverse();}
  return {path,width,sidewalk};
}

const districtApproaches=COPPER_THROUGH_AVENUES.flatMap(([westGate,,,eastGate],index)=>{
  const heading=copperDistrictCenters[index].angle;
  const westAnchor=index===1?COPPER_JUNCTION:[west,westGate[1]];
  const eastAnchor=index===1?[east,eastGate[1]]:COPPER_JUNCTION;
  return [cityConnector(westAnchor,westGate,heading,false,index===1?-3*Math.PI/4:undefined),
    cityConnector(eastAnchor,eastGate,heading+Math.PI,true)];
});
const blockLinks=COPPER_THROUGH_AVENUES.map(([,firstExit,secondEntry])=>({
  path:[firstExit,secondEntry],
  width:[COPPER_GATE_WIDTH,COPPER_GATE_WIDTH],
  sidewalk:Array(2).fill(2.63593*COPPER_CITY_SCALE)
}));
export const COPPER_CONNECTORS=[...districtApproaches,...blockLinks];
export const COPPER_DISTRICT_ENTRIES=districtApproaches.map(connector=>connector.path);
export const COPPER_CONNECTOR_PATHS=COPPER_CONNECTORS.map(connector=>connector.path);

export function isCopperConnector(x,y,margin=0,sidewalk=false){
  return COPPER_CONNECTORS.some(({path,width,sidewalk:shoulder})=>{
    const widths=sidewalk?shoulder:width;
    for(let i=1;i<path.length;i++){
      const [ax,ay]=path[i-1],[bx,by]=path[i];
      const reach=Math.max(widths[i-1],widths[i])/2+margin;
      if(x<Math.min(ax,bx)-reach||x>Math.max(ax,bx)+reach||y<Math.min(ay,by)-reach||y>Math.max(ay,by)+reach)continue;
      const dx=bx-ax,dy=by-ay;
      const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
      const radius=(widths[i-1]+(widths[i]-widths[i-1])*t)/2+margin;
      if((x-ax-dx*t)**2+(y-ay-dy*t)**2<=radius*radius)return true;
    }
    return false;
  });
}

const [[copperEntryX,copperEntryY]]=COPPER_DISTRICT_ENTRIES[4];
export const COPPER_START={x:copperEntryX+85,y:copperEntryY,angle:0};

// Each row stores half-open horizontal ranges in the source model.
const streetRows=expandRows([
  [77,141,16,390],
  [141,297,171,220]
]);

const solidRows=expandRows([
  [11,12,234,351],
  [12,21,57,175,234,351],
  [21,22,56,175,234,351],
  [22,79,5,175,234,351],
  [79,81,5,18],
  [138,139,6,18],
  [139,140,6,171,233,298,299,416],
  [140,141,6,172,233,416],
  [141,167,6,173,233,416],
  [167,168,6,105,144,173,233,416],
  [168,197,6,104,233,416],
  [197,198,58,104,233,416],
  [198,204,59,104,233,416],
  [204,208,233,416],
  [208,209,233,299],
  [209,234,233,298]
]);


function expandRows(bands){
  const rows=new Map();
  for(const [start,end,...ranges] of bands){
    for(let row=start;row<end;row++)rows.set(row,ranges);
  }
  return rows;
}

const maskLeft=(meshLeft+COPPER_CITY_ORIGIN[0])*COPPER_CITY_SCALE;
const maskTop=(meshTop+COPPER_CITY_ORIGIN[2])*COPPER_CITY_SCALE;

export function isCopperStreet(x,y){
  return COPPER_DISTRICTS.some(district=>{
    const [u,v]=toLocal(district,x,y);
    const col=Math.round((u-maskLeft)/cell),row=Math.round((v-maskTop)/cell);
    const ranges=streetRows.get(row)??[];
    for(let i=0;i<ranges.length;i+=2){
      if(col>=ranges[i]&&col<ranges[i+1])return true;
    }
    return false;
  });
}

export function hitsCopperBuilding(x,y,angle,halfLength,halfWidth){
  return COPPER_DISTRICTS.some(district=>{
    const [u,v]=toLocal(district,x,y);
    const heading=angle-district.angle,c=Math.cos(heading),s=Math.sin(heading);
    const ac=Math.abs(c),as=Math.abs(s);
    const reachX=halfLength*ac+halfWidth*as,reachY=halfLength*as+halfWidth*ac;
    if(Math.abs(u)>9.05*COPPER_CITY_SCALE+reachX||Math.abs(v)>5.3*COPPER_CITY_SCALE+reachY)return false;
    for(let row=Math.ceil((v-maskTop-reachY)/cell-.5);row<=(v-maskTop+reachY)/cell+.5;row++){
      const ranges=solidRows.get(row)??[];
      for(let i=0;i<ranges.length;i+=2){
        const start=ranges[i],end=ranges[i+1];
        const dx=maskLeft+(start+end-1)*cell/2-u,dy=maskTop+row*cell-v;
        const w=(end-start)*cell/2,d=cell/2;
        if(Math.abs(dx)<w+reachX&&Math.abs(dy)<d+reachY&&
          Math.abs(dx*c+dy*s)<halfLength+w*ac+d*as&&Math.abs(dy*c-dx*s)<halfWidth+w*as+d*ac)return true;
      }
    }
    return false;
  });
}
