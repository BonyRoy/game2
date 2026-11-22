import {CARS} from './cars.js';
export const SIZE = 5200;
export const CAR_TOP_SPEED=244;
export const KMH_PER_SPEED_UNIT=.76;
export const WORLD_WIDTH=10600;
export const WORLD_HEIGHT=8640;
export const ISLAND_NAMES={coast:'Juniper Island',desert:'Copper Island',snow:'Frostpine Island'};
const bridge={west:4780,east:6100,y:4300,width:132};
export const bridges=[bridge,
  {west:5050,east:6060,y:3800,width:132,vertical:true},
  {west:4980,east:6060,y:7300,width:132,vertical:true}
];
export function snowHalfWidth(y){
  return 2980*Math.max(0,1-((y-7060)/1450)**4)**.25;
}
export function isSnow(x,y){
  return Math.abs(x-5500)<snowHalfWidth(y);
}
export function islandName(x,y){
  if(isSnow(x,y))return ISLAND_NAMES.snow;
  if(isDesert(x,y))return ISLAND_NAMES.desert;
  return y<=SIZE&&x<shore(y)-10?ISLAND_NAMES.coast:'Bridge crossing';
}
export function desertHalfWidth(y){
  return 2460*Math.max(0,1-((y-2600)/2460)**4)**.25;
}
export function isDesert(x,y){
  return Math.abs(x-8000)<desertHalfWidth(y);
}
function bridgeAt(x,y){
  return bridges.find(b=>{
    const along=b.vertical?y:x,across=b.vertical?x:y;
    return along>=b.west&&along<=b.east&&Math.abs(across-b.y)<b.width/2;
  });
}
export function isLand(x,y){
  return (y<=SIZE&&x<shore(y)-10)||isDesert(x,y)||isSnow(x,y);
}
export const START = { x: 1770, y: 2060, angle: -Math.PI / 2 };
export const ISLAND_STARTS={
  coast:START,
  desert:{x:6800,y:3850,angle:-Math.PI/2},
  snow:{x:5050,y:7220,angle:-Math.PI/2}
};

export const routes = [
  [[1770,3490],[1770,3100],[1770,2390],[1770,1550],[1770,1120],[1620,830],[1410,540],[1410,130]],
  [[650,1550],[1770,1550],[1940,1510],[2230,1260],[2470,1290],[2650,1480],[2710,1720],[2680,1920],[2710,2110],[2670,2300],[2540,2390],[1770,2390],[1020,2390],[810,2540],[690,2900]],
  [[1770,1120],[1660,1100],[1200,1100],[950,980],[780,810],[410,810]],
  [[1770,2000],[1390,2000],[1220,1920],[1120,1550]],
  [[1770,2820],[2190,2820],[2410,2710],[2540,2390]],
  [[1770,3490],[1370,3490],[1040,3730],[750,3800],[500,3610],[410,3250],[690,2900]],
  [[750,3800],[740,4130],[960,4330],[1370,4290],[1750,4090],[2210,4090],[2640,4310],[3050,4400],[3500,4270],[3880,4010],[4250,3970],[4530,4090],[4670,4080]],
  [[1770,3490],[2180,3490],[2640,3680],[3150,3670],[3500,3780],[3880,4010]],
  [[2670,2300],[2780,2590],[2920,2920],[2910,3250],[3150,3670]],
  [[4530,4090],[4570,4220],[4640,4300],[4780,4300]],
  [[6100,4300],[6560,4300],[6800,4140],[6800,3620],[6800,3050],[6690,2470],[6940,1860],[7370,1440],[8050,1320],[8720,1490],[9250,1940],[9520,2470],[9470,3070],[9100,3560],[8650,3880],[8090,4120],[7530,4240],[6800,4140]],
  [[6800,3620],[7350,3620],[7990,3620],[8650,3880]],
  [[7350,4240],[7350,3620],[7350,3050],[7570,2680],[8040,2450],[8760,2480],[9520,2470]],
  [[6800,3050],[7350,3050],[7990,3050],[8550,3020],[9470,3070]],
  [[7990,3620],[7990,3050],[8040,2450],[8050,1320],[7970,650]],
  [[9250,1940],[9670,1600],[9900,1080]],
  [[3500,4270],[3650,4540],[3800,4770],[3800,5050]],
  [[7530,4240],[7350,4540],[7300,4750],[7300,4980]],
  [[3800,6060],[3800,6410],[4060,6760],[4430,6970],[5050,7000],[5650,6880],[6220,6710],[6810,6670],[7300,6390],[7300,6060]],
  [[4060,6760],[3420,7100],[3210,7540],[3760,7860],[4410,7930],[5050,7810],[5580,7930],[6280,7950],[7010,7770],[7610,7530],[7710,7020],[7300,6390]],
  [[5050,7000],[5050,7420],[5050,7810]],
  [[3760,7860],[4220,7520],[5050,7420],[5750,7420],[6410,7240],[6810,6670]],
  [[7010,7770],[6830,8100],[6680,8240]],
  [[2210,4090],[2210,4660],[2460,4830],[3010,4830],[3050,4400]],
];
export const roadWidth = 68;
let seed = 7141;
const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export const shore = y => 3080 + Math.sin(y/355)*106 + Math.sin(y/132)*27 - y*.047 + 2010*smooth((y-2250)/1550);
const distanceTo = (x,y,a,b) => {
  const dx=b[0]-a[0], dy=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
};
const segments=routes.flatMap(route=>route.slice(1).map((point,i)=>[route[i],point]));
const nearRoad = (x,y,radius) => segments.some(([a,b])=>distanceTo(x,y,a,b)<radius);
const smooth = value => {
  const t=clamp(value,0,1);
  return t*t*(3-2*t);
};
export const airfield={x:2530,y:4520,w:90,d:550};
const lighthouse={x:4710,y:4080,name:'Cape Beacon',kind:'lighthouse',w:22,d:22};
const hangar={x:2420,y:4380,w:69,d:55};
export {lighthouse,hangar};

