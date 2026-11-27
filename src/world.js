import {FROSTPINE_MOUNTAIN,mountainSample} from './frostpine-mountain.js';
import {COPPER_ROUTES,COPPER_SHORE,copperCornerTrim,copperShoreRange,COPPER_DUNES,copperDuneHeight,COPPER_GRID,COPPER_JUNCTION,COPPER_SOUTH_ROAD,COPPER_BUILDINGS,COPPER_STREET_HEIGHT,COPPER_CONNECTOR_PATHS,COPPER_AVENUES,COPPER_START,isCopperStreet,isCopperConnector,hitsCopperBuilding} from './copper-island.js';
import {CITY,CITY_BRIDGE,CITY_APPROACHES,CITY_DISTRICTS,CITY_HALF_SIZE,CITY_STREETS,cityShoreline,isCityBridge,isCityLand,hitsCityBuilding} from './city-island.js';
import {roundRoad} from './road-curves.js';
import {CARS} from './cars.js';
export const SIZE = 5200;
export const CAR_TOP_SPEED=244;
export const KMH_PER_SPEED_UNIT=.76;
const ORIGINAL_WORLD_HEIGHT=8640;
export const WORLD_WIDTH=14800;
export const WORLD_MIN_Y=Math.min(0,COPPER_SHORE.north);
export const WORLD_HEIGHT=8800;
export const ISLAND_NAMES={coast:'Juniper Island',desert:'Copper Island',snow:'Frostpine Island',city:'Harbor City'};
const bridge={west:4780,east:6100,y:4300,width:132};
export const bridges=[bridge,
  {west:5050,east:6060,y:3800,width:132,vertical:true},
  {west:COPPER_GRID.south,east:6060,y:7300,width:132,vertical:true}
];
export function snowHalfWidth(y){
  return 2980*Math.max(0,1-((y-7060)/1450)**4)**.25;
}
export function isSnow(x,y){
  return Math.abs(x-5500)<snowHalfWidth(y);
}
export function islandName(x,y){
  if(isCityLand(x,y))return ISLAND_NAMES.city;
  if(isSnow(x,y))return ISLAND_NAMES.snow;
  if(isDesert(x,y))return ISLAND_NAMES.desert;
  return isJuniperLand(x,y)?ISLAND_NAMES.coast:'Bridge crossing';
}
export const DESERT_CENTER=(COPPER_SHORE.west+COPPER_SHORE.east)/2;

export function isDesert(x,y){
  const shore=copperShoreRange(y);
  return Boolean(shore&&x>=shore[0]&&x<=shore[1]);
}
let cityBridgeEnabled=false;

export function setCityBridgeEnabled(enabled){
  cityBridgeEnabled=enabled;
}

function bridgeAt(x,y,showCity=cityBridgeEnabled){
  if(showCity&&isCityBridge(x,y))return CITY_BRIDGE;
  return bridges.find(b=>{
    const along=b.vertical?y:x,across=b.vertical?x:y;
    return along>=b.west&&along<=b.east&&Math.abs(across-b.y)<b.width/2;
  });
}
export function isLand(x,y){
  return isCityLand(x,y)||isJuniperLand(x,y)||isDesert(x,y)||isSnow(x,y);
}
export const START = { x: 1770, y: 2060, angle: -Math.PI / 2 };
export const ISLAND_STARTS={
  coast:START,
  desert:COPPER_START,
  snow:{x:4860,y:7240,angle:-Math.PI/2},
  city:{x:CITY.x-300,y:CITY.y,angle:0}
};

const westStreet=570,westAvenue=1080,mainAvenue=1770,eastStreet=2370;
const juniperCrossStreets=[
  [[westStreet,1030],[eastStreet,1030]],
  [[westAvenue,1660],[eastStreet,1660]],
  [[westStreet,2070],[890,2070],[1240,2250],[eastStreet,2250]],
  [[westStreet,3040],[eastStreet,3040]],
  [[mainAvenue,3560],[eastStreet,3560]]
];
export const JUNIPER_ROWS=juniperCrossStreets.map(street=>street.at(-1)[1]);
const northStreet=560,southStreet=4160;
const juniperPerimeter=[
  [westStreet,860],[westStreet,northStreet],[eastStreet,northStreet],
  [eastStreet,southStreet],[westStreet,southStreet],[westStreet,3950],
  [440,3710],[445,3370],[westStreet,3180],[westStreet,2270],
  [westStreet,2070],[westStreet,1910],[435,1710],[450,1440],
  [westStreet,1240],[westStreet,860]
];
const juniperCoastRoad=[
  [eastStreet,3560],[2860,3560],[3330,3710],[3790,3980],
  [4250,3970],[4530,4090],[4670,4080]
];
const juniperBridgeRoad=[[4530,4090],[4570,4220],[4640,4300],[4780,4300]];
const juniperSouthRoad=[[eastStreet,3950],[2600,4135],[2960,southStreet],[3500,4270],[3650,4540],[3800,4770],[3800,5050]];
const juniperScenicLoop=[
  ...juniperCoastRoad.slice(0,4),[3500,4270],[2960,southStreet],
  ...juniperSouthRoad.slice(0,2).reverse(),[eastStreet,3560]
];
export const JUNIPER_TRAFFIC_ROUTES=[juniperPerimeter,juniperScenicLoop,
  [[westAvenue,1030],[eastStreet,1030],[eastStreet,3040],[westAvenue,3040]]
];
const juniperWestAvenue=[
  [westAvenue,northStreet],[westAvenue,3040],[1080,3350],[1310,3580],[1310,southStreet]
];
const juniperRoads=[
  juniperWestAvenue,[[mainAvenue,northStreet],[mainAvenue,southStreet]],
  ...juniperCrossStreets,
  juniperCoastRoad,juniperBridgeRoad,juniperSouthRoad,
  [[3790,3980],[3500,4270]],
  [[2210,southStreet],[2210,4660],[2460,4830],[3010,4830],[3140,4620],[3140,4193.6]],
  [[2590,4830],[2590,4750]]
];
const frostpineStadium={x:5285,y:7160,name:'Frostpine Stadium'};
const stadiumDepth=287;
const frostpineBridgeRoad=[
  [3800,6060],[3800,6440],[4060,6690],[4630,6760],[5370,6760],
  [5870,6610],[6480,6420],[7110,6300],[7300,6060]
];
const frostpineTownLoop=[
  [4060,6690],[3650,6850],[3440,7270],[3490,7620],[3820,7860],
  [4500,7910],[5010,7890],[5500,7760],[5670,7520],[5620,7210],
  [5540,6960],[5370,6760]
];
const frostpineCrossStreets=[
  [[3650,6850],[3920,6960],[5540,6960]],
  [[3440,7270],[4220,7270],[4420,7360],[5650,7360]],
  [[3490,7620],[3890,7620],[4070,7570],[5650,7570]]
];
const frostpineAvenues=[
  [[4060,6690],[4060,7060],[4060,7270],[4070,7570],[4070,7878.4]],
  [[4860,6760],[4860,7570],[4790,7898.6]],
  [[frostpineStadium.x,6960],[frostpineStadium.x,frostpineStadium.y-stadiumDepth/2]]
];
const frostpineRoads=[
  frostpineBridgeRoad,[...frostpineTownLoop,[4630,6760],[4060,6690]],
  ...frostpineCrossStreets,...frostpineAvenues
];
export const FROSTPINE_TRAFFIC_ROUTES=[
  [...frostpineTownLoop,[4630,6760]],
  [[4060,6960],[4860,6960],[4860,7570],[4070,7570],[4060,7270]]
];
export const INTERISLAND_TRAFFIC_ROUTE=[
  ...juniperSouthRoad.slice(3),...frostpineBridgeRoad,
  [7300,COPPER_GRID.south],[COPPER_GRID.west,COPPER_GRID.south],[COPPER_GRID.west,4300],
  [6100,4300],...juniperBridgeRoad.slice().reverse(),...juniperCoastRoad.slice(3,-1).reverse(),[3500,4270]
];
export const routes=[
  roundRoad(juniperPerimeter,true,()=>170),
  ...juniperRoads.map(route=>roundRoad(route)),
  ...COPPER_ROUTES.map(route=>roundRoad(route,false,copperCornerTrim)),
  COPPER_SOUTH_ROAD,
  ...frostpineRoads.map(route=>roundRoad(route)),
  ...COPPER_CONNECTOR_PATHS
];
export const roadWidth = 68;
export const sidewalkWidth = roadWidth+11;
let seed = 7141;
const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export const shore = y => 3080 + Math.sin(y/355)*106 + Math.sin(y/132)*27 - y*.047 + 2010*smooth((y-2250)/1550);
const juniperWestBanks=[
  [0,1600],[65,1050],[150,630],[285,350],[500,220],[850,125],
  [1200,165],[1530,245],[1810,150],[2190,210],[2580,112],[2850,165],
  [3170,265],[3520,220],[3800,135],[4100,193],[4390,350],[4620,650],
  [4790,1090],[4920,1800],[5040,2480],[5130,3290],[5180,3660],[5200,3800]
];
export function juniperShoreRange(y){
  if(y<0||y>SIZE)return null;
  let i=1;
  while(y>juniperWestBanks[i][0])i++;
  const [a,left]=juniperWestBanks[i-1],[b,right]=juniperWestBanks[i];
  const t=(y-a)/(b-a);
  const west=left+(right-left)*(.65*t+.35*smooth(t));
  const east=y<345?1600+(shore(y)-1600)*smooth(y/345)
    :y>4440?3800+(shore(y)-3800)*(1-smooth((y-4440)/(SIZE-4440))):shore(y);
  return [west,east];
}

function isJuniperLand(x,y,margin=10){
  const banks=juniperShoreRange(y);
  return Boolean(banks&&x>=banks[0]+margin&&x<=banks[1]-margin);
}