function runwayDistance(x,y){
  return Math.max(Math.abs(x-airfield.x)-airfield.w/2,Math.abs(y-airfield.y)-airfield.d/2);
}

export function bridgeHeight(x,span){
  return 9*smooth((x-span.west)/175)*smooth((span.east-x)/175);
}

export function groundHeight(x,y){
  const span=bridgeAt(x,y);
  if(span)return bridgeHeight(span.vertical?y:x,span);
  const snow=isSnow(x,y);
  const desert=isDesert(x,y);
  if(!snow&&!desert&&(y>SIZE||x>shore(y)-42))return 0;
  let distance=Infinity;
  for(const [a,b] of segments)distance=Math.min(distance,distanceTo(x,y,a,b));
  if(snow){
    const edge=snowHalfWidth(y)-Math.abs(x-5500);
    const hills=10+9*Math.sin(x*.015+y*.011)+6*Math.cos(y*.024-x*.008);
    const summit=150*Math.exp(-(((x-6260)/345)**4+((y-7590)/240)**4));
    return (Math.max(0,hills)+summit)*smooth((distance-68)/105)*smooth(edge/130);
  }
  if(desert){
    const coast=desertHalfWidth(y)-Math.abs(x-8000);
    const dunes=9+8*Math.sin(x*.018+y*.011)+6*Math.cos(x*.027-y*.025);
    const mesa=105*Math.exp(-(((x-8920)/250)**4+((y-1980)/230)**4));
    const approach=1-smooth((190-Math.abs(y-bridge.y))/125)
      *(1-smooth((x-bridge.east-40)/130));
    return (Math.max(0,dunes)+mesa)*smooth((distance-64)/110)*smooth(coast/130)*approach;
  }
  const height=12+6*Math.sin(x*.008+y*.004)+5*Math.cos(y*.015-x*.006)
    +3*Math.sin(x*.034+y*.024)+2*Math.cos(x*.057-y*.023);
  return Math.max(0,height)*smooth((distance-63)/113)*smooth((shore(y)-42-x)/125)*smooth((runwayDistance(x,y)-34)/78);
}
const landmarks = [
  {x:1570,y:1350,name:'JUNIPER',kind:'town'},
  {x:2400,y:1090,name:'THE BLUFFS'},
  {x:2460,y:2580,name:'SOUTH BEACH'},
  {x:1110,y:2210,name:'MARINA'},
  {x:750,y:3800,name:'Pine Hollow',kind:'forest'},
  {x:airfield.x,y:airfield.y,name:'South Airfield',kind:'airfield'},
  lighthouse,
  {x:7350,y:3620,name:'Copper City',kind:'desert'},
  {x:8910,y:1940,name:'Red Mesa',kind:'desert'},
  {x:5450,y:4300,name:'Strait Bridge',kind:'desert'},
  {x:5170,y:7110,name:'Frostpine Village',kind:'snow'},
  {x:6260,y:7600,name:'Glacier Ridge',kind:'snow'},
];
const buildingCandidates=[];
for (const [cx,cy,nx,ny] of [[1540,1320,4,3],[1510,1810,4,3],[1170,2240,5,2],[1960,1810,2,3],[1520,2540,4,2],[640,3950,2,3],[3070,3570,3,2]]) {
  for(let j=0;j<ny;j++) for(let i=0;i<nx;i++){
    const x=cx+(i-(nx-1)/2)*65+random()*10;
    const y=cy+(j-(ny-1)/2)*62+random()*10;
    if(!nearRoad(x,y,66)) buildingCandidates.push({x,y,w:32+random()*21,d:24+random()*17,h:14+random()*17,roof:['#dfaa79','#b97964','#e9d4a7','#99a6a2'][Math.floor(random()*4)]});
  }
}
// Roadside blocks form a street-level district around the starting intersection.
for(const [x, rows] of [[1697,[1660,1738,1816,1894,2050,2128,2206,2284]], [1842,[1648,1730,1812,1894,1976,2058,2140,2222,2304]]]){
  for(const [i,y] of rows.entries()){
    const style=['stucco','brick','glass','retail'][(i+(x>1770?2:0))%4];
    const h={retail:14,stucco:44,brick:57,glass:81}[style]+(style==='retail'?0:i%3*9);
    buildingCandidates.push({x,y,w:style==='retail'?46:39,d:36+i%3*6,h,
      roof:['#dfaa79','#db937a','#e9d4a7','#a8bdba'][i%4],style});
  }
}
for(let row=0;row<12;row++){
  for(let col=0;col<12;col++){
    const x=6740+col*108+random()*24;
    const y=3030+row*97+random()*22;
    if(nearRoad(x,y,73))continue;
    const style=['stucco','brick','glass','retail'][(row+col*3)%4];
    buildingCandidates.push({x,y,w:36+random()*25,d:34+random()*22,
      h:style==='retail'?15:30+random()*83,style,roof:'#cfab81',desert:true});
  }
}
for(let i=0;i<24;i++){
  const x=4570+(i%6)*117,y=7090+Math.floor(i/6)*78;
  if(nearRoad(x,y,61))continue;
  buildingCandidates.push({x,y,w:33+i%5*3,d:28+i%4*4,h:21+i%4*4,roof:'#b49a82',snow:true});
}

function roadCrossesLot([ax,ay],[bx,by],lot,margin){
  const halfWidth=lot.w/2+9+margin,halfDepth=lot.d/2+7+margin;
  let first=0,last=1;
  for(const [start,end,center,radius] of [[ax,bx,lot.x,halfWidth],[ay,by,lot.y,halfDepth]]){
    const delta=end-start;
    if(delta===0){
      if(Math.abs(start-center)>radius)return false;
      continue;
    }
    const enter=(center-radius-start)/delta,leave=(center+radius-start)/delta;
    first=Math.max(first,Math.min(enter,leave));
    last=Math.min(last,Math.max(enter,leave));
    if(first>last)return false;
  }
  return true;
}

const bridgeSegments=bridges.map(({west,east,y,vertical,width})=>({
  points:vertical?[[y,west],[y,east]]:[[west,y],[east,y]],width
}));
const runwaySegment=[[airfield.x,airfield.y-airfield.d/2],[airfield.x,airfield.y+airfield.d/2]];
export const buildings=buildingCandidates.filter(lot=>
  !segments.some(([a,b])=>roadCrossesLot(a,b,lot,roadWidth/2+8))
  &&!bridgeSegments.some(({points:[a,b],width})=>roadCrossesLot(a,b,lot,width/2))
  &&!roadCrossesLot(...runwaySegment,lot,airfield.w/2+7)
);