const squaredDistanceTo = (x,y,a,b) => {
  const dx=b[0]-a[0], dy=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
  return (x-a[0]-dx*t)**2+(y-a[1]-dy*t)**2;
};
const segments=routes.flatMap(route=>route.slice(1).map((point,i)=>[route[i],point]));
const nearRoad = (x,y,radius) => segments.some(([a,b])=>squaredDistanceTo(x,y,a,b)<radius*radius);
export const overlapsSidewalk = (x,y,radius) => nearRoad(x,y,sidewalkWidth/2+radius)||(isDesert(x,y)&&isCopperConnector(x,y,radius,true));
const smooth = value => {
  const t=clamp(value,0,1);
  return t*t*(3-2*t);
};
export const stadiums=[
  {x:2590,y:4550,name:'Metasiberia Stadium'},
  frostpineStadium,
  {x:6900,y:2450,name:'Copper Stadium'}
].map(site=>({...site,w:400,d:stadiumDepth,h:43,kind:'stadium'}));
export const stadium=stadiums[0];
export const lighthouse={x:4710,y:4080,name:'Cape Beacon',kind:'lighthouse',w:22,d:22};

export function stadiumDriveLayout(bounds=stadium){
  const fieldWidth=bounds.w*105/138.14,fieldDepth=bounds.d*68/98;
  const gateWidth=Math.min(bounds.w*10/138.14,bounds.d*10/98);
  const {x,y,w,d}=bounds;
  const boxes=[];
  // Each stand is split down its middle to leave a straight lane from the gate to the pitch.
  for(const side of [-1,1])for(const end of [-1,1]){
    boxes.push(
      {x:x+side*(w+fieldWidth)/4,y:y+end*(d+gateWidth)/4,w:(w-fieldWidth)/2,d:(d-gateWidth)/2},
      {x:x+side*(fieldWidth+gateWidth)/4,y:y+end*(d+fieldDepth)/4,w:(fieldWidth-gateWidth)/2,d:(d-fieldDepth)/2}
    );
  }
  return {bounds,boxes,fieldWidth,fieldDepth,gateWidth};
}

const basicStadiumLayouts=new Map(stadiums.map(site=>[site,stadiumDriveLayout(site)]));

function stadiumDistance(x,y){
  return Math.min(...stadiums.map(site=>Math.max(Math.abs(x-site.x)-site.w/2,Math.abs(y-site.y)-site.d/2)));
}

export function bridgeHeight(x,span){
  return 9*smooth((x-span.west)/175)*smooth((span.east-x)/175);
}

export function copperTerrainHeight(x,y){
  const height=copperDuneHeight(x,y);
  if(height===0)return 0;
  const coast=copperShoreRange(y);
  if(!coast)return 0;
  const edge=Math.min(x-coast[0],coast[1]-x,y-COPPER_SHORE.north,COPPER_SHORE.south-y);
  if(edge<=0)return 0;
  let roadDistance=Infinity;
  for(const [a,b] of segments)roadDistance=Math.min(roadDistance,squaredDistanceTo(x,y,a,b));
  const paved=isCopperStreet(x,y)||isCopperConnector(x,y,5,true)||vehicleHitsBuilding({x,y,angle:0,model:0});
  return paved?0:height*smooth(edge/46)*smooth((Math.sqrt(roadDistance)-45)/63)*smooth((stadiumDistance(x,y)-3)/75);
}

function frostpineMountainHeight(x,y,roadDistance,shoreDistance){
  const {west,east,north,south}=FROSTPINE_MOUNTAIN;
  const edge=Math.min(x-west,east-x,y-north,south-y);
  if(edge<=0)return 0;
  const blend=smooth(edge/260)*smooth(shoreDistance/170)*smooth((roadDistance-85)/240);
  return mountainSample(x,y)*670*blend;
}

export function groundHeight(x,y,showCity=cityBridgeEnabled){
  const span=bridgeAt(x,y,showCity);
  if(span)return bridgeHeight(span.vertical?y:x,span);
  const snow=isSnow(x,y);
  if(isDesert(x,y))return isCopperStreet(x,y)?COPPER_STREET_HEIGHT:copperTerrainHeight(x,y);
  if(!snow&&!isJuniperLand(x,y,42))return 0;
  let square=Infinity;
  for(const [a,b] of segments)square=Math.min(square,squaredDistanceTo(x,y,a,b));
  const distance=Math.sqrt(square);
  const stadiumGrade=smooth((stadiumDistance(x,y)-3)/75);
  if(snow){
    const approachGrade=showCity?smooth((Math.sqrt(squaredDistanceTo(x,y,...CITY_APPROACHES[0]))-40)/82):1;
    const edge=snowHalfWidth(y)-Math.abs(x-5500);
    const hills=10+9*Math.sin(x*.015+y*.011)+6*Math.cos(y*.024-x*.008);
    const townGrade=x<5730?205:68;
    return Math.max(0,hills)*smooth((distance-townGrade)/105)*smooth(edge/130)*stadiumGrade*approachGrade
      +frostpineMountainHeight(x,y,distance,edge);
  }
  const height=12+6*Math.sin(x*.008+y*.004)+5*Math.cos(y*.015-x*.006)
    +3*Math.sin(x*.034+y*.024)+2*Math.cos(x*.057-y*.023);
  const townGrade=x>=300&&x<=2650&&y>=300&&y<=4400?205:63;
  const [west,east]=juniperShoreRange(y);
  const coastGrade=smooth((Math.min(x-west,east-x)-42)/125);
  return Math.max(0,height)*smooth((distance-townGrade)/113)*coastGrade*stadiumGrade;
}
export const CAR_AXLES=[-10,9.7];