const respawnSegments=[
  ...segments,
  ...bridgeSegments.map(({points})=>points),
  runwaySegment
];

export function nearestRoadSpawn(car){
  let best=START;
  let bestDistance=Infinity;
  for(const [[ax,ay],[bx,by]] of respawnSegments){
    const dx=bx-ax,dy=by-ay;
    const t=clamp(((car.x-ax)*dx+(car.y-ay)*dy)/(dx*dx+dy*dy),0,1);
    const x=ax+dx*t,y=ay+dy*t;
    const distance=(x-car.x)**2+(y-car.y)**2;
    if(distance>=bestDistance)continue;
    const bearing=Math.atan2(dy,dx);
    const angle=Math.cos(bearing-car.angle)>=0?bearing:bearing+Math.PI;
    best={x,y,angle};
    bestDistance=distance;
  }
  return best;
}

export function isRoad(x,y){
  return Boolean(bridgeAt(x,y))||nearRoad(x,y,roadWidth/2+3)||runwayDistance(x,y)<=0;
}
export const streetlights=Array.from({length:8},(_,i)=>1610+i*100)
  .flatMap(y=>[1731,1809].map(x=>({x,y})))
  .filter(({x,y})=>!nearRoad(x,y,roadWidth/2+3));
const obstacles=[...buildings,lighthouse,hangar];

export function vehicleHitsBuilding({x,y,angle,model=0}){
  const {length=1,width=1}=CARS[model];
  const halfLength=17.85*length,halfWidth=8.05*width;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const c=Math.abs(cos),s=Math.abs(sin);
  const reachX=halfLength*c+halfWidth*s;
  const reachY=halfLength*s+halfWidth*c;
  return obstacles.some(b=>{
    const dx=b.x-x,dy=b.y-y,w=b.w/2,d=b.d/2;
    return Math.abs(dx)<w+reachX&&Math.abs(dy)<d+reachY
      &&Math.abs(dx*cos+dy*sin)<halfLength+w*c+d*s
      &&Math.abs(dy*cos-dx*sin)<halfWidth+w*s+d*c;
  });
}

const treeCandidate=(forest=false)=>({
  x:forest?180+random()*1340:random()*SIZE,
  y:forest?3100+random()*1560:random()*SIZE,
  r:6+random()*(forest?17:12),shade:random(),type:random()
});
export const trees=[
  ...Array.from({length:3200},()=>treeCandidate()),
  ...Array.from({length:430},()=>treeCandidate(true))
].filter(({x,y})=>x<shore(y)-72 && runwayDistance(x,y)>40 && !bridgeAt(x,y) && !nearRoad(x,y,49)
  && !obstacles.some(b=>Math.abs(x-b.x)<b.w/2+17 && Math.abs(y-b.y)<b.d/2+17));
for(let i=0;i<680;i++){
  const y=5660+random()*2790,x=2600+random()*5800;
  if(!isSnow(x,y)||nearRoad(x,y,55)||bridgeAt(x,y)||buildings.some(b=>Math.abs(x-b.x)<43&&Math.abs(y-b.y)<39))continue;
  trees.push({x,y,r:7+random()*15,shade:random(),type:0,snow:true});
}
export const isPalm=tree=>tree.x>shore(tree.y)-565&&tree.type>.49;
const grass = Array.from({length:20500},()=>({x:random()*SIZE,y:random()*SIZE,r:1+random()*5,a:random()}))
  .filter(({x,y})=>x<shore(y)-38);

function polygon(c,points,color){
  c.fillStyle=color;
  c.beginPath();
  points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.closePath();
  c.fill();
}

function coast(c,width,height,offset,color){
  c.beginPath();
  c.moveTo(width,0);
  for(let y=0;y<=height;y+=10)c.lineTo(shore(y)+offset,y);
  c.lineTo(width,height);
  c.closePath();
  c.fillStyle=color;
  c.fill();
}

function drawDesert(c,color){
  c.beginPath();
  for(let y=140;y<5060;y+=20)c.lineTo(8000-desertHalfWidth(y),y);
  c.lineTo(8000,5060);
  for(let y=5040;y>140;y-=20)c.lineTo(8000+desertHalfWidth(y),y);
  c.closePath();
  c.fillStyle=color;
  c.fill();
}

function drawSnow(c,color){
  c.beginPath();
  for(let y=5610;y<8510;y+=20)c.lineTo(5500-snowHalfWidth(y),y);
  c.lineTo(5500,8510);
  for(let y=8490;y>5610;y-=20)c.lineTo(5500+snowHalfWidth(y),y);
  c.closePath();
  c.fillStyle=color;
  c.fill();
}

function drawBridge(c,minimap){
  c.fillStyle=minimap?'#efa96c':'#64696a';
  for(const {west,east,y,width,vertical} of bridges){
    if(vertical)c.fillRect(y-width/2,west,width,east-west);
    else c.fillRect(west,y-width/2,east-west,width);
  }
}
function roads(c,minimap){
  c.lineJoin='round';
  c.lineCap='round';
  const trace=()=>{
    c.beginPath();
    for(const route of routes) route.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  };
  trace();
  c.strokeStyle=minimap?'#bbccb3':'#adad85';
  c.lineWidth=minimap?43:roadWidth+13;
  c.stroke();
  if(minimap)return;
  c.strokeStyle='#d2c9a2';
  c.lineWidth=roadWidth+3;
  c.stroke();
  c.strokeStyle='#5c6260';
  c.lineWidth=roadWidth;
  c.stroke();
  c.strokeStyle='#676c67';
  c.lineWidth=roadWidth-7;
  c.stroke();
  c.setLineDash([14,17]);
  c.lineWidth=1.8;
  c.strokeStyle='#e9c57a';
  c.stroke();
  c.setLineDash([]);
}

export function makeMap(){
  const layer=document.createElement('canvas');
  layer.width=4000;
  layer.height=Math.round(layer.width*WORLD_HEIGHT/WORLD_WIDTH);
  const c=layer.getContext('2d');
  c.scale(layer.width/WORLD_WIDTH,layer.height/WORLD_HEIGHT);
  c.fillStyle='#306e7a';
  c.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  c.save();
  c.beginPath();c.rect(0,0,WORLD_WIDTH,SIZE);c.clip();
  c.fillStyle='#628665';
  c.fillRect(0,0,SIZE,SIZE);
  for(let i=0;i<95;i++){
    const x=random()*SIZE,y=random()*SIZE,r=100+random()*440;
    const gradient=c.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,random()>.45?'#b9ae6946':'#254d4b55');
    gradient.addColorStop(1,'#6c896100');
    c.fillStyle=gradient;
    c.fillRect(x-r,y-r,r*2,r*2);
  }
  grass.forEach(({x,y,r,a})=>{
    c.fillStyle=a>.54?'#d7cf8d36':'#1f473936';
    c.fillRect(x,y,r,r*.65);
  });
  coast(c,WORLD_WIDTH,SIZE,-41,'#cbb784');
  coast(c,WORLD_WIDTH,SIZE,-13,'#ddca9c');
  coast(c,WORLD_WIDTH,SIZE,5,'#9bc9ad');
  coast(c,WORLD_WIDTH,SIZE,16,'#62aaa0');
  coast(c,WORLD_WIDTH,SIZE,48,'#428a8c');
  coast(c,WORLD_WIDTH,SIZE,118,'#367b82');
  coast(c,WORLD_WIDTH,SIZE,245,'#306e7a');
  for(let i=0;i<640;i++){
    const y=random()*SIZE,x=shore(y)+24+random()*600;
    c.fillStyle=i%3?'#b3e3c326':'#deefce5c';
    c.fillRect(x,y,5+random()*32,1+random()*2);
  }
  c.restore();
  drawDesert(c,'#c89962');
  drawSnow(c,'#c6dce2');
  roads(c,false);
  drawBridge(c,false);
  c.fillStyle='#626967';
  c.fillRect(airfield.x-airfield.w/2,airfield.y-airfield.d/2,airfield.w,airfield.d);
  return layer;
}