export function carGroundPose({x,y,angle,model=0}){
  const length=CARS[model].length??1;
  const dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
  const [rear,front]=CAR_AXLES.map(axle=>groundHeight(x+axle*dx,y+axle*dy));
  return {height:(front+rear)/2,slope:Math.atan2(front-rear,(CAR_AXLES[1]-CAR_AXLES[0])*length)};
}

// Driving speed is stored in world units per second.
const metersPerWorldUnit=KMH_PER_SPEED_UNIT/3.6;
const jumpGravity=9.8/metersPerWorldUnit;
const minimumJumpSpeed=16/metersPerWorldUnit;
const maxLaunchSpeed=2.5/metersPerWorldUnit;

export function updateCarJump(car,previous,dt){
  if(dt<=0)return;
  // A critically damped suspension returns to ride height without a second bounce.
  const compression=car.landingCompression??0;
  const springRate=17;
  const springVelocity=(car.landingVelocity??0)+springRate*compression;
  const damping=Math.exp(-springRate*dt);
  car.landingCompression=(compression+springVelocity*dt)*damping;
  car.landingVelocity=(springVelocity-springRate*(compression+springVelocity*dt))*damping;
  const airborne=car.lift>0;
  if(!airborne&&Math.abs(car.speed)<minimumJumpSpeed){
    car.verticalSpeed=0;
    return;
  }
  const ground=carGroundPose(car);
  const before=carGroundPose(previous);
  const groundDelta=ground.height-before.height;
  const roadVelocity=groundDelta/dt;
  const previousVelocity=car.verticalSpeed??roadVelocity;
  const velocity=airborne?previousVelocity:Math.min(previousVelocity,maxLaunchSpeed);
  const lift=(car.lift??0)+velocity*dt-jumpGravity*dt*dt/2-groundDelta;
  // Suspension follows shallow dips. Once airborne, gravity alone drives the arc.
  const clearedSuspension=velocity-roadVelocity>jumpGravity*dt/2+.55/metersPerWorldUnit;
  if(lift>0&&(airborne||clearedSuspension)){
    car.lift=lift;
    car.verticalSpeed=velocity-jumpGravity*dt;
    if(airborne){
      const flightPitch=clamp(Math.atan2(car.verticalSpeed,Math.abs(car.speed))-.025,-.22,.15);
      const angle=car.airPitch??before.slope;
      car.airPitch=angle+(flightPitch-angle)*(1-Math.exp(-dt*3.2));
    }else{
      car.airPitch=clamp(before.slope+(car.pitch??0),-.26,.26);
    }
    return;
  }
  if(airborne){
    const impact=Math.max(0,roadVelocity-(velocity-jumpGravity*dt));
    car.landingVelocity=Math.min(32,impact*.62);
  }
  car.verticalSpeed=roadVelocity;
  car.lift=0;
  car.airPitch=0;
}

const landmarks = [
  {x:1570,y:1350,name:'JUNIPER',kind:'town'},
  {x:2400,y:1090,name:'THE BLUFFS'},
  {x:2460,y:2580,name:'SOUTH BEACH'},
  {x:1110,y:2210,name:'MARINA'},
  {x:750,y:3800,name:'Pine Hollow',kind:'forest'},
  ...stadiums,
  lighthouse,
  {x:5450,y:4300,name:'Strait Bridge',kind:'desert'},
  {x:5170,y:7110,name:'Frostpine Village',kind:'snow'},
  {x:6260,y:7600,name:'Glacier Ridge',kind:'snow'},
];
const buildingCandidates=[];
// Model variants and their target heights for roadside lots.
const newYorkBuildings=[
  ['b1_0',85],['b2_1',92],['b3_2',82],
  ['b4_3',105],['b5_4',132],['b6_5',125],
  ['g1_8',290],['g2_9',300],['g3_10',340],
  ['g4_11',300],['g5_12',285],['g6_13',310],
  ['emp_state._final_14',360],['metlife_15',255],
  ['tower_one_16',410],['christler_17',345],
  ['woolworth_18',315],['new_york_times_19',330],
  ['flatiron_20',155]
];
// Keep the buildings along straight sections, leaving open space around curved junctions.
const juniperFrontages=[
  ...juniperCrossStreets.flatMap(street=>street.slice(1).flatMap((end,i)=>{
    const start=street[i];
    return start[1]===end[1]?[[start,end]]:[];
  })),
  [[westStreet,northStreet],[eastStreet,northStreet]],
  [[westStreet,southStreet],[eastStreet,southStreet]],
  [[westAvenue,northStreet],[westAvenue,3040]],
  [[mainAvenue,northStreet],[mainAvenue,southStreet]],
  [[eastStreet,1030],[eastStreet,3450]]
];
function addRoadsideLots(frontages,snow=false){
  const lots=[];
  for(const [streetIndex,[[ax,ay],[bx,by]]] of frontages.entries()){
    const length=Math.hypot(bx-ax,by-ay),horizontal=ay===by;
    const spacing=streetIndex%2?156:185;
    for(let along=130;along<length-110;along+=spacing){
      const curbX=ax+(bx-ax)*along/length,curbY=ay+(by-ay)*along/length;
      for(const side of [-1,1]){
        const index=streetIndex*7+Math.floor(along/spacing)+(side+1)/2;
        if(index%7===0)continue;
        const [variant,height]=newYorkBuildings[index%newYorkBuildings.length];
        const downtown=snow?curbX>4100&&curbX<5100:curbX>1200&&curbY>1400&&curbY<3050;
        const tower=downtown&&index%5===0;
        const size=tower?138:90+index%4*8,offset=53+size/2;
        const x=curbX+(horizontal?0:side*offset),y=curbY+(horizontal?side*offset:0);
        const angle=horizontal?(side===1?Math.PI:0):-side*Math.PI/2;
        const lot={x,y,w:size,d:size,h:tower?260:Math.min(height,index%3===0?195:150),
          angle,snow,style:'brick',importedTower:true,model:tower?'building03':'newYork',
          variant:tower?undefined:variant,frontage:{curbX,curbY,horizontal}};
        if(lots.some(other=>Math.abs(x-other.x)<(size+other.w)/2+13&&Math.abs(y-other.y)<(size+other.d)/2+13))continue;
        lots.push(lot);
      }
    }
  }
  buildingCandidates.push(...lots);
}
addRoadsideLots(juniperFrontages);
addRoadsideLots([
  [[4060,6960],[5540,6960]],[[3440,7270],[4220,7270]],
  [[4420,7360],[5650,7360]],[[4070,7570],[5650,7570]],
  [[4060,6770],[4060,7270]],[[4860,6760],[4860,7570]]
],true);

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
function buildingClearsRoads(lot){
  return !segments.some(([a,b])=>roadCrossesLot(a,b,lot,roadWidth/2+8))
    &&!bridgeSegments.some(({points:[a,b],width})=>roadCrossesLot(a,b,lot,width/2))
    &&stadiums.every(site=>lot===site||Math.abs(lot.x-site.x)>=(lot.w+site.w)/2+12||Math.abs(lot.y-site.y)>=(lot.d+site.d)/2+12);
}
export const buildings=buildingCandidates.filter(lot=>!isDesert(lot.x,lot.y)&&buildingClearsRoads(lot));