export const carMarker={
  body:'M-5 7V-4L-3.4-8H3.4L5-4V7Q5 8 4 8H-4Q-5 8-5 7Z',
  glass:'M-3.5-3.4L-2.5-5.3H2.5L3.5-3.4Z M-3.5 4H3.5V5.3H-3.5Z'
};
let markerPaths;

export function drawMinimap(c,width,height,car,targets,labels=false,patrols=[]){
  c.clearRect(0,0,width,height);
  c.save();
  const scale=Math.min(width/(WORLD_WIDTH+220),height/(WORLD_HEIGHT+220));
  c.translate((width-WORLD_WIDTH*scale)/2,(height-WORLD_HEIGHT*scale)/2);
  c.scale(scale,scale);
  c.fillStyle='#284b5b';
  c.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  c.fillStyle='#385950';
  c.fillRect(0,0,SIZE,SIZE);
  coast(c,WORLD_WIDTH,SIZE,-35,'#857e5c');
  coast(c,WORLD_WIDTH,SIZE,0,'#284b5b');
  drawDesert(c,'#a68255');
  drawSnow(c,'#77929a');
  roads(c,true);
  drawBridge(c,true);
  c.fillStyle='#acb5aa';
  c.fillRect(airfield.x-airfield.w/2,airfield.y-airfield.d/2,airfield.w,airfield.d);
  if(labels){
    c.font=`700 ${20/scale}px system-ui`;
    c.textAlign='center';
    c.textBaseline='middle';
    c.fillStyle='#fff2d7';
    for(const [name,x,y] of [[ISLAND_NAMES.coast,1500,330],[ISLAND_NAMES.desert,8200,850],[ISLAND_NAMES.snow,5620,6280]]){
      c.fillText(name,x,y);
    }
  }
  for(const item of landmarks){
    c.fillStyle=item.kind&&item.kind!=='town'?'#f0be78':'#8ba49b';
    c.beginPath();c.arc(item.x,item.y,item.kind?38:27,0,Math.PI*2);c.fill();
    if(labels&&item.kind&&item.kind!=='town'){
      const left=item.kind==='lighthouse';
      c.font=`600 ${17/scale}px system-ui`;
      c.textAlign=left?'right':'left';
      c.textBaseline='middle';
      c.lineWidth=4/scale;
      c.strokeStyle='#213530';
      const labelX=item.x+(left?-75:75),labelY=item.y-88;
      c.strokeText(item.name,labelX,labelY);
      c.fillText(item.name,labelX,labelY);
    }
  }
  for(const target of targets){
    c.fillStyle='#f9c575';
    const radius=(labels?9:8)/scale;
    c.beginPath();c.arc(target.x,target.y,radius,0,Math.PI*2);c.fill();
    c.fillStyle='#172824';
    c.font=`700 ${(labels?12:11)/scale}px system-ui`;
    c.textAlign='center';
    c.textBaseline='middle';
    c.fillText(target.number,target.x,target.y);
  }
  for(const patrol of patrols){
    c.fillStyle='#ff665e';
    c.beginPath();
    c.arc(patrol.x,patrol.y,3.5/scale,0,Math.PI*2);
    c.fill();
  }
  c.translate(car.x,car.y);
  c.rotate(car.angle+Math.PI/2);
  const iconScale=(labels?1.1:.95)/scale;
  c.scale(iconScale,iconScale);
  markerPaths??=[new Path2D(carMarker.body),new Path2D(carMarker.glass)];
  c.fillStyle='#fff4cf';
  c.strokeStyle='#172824';
  c.lineWidth=2.5;
  c.stroke(markerPaths[0]);
  c.fill(markerPaths[0]);
  c.fillStyle='#345358';
  c.fill(markerPaths[1]);
  c.restore();
}

function drawTree(c,t){
  const {x,y,r,shade,type}=t;
  c.fillStyle='#223c3458';
  c.beginPath();c.ellipse(x+r*.75,y+r*.45,r*1.55,r*.62,-.28,0,7);c.fill();
  c.fillStyle='#524a34'; c.fillRect(x-1.8,y-r*.45,3.6,r*.72);
  if(type>.37){
    const colors=shade>.6?['#254f43','#3c7055','#68936b']:['#254c40','#38674c','#577c53'];
    for(let row=0;row<3;row++){
      const w=r*(1-row*.2), bottom=y-r*(.05+row*.45), top=bottom-r*1.2;
      polygon(c,[[x-w,bottom],[x,top],[x+w,bottom],[x,bottom+r*.24]],colors[0]);
      polygon(c,[[x-w,bottom],[x,top],[x,bottom+r*.24]],colors[row===2?2:1]);
    }
  } else {
    for(let i=0;i<3;i++){
      c.fillStyle=['#2a5140','#4b744e','#72935f'][i];
      c.beginPath();c.ellipse(x+(i-1)*r*.24,y-r*(.6+i*.39),r*(1-i*.16),r*.68,0,0,7);c.fill();
    }
  }
}
function drawBuilding(c,b){
  const {x,y,w,d,h,roof}=b;
  const l=x-w/2,r=x+w/2,t=y-d/2,f=y+d/2;
  polygon(c,[[l,f],[r,f],[r+h*1.2,f+9],[r+h*1.2,t+6],[l,t]],'#273b365f');
  polygon(c,[[l,f-h],[r,f-h],[r,f],[l,f]],'#aa8d6c');
  polygon(c,[[r,t-h],[r,f-h],[r,f],[r,t]],'#756f57');
  polygon(c,[[l,t-h],[r,t-h],[r,f-h],[l,f-h]],roof);
  polygon(c,[[l,(t+f)/2-h-5],[r,(t+f)/2-h-5],[r,f-h],[l,f-h]],'#291c1726');
  c.fillStyle='#544f43';
  c.fillRect(x-3,f-8,6,8);
  c.fillStyle='#e2d5aa';
  c.fillRect(l+6,f-10,6,4);
  c.fillRect(r-12,f-10,6,4);
}
function drawCar(c,car){
  const model=CARS[car.model??0];
  const {paint,roof,length=1,width=1}=car.police?{paint:['#252c3c',null,'#aab7c3'],roof:'#596d88'}:model;
  c.save();
  c.translate(car.x,car.y);
  c.rotate(car.angle);
  c.scale(length,width);
  c.fillStyle='#17292380'; c.beginPath(); c.ellipse(2,3,20,11,0,0,7);c.fill();
  c.fillStyle='#192926';
  for(const x of [-10,8])for(const y of [-9,6])c.fillRect(x-4,y,8,4);
  c.beginPath();c.roundRect(-17,-8.8,34,17.6,4);c.fillStyle=paint[0];c.fill();
  c.beginPath();c.roundRect(-16,-8.3,33,15.7,4);c.fillStyle=paint[2];c.fill();
  polygon(c,[[-11,-6],[-6,-5],[4,-5],[8,-6],[8,6],[4,5],[-6,5],[-11,6]],'#30464e');
  c.fillStyle=roof;c.fillRect(-5,-4.7,8,9.4);
  c.fillStyle='#ffdaa1';c.fillRect(13,-6.8,3,3.5);c.fillRect(13,3.3,3,3.5);
  c.fillStyle='#ffac82';c.fillRect(-16,-7,2,4);c.fillRect(-16,3,2,4);
  c.restore();
}