const copperAvenueSegments=COPPER_AVENUES.flatMap(route=>
  route.slice(1).map((point,i)=>[route[i],point])
);
const respawnSegments=[
  ...segments,...copperAvenueSegments,
  ...bridgeSegments.map(({points})=>points)
];

export function nearestRoadSpawn(car,showCity=cityBridgeEnabled){
  let best=START;
  let bestDistance=Infinity;
  const city=showCity&&(isCityLand(car.x,car.y)||isCityBridge(car.x,car.y));
  const bridgeLine=[[CITY_BRIDGE.west,CITY_BRIDGE.y],[CITY_BRIDGE.east,CITY_BRIDGE.y]];
  const candidates=city?[...CITY_STREETS,...CITY_APPROACHES.slice(1),bridgeLine]:
    showCity?[...respawnSegments,CITY_APPROACHES[0],bridgeLine]:respawnSegments;
  for(const [[ax,ay],[bx,by]] of candidates){
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

export function isCityApproach(x,y,radius=37){
  return CITY_APPROACHES.some(([a,b])=>squaredDistanceTo(x,y,a,b)<radius**2);
}
export function isRoad(x,y,showCity=cityBridgeEnabled){
  if(bridgeAt(x,y,showCity)||isCopperStreet(x,y)||isDesert(x,y)&&isCopperConnector(x,y,3))return true;
  if(showCity&&isCityApproach(x,y))return true;
  if(isCityLand(x,y))return CITY_STREETS.some(([a,b])=>squaredDistanceTo(x,y,a,b)<48**2);
  return nearRoad(x,y,roadWidth/2+3)||isDesert(x,y)&&
    copperAvenueSegments.some(([a,b])=>squaredDistanceTo(x,y,a,b)<18**2);
}
const streetlights=Array.from({length:8},(_,i)=>1610+i*100)
  .flatMap(y=>[1731,1809].map(x=>({x,y,streetlight:true})))
  .filter(({x,y})=>!nearRoad(x,y,roadWidth/2+3));
// Pedestrian fixtures use the same pole at a shorter height.
streetlights.push(...[[1820,1940],[1720,1884],[1820,1787],[1820,2088],[1720,2071]]
  .filter(([x,y])=>!overlapsSidewalk(x,y,1))
  .map(([x,y])=>({x,y,streetlight:true,footpathLamp:true})));
const obstacles=[...buildings,lighthouse,...stadiums];
let activeBuildingFootprints=new Map();

export function setBuildingFootprints(footprints){
  activeBuildingFootprints=footprints;
}

export function basicTowerLot(lot){
  return {...lot,w:62,d:66,h:90};
}

export function vehicleHitsBuilding({x,y,angle,model=0}){
  const {length=1,width=1}=CARS[model];
  const halfLength=17.85*length,halfWidth=8.05*width;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const c=Math.abs(cos),s=Math.abs(sin);
  const reachX=halfLength*c+halfWidth*s;
  const reachY=halfLength*s+halfWidth*c;
  const hits=b=>{
    const dx=b.x-x,dy=b.y-y,w=b.w/2,d=b.d/2;
    return Math.abs(dx)<w+reachX&&Math.abs(dy)<d+reachY
      &&Math.abs(dx*cos+dy*sin)<halfLength+w*c+d*s
      &&Math.abs(dy*cos-dx*sin)<halfWidth+w*s+d*c;
  };
  if(hitsCopperBuilding(x,y,angle,halfLength,halfWidth))return true;
  return hitsCityBuilding(x,y,reachX,reachY,hits)||obstacles.some(b=>{
    if(activeBuildingFootprints.has(b)){
      const footprint=activeBuildingFootprints.get(b);
      return footprint!==null&&hits(footprint.bounds)&&footprint.boxes.some(hits);
    }
    const stadiumLayout=basicStadiumLayouts.get(b);
    if(stadiumLayout)return hits(b)&&stadiumLayout.boxes.some(hits);
    return !b.fullOnly&&hits(b.importedTower?basicTowerLot(b):b);
  });
}

const treeCandidate=(forest=false)=>({
  x:forest?180+random()*1340:random()*SIZE,
  y:forest?3100+random()*1560:random()*SIZE,
  r:6+random()*(forest?17:12),shade:random(),type:random()
});
const trees=[
  ...Array.from({length:3200},()=>treeCandidate()),
  ...Array.from({length:430},()=>treeCandidate(true))
].filter(({x,y,r})=>isJuniperLand(x,y,72) && stadiumDistance(x,y)>16 && !bridgeAt(x,y) && !overlapsSidewalk(x,y,Math.max(9.5,r+2))
  && !obstacles.some(b=>Math.abs(x-b.x)<b.w/2+17 && Math.abs(y-b.y)<b.d/2+17));
for(let i=0;i<680;i++){
  const y=5660+random()*2790,x=2600+random()*5800;
  if(!isSnow(x,y)||groundHeight(x,y)>165||stadiumDistance(x,y)<16||nearRoad(x,y,55)||bridgeAt(x,y)||buildings.some(b=>Math.abs(x-b.x)<43&&Math.abs(y-b.y)<39))continue;
  const r=7+random()*15,shade=random();
  if(!overlapsSidewalk(x,y,r+2))trees.push({x,y,r,shade,type:0,snow:true});
}
// Dense, seeded groves in open parts of Juniper Island.
let forestSeed=84261;
const forestRandom=()=>((forestSeed=(Math.imul(forestSeed,1664525)+1013904223)>>>0)/4294967296);
for(const [cx,cy,rx,ry,pine] of [
  [760,1040,260,225,false],[910,3300,360,300,true],
  [1180,4600,365,265,true],[2630,1990,260,300,false]
]){
  for(let dx=-rx;dx<=rx;dx+=23){
    for(let dy=-ry;dy<=ry;dy+=23){
      const x=cx+dx+(forestRandom()-.5)*15;
      const y=cy+dy+(forestRandom()-.5)*15;
      const edge=((x-cx)/rx)**2+((y-cy)/ry)**2;
      if(edge>1||forestRandom()<edge*.20)continue;
      const r=8+forestRandom()*10;
      if(!isJuniperLand(x,y,85)||stadiumDistance(x,y)<=16||bridgeAt(x,y)||
        overlapsSidewalk(x,y,r+3)||obstacles.some(b=>Math.abs(x-b.x)<b.w/2+r+6&&Math.abs(y-b.y)<b.d/2+r+6)||
        trees.some(t=>Math.abs(t.x-x)<10&&Math.abs(t.y-y)<10))continue;
      const type=pine?forestRandom()*.39:.17+forestRandom()*.31;
      trees.push({x,y,r,shade:forestRandom(),type,forest:true});
    }
  }
}
export const isPalm=tree=>Boolean(tree.streetPalm)||tree.x>shore(tree.y)-565&&tree.type>.49;
export const sceneryRadius=item=>item.streetlight?.35:isPalm(item)?.82:item.r*.09;

for(const [x,y,height,phase] of [
  [1723,1640,23,.2],[1817,1713,29,2.3],[1723,1786,27,4.6],[1817,1859,23,6.9],
  [1723,1932,29,9.2],[1819,1971,28,11.5],[1723,2062,25,13.8],
  [1817,2151,29,16.1],[1723,2224,24,18.4],[1817,2297,28,20.7]
]){
  if(!overlapsSidewalk(x,y,5))trees.push({x,y,height,phase,r:height*.42,shade:.5,type:1,streetPalm:true});
}

export const breakableScenery=[...trees,...streetlights];

export function fallenSceneryPose(item,impact){
  const progress=clamp(impact.age/.85,0,1);
  const slide=1-(1-progress)**3;
  return {
    x:item.x+Math.cos(impact.angle)*impact.slide*slide,
    y:item.y+Math.sin(impact.angle)*impact.slide*slide,
    tilt:Math.min(Math.PI*.49,progress*progress*2.1)
  };
}
function juniperOutline(c,inset=0){
  c.beginPath();
  for(let y=0;y<=SIZE;y+=10){
    const [west,east]=juniperShoreRange(y);
    c.lineTo(Math.min(west+inset,(west+east)/2),y);
  }
  for(let y=SIZE;y>=0;y-=10){
    const [west,east]=juniperShoreRange(y);
    c.lineTo(Math.max(east-inset,(west+east)/2),y);
  }
  c.closePath();
}

function drawDesert(c,color){
  const {north,south}=COPPER_SHORE;
  c.beginPath();
  c.moveTo(copperShoreRange(north)[0],north);
  for(let y=north;y<south;y+=18)c.lineTo(copperShoreRange(y)[0],y);
  c.lineTo(copperShoreRange(south)[0],south);
  for(let y=south;y>=north;y-=18)c.lineTo(copperShoreRange(y)[1],y);
  c.lineTo(copperShoreRange(north)[1],north);
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

function drawFrostpineRelief(c){
  const {west,east,north,south}=FROSTPINE_MOUNTAIN;
  const step=48;
  c.save();
  c.fillStyle='#eef6f7';
  for(let y=north;y<south;y+=step)for(let x=west;x<east;x+=step){
    const px=x+step/2,py=y+step/2;
    if(!isSnow(px,py))continue;
    const elevation=groundHeight(px,py,false);
    if(elevation<22)continue;
    c.globalAlpha=Math.min(.65,elevation/900);
    c.fillRect(x,y,step,step);
  }
  c.restore();
}

function drawBridge(c){
  c.fillStyle='#efa96c';
  for(const {west,east,y,width,vertical} of bridges){
    if(vertical)c.fillRect(y-width/2,west,width,east-west);
    else c.fillRect(west,y-width/2,east-west,width);
  }
}

function drawRoads(c){
  c.lineJoin='round';
  c.lineCap='round';
  c.beginPath();
  for(const route of routes) route.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle='#bbccb3';
  c.lineWidth=43;
  c.stroke();
}

export const carMarker={
  body:'M-5 7V-4L-3.4-8H3.4L5-4V7Q5 8 4 8H-4Q-5 8-5 7Z',
  glass:'M-3.5-3.4L-2.5-5.3H2.5L3.5-3.4Z M-3.5 4H3.5V5.3H-3.5Z'
};
let markerPaths;

export function drawMinimap(c,width,height,car,targets,labels=false,patrols=[],remoteCars=[],showCity=false){
  c.clearRect(0,0,width,height);
  c.save();
  const mapWidth=WORLD_WIDTH;
  const mapHeight=(showCity?WORLD_HEIGHT:ORIGINAL_WORLD_HEIGHT)-WORLD_MIN_Y;
  const scale=Math.min(width/(mapWidth+220),height/(mapHeight+220));
  c.translate((width-mapWidth*scale)/2,(height-mapHeight*scale)/2-WORLD_MIN_Y*scale);
  c.scale(scale,scale);
  c.fillStyle='#284b5b';
  c.fillRect(0,WORLD_MIN_Y,WORLD_WIDTH,mapHeight);
  c.fillStyle='#857e5c';
  juniperOutline(c);c.fill();
  c.fillStyle='#385950';
  juniperOutline(c,32);c.fill();
  drawDesert(c,'#c19c64');
  c.fillStyle='#ad865a';
  for(const {x,y,w,d,angle} of COPPER_BUILDINGS){
    c.save();c.translate(x,y);c.rotate(angle);c.fillRect(-w/2,-d/2,w,d);c.restore();
  }
  c.strokeStyle='#a98250';
  c.lineWidth=8;
  for(const [x,y,rx,ry,,lean] of COPPER_DUNES){
    if(copperTerrainHeight(x,y)<6)continue;
    c.beginPath();c.ellipse(x,y,rx*.62,ry*.65,lean,-1.25,1.3);c.stroke();
  }
  drawSnow(c,'#77929a');
  drawFrostpineRelief(c);
  if(showCity){
    c.fillStyle='#d9ba80';
    c.beginPath();
    cityShoreline().forEach(([x,y],index)=>index?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();
    c.fill();
    c.fillStyle='#626c67';
    for(const {x,y} of CITY_DISTRICTS){
      c.fillRect(x-CITY_HALF_SIZE,y-CITY_HALF_SIZE,CITY_HALF_SIZE*2,CITY_HALF_SIZE*2);
    }
    c.fillRect(CITY.x-945,CITY.y-215,410,430);
    c.strokeStyle='#a7b5ab';
    c.lineWidth=65;
    for(const [[ax,ay],[bx,by]] of [...CITY_STREETS,...CITY_APPROACHES]){
      c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();
    }
    c.fillStyle='#efa96c';
    c.fillRect(CITY_BRIDGE.west,CITY_BRIDGE.y-CITY_BRIDGE.width/2,CITY_BRIDGE.east-CITY_BRIDGE.west,CITY_BRIDGE.width);
  }
  drawRoads(c);
  c.strokeStyle='#bbccb3';
  c.lineWidth=36;
  for(const avenue of COPPER_AVENUES){
    c.beginPath();
    avenue.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.stroke();
  }
  drawBridge(c);
  if(labels){
    const [x,y]=COPPER_JUNCTION;
    c.fillStyle='#fff2d7';
    c.beginPath();c.arc(x,y,4/scale,0,Math.PI*2);c.fill();
    c.font=`600 ${13/scale}px system-ui`;
    c.textAlign='center';
    c.textBaseline='top';
    c.strokeStyle='#30352f';
    c.lineWidth=3/scale;
    c.strokeText('Copper Junction',x,y+7/scale);
    c.fillText('Copper Junction',x,y+7/scale);
  }
  c.fillStyle='#acb5aa';
  for(const site of stadiums){
    c.beginPath();
    c.roundRect(site.x-site.w/2,site.y-site.d/2,site.w,site.d,22);
    c.fill();
  }
  if(labels){
    c.font=`700 ${20/scale}px system-ui`;
    c.textAlign='center';
    c.textBaseline='middle';
    c.fillStyle='#fff2d7';
    for(const [name,x,y] of [[ISLAND_NAMES.coast,1500,330],[ISLAND_NAMES.desert,DESERT_CENTER,410],[ISLAND_NAMES.snow,5620,6280]]){
      c.fillText(name,x,y);
    }
    if(showCity)c.fillText(ISLAND_NAMES.city,CITY.x+545,CITY.y-1570);
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
  for(const remote of remoteCars){
    if(!showCity&&(isCityLand(remote.x,remote.y)||isCityBridge(remote.x,remote.y)))continue;
    c.fillStyle=remote.police?'#ff746e':'#77dcea';
    c.beginPath();c.arc(remote.x,remote.y,(labels?7:4)/scale,0,Math.PI*2);c.fill();
    if(labels){
      c.fillStyle=remote.police?'#ffd9d6':'#e0faff';
      c.font=`700 ${14/scale}px system-ui`;
      c.textAlign='center';
      c.textBaseline='bottom';
      c.fillText(remote.name,remote.x,remote.y-10/scale);
    }
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

export function drive(car,keys,dt,speedLimit=CAR_TOP_SPEED,brokenScenery){
  const road=isRoad(car.x,car.y);
  const reversePedal=keys.has('brakeReverse');
  const pedalBraking=reversePedal&&car.speed>0;
  const throttle=reversePedal?(pedalBraking?0:-1):Number(keys.has('up'))-Number(keys.has('down'));
  const steering=Number(keys.has('right'))-Number(keys.has('left'));
  const braking=keys.has('brake')||pedalBraking;
  const airborne=car.lift>0;
  if(airborne){
    car.speed*=Math.exp(-.10*dt);
  }else{
    if(pedalBraking)car.speed=Math.max(0,car.speed-135*dt);
    car.speed+=throttle*119*dt;
    car.speed*=Math.exp(-(braking?4.3:throttle?.44:.49)*dt);
  }
  car.speed=clamp(car.speed,-62,speedLimit);
  if(!throttle&&Math.abs(car.speed)<.8)car.speed=0;
  const speed=Math.abs(car.speed);
  const desiredSteer=steering*.37/(1+speed/290);
  car.steer=(car.steer??0)+(desiredSteer-(car.steer??0))*(1-Math.exp(-dt*10));
  const turnRate=Math.tan(car.steer)*car.speed/19.7;
  const previousAngle=car.angle;
  const turningGrip=airborne?.08:braking?1.18:1;
  car.angle+=clamp(turnRate,-1.65,1.65)*turningGrip*dt;
  const x=car.x+Math.cos(car.angle)*car.speed*dt;
  const y=car.y+Math.sin(car.angle)*car.speed*dt;
  const span=bridgeAt(car.x,car.y);
  const along=span?.vertical?y:x,across=span?.vertical?x:y;
  const railHit=span&&along>span.west+8&&along<span.east-8&&Math.abs(across-span.y)>span.width/2-7;
  car.boundaryHit=!railHit&&(x<35||x>WORLD_WIDTH-35||(y<35&&!isDesert(x,y))||y<WORLD_MIN_Y+35||y>WORLD_HEIGHT-35
    ||(!isLand(x,y)&&!bridgeAt(x,y)));
  if(car.boundaryHit)return road;
  const blocked=vehicleHitsBuilding({x,y,angle:car.angle,model:car.model});
  if(blocked||railHit){
    if(blocked&&vehicleHitsBuilding(car))car.angle=previousAngle;
    car.speed*=-.3;
    return road;
  }
  const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
  const {length=1,width=1}=CARS[car.model??0];
  const halfLength=15.9*length,halfWidth=6.9*width;
  const reach=Math.hypot(halfLength,halfWidth)+2.5;
  for(const item of breakableScenery){
    const dx=item.x-x,dy=item.y-y;
    if(Math.abs(dx)>reach||Math.abs(dy)>reach||brokenScenery?.has(item))continue;
    if(cityBridgeEnabled&&isCityApproach(item.x,item.y,46))continue;
    const along=Math.max(0,Math.abs(dx*cos+dy*sin)-halfLength);
    const lateral=dy*cos-dx*sin;
    const across=Math.max(0,Math.abs(lateral)-halfWidth);
    const radius=sceneryRadius(item);
    if(along*along+across*across>=radius*radius)continue;
    if(!brokenScenery||speed<4){
      car.speed*=-.3;
      return road;
    }
    const side=lateral<0?-1:1;
    brokenScenery.set(item,{
      angle:car.angle+side*Math.PI*.39+(car.speed<0?side*Math.PI*.22:0),
      slide:12+Math.min(speed*.15,19),
      age:0
    });
    car.speed*=.72;
  }
  car.x=x;
  car.y=y;
  return road;
}