export function renderWorld(c,map,camera,width,height,car,targets,time,patrols=[]){
  const {x,y,zoom}=camera;
  c.fillStyle='#496850';c.fillRect(0,0,width,height);
  c.save();
  c.translate(width/2,height*.54);
  c.scale(zoom,zoom);
  c.translate(-x,-y);
  c.drawImage(map,0,0,WORLD_WIDTH,WORLD_HEIGHT);
  const visible=o=>Math.abs(o.x-x)<width/(zoom*2)+110 && Math.abs(o.y-y)<height/(zoom*1.7)+120;
  const scenery=[...trees.filter(visible),...buildings.filter(visible),...patrols.filter(visible),car].sort((a,b)=>a.y-b.y);
  for(const target of targets.filter(visible)){
    const pulse=1+Math.sin(time*3)*.12;
    c.beginPath();c.arc(target.x,target.y,28*pulse,0,7);c.fillStyle='#f4b85a30';c.fill();
    c.lineWidth=2;c.strokeStyle='#ffdc89';c.stroke();
    c.beginPath();c.moveTo(target.x,target.y);c.lineTo(target.x,target.y-36);c.stroke();
    polygon(c,[[target.x,target.y-45],[target.x+7,target.y-38],[target.x,target.y-31],[target.x-7,target.y-38]],'#ffdc89');
  }
  for(const item of scenery) {
    if(item===car||item.police||item.traffic)drawCar(c,car);
    else if(item.roof)drawBuilding(c,item);
    else drawTree(c,item);
  }
  c.restore();
}

export function drive(car,keys,dt,speedLimit=CAR_TOP_SPEED){
  const road=isRoad(car.x,car.y);
  const reversePedal=keys.has('brakeReverse');
  const pedalBraking=reversePedal&&car.speed>0;
  const throttle=reversePedal?(pedalBraking?0:-1):Number(keys.has('up'))-Number(keys.has('down'));
  const steering=Number(keys.has('right'))-Number(keys.has('left'));
  const braking=keys.has('brake')||pedalBraking;
  if(pedalBraking)car.speed=Math.max(0,car.speed-135*dt);
  car.speed+=throttle*119*dt;
  car.speed*=Math.exp(-(braking?4.3:throttle?.44:.49)*dt);
  car.speed=clamp(car.speed,-62,speedLimit);
  if(!throttle&&Math.abs(car.speed)<.8)car.speed=0;
  const speed=Math.abs(car.speed);
  const desiredSteer=steering*.37/(1+speed/290);
  car.steer=(car.steer??0)+(desiredSteer-(car.steer??0))*(1-Math.exp(-dt*10));
  const turnRate=Math.tan(car.steer)*car.speed/19.7;
  const previousAngle=car.angle;
  car.angle+=clamp(turnRate,-1.65,1.65)*(braking?1.18:1)*dt;
  const x=car.x+Math.cos(car.angle)*car.speed*dt;
  const y=car.y+Math.sin(car.angle)*car.speed*dt;
  const span=bridgeAt(car.x,car.y);
  const along=span?.vertical?y:x,across=span?.vertical?x:y;
  const railHit=span&&along>span.west+8&&along<span.east-8&&Math.abs(across-span.y)>span.width/2-7;
  car.boundaryHit=!railHit&&(x<35||x>WORLD_WIDTH-35||y<35||y>WORLD_HEIGHT-35
    ||(!isLand(x,y)&&!bridgeAt(x,y)));
  if(car.boundaryHit)return road;
  const blocked=vehicleHitsBuilding({x,y,angle:car.angle,model:car.model});
  const treeHit=trees.some(tree=>{
    const dx=tree.x-x,dy=tree.y-y;
    if(Math.abs(dx)>21||Math.abs(dy)>21)return false;
    const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    const along=Math.max(0,Math.abs(dx*cos+dy*sin)-15.9);
    const across=Math.max(0,Math.abs(dy*cos-dx*sin)-6.9);
    const radius=isPalm(tree)?.82:tree.r*.09;
    return along*along+across*across<radius*radius;
  });
  if(blocked || treeHit || railHit){
    if(blocked&&vehicleHitsBuilding(car))car.angle=previousAngle;
    car.speed*=-.3;
  }
  else {car.x=x;car.y=y;}
  return road;
}
