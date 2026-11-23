import {isLand,isRoad,routeWaypoints,vehicleHitsBuilding} from './world.js';
import {roundRoad} from './road-curves.js';
import {separation} from './pursuit.js';

const paths=[
  [...routeWaypoints[1].slice(1,12),[1770,1550]],
  [[1770,2390],[1770,2820],[1770,3490],...routeWaypoints[7].slice(1,4),
    ...routeWaypoints[8].slice(0,-1).reverse(),[2540,2390],[1770,2390]],
  routeWaypoints[10].slice(2),
  [[6800,3620],[7350,3620],[7990,3620],[7990,3050],[7350,3050],[6800,3050],[6800,3620]],
  [...routeWaypoints[18].slice(2,9),...routeWaypoints[19].slice(0,-1).reverse()],
  [[5050,7000],[5050,7420],...routeWaypoints[21].slice(3),[6220,6710],[5650,6880],[5050,7000]],
  [[3800,4770],[3800,5050],[3800,6060],[3800,6410],[4060,6760],[4430,6970],
    [5050,7000],[5650,6880],[6220,6710],[6810,6670],[7300,6390],[7300,6060],
    [7300,4980],[7300,4750],[7350,4540],[7530,4240],[6800,4140],[6560,4300],
    [6100,4300],[4780,4300],[4640,4300],[4570,4220],[4530,4090],[4250,3970],
    [3880,4010],[3500,4270],[3650,4540],[3800,4770]]
];

function makeLoop(points){
  let total=0;
  const segments=points.slice(1).map(([x,y],i)=>{
    const [ax,ay]=points[i];
    const length=Math.hypot(x-ax,y-ay);
    const segment={x:ax,y:ay,dx:x-ax,dy:y-ay,length,start:total};
    total+=length;
    return segment;
  });
  return {segments,total};
}

function center(loop,s){
  const wrapped=((s%loop.total)+loop.total)%loop.total;
  const segment=loop.segments.find(part=>wrapped<part.start+part.length);
  const t=(wrapped-segment.start)/segment.length;
  return {x:segment.x+segment.dx*t,y:segment.y+segment.dy*t};
}

function lanePose(loop,position,direction,laneOffset=16){
  const point=center(loop,position);
  const before=center(loop,position-24*direction),after=center(loop,position+24*direction);
  const angle=Math.atan2(after.y-before.y,after.x-before.x);
  return {x:point.x-Math.sin(angle)*laneOffset,y:point.y+Math.cos(angle)*laneOffset,angle};
}

export function createTraffic(){
  const cars=[];
  for(const [routeIndex,path] of paths.entries()){
    const loop=makeLoop(roundRoad(path,true));
    const count=[6,3,5,4,4,3,5][routeIndex];
    for(let i=0;i<count;i++){
      const direction=i%2===0?1:-1;
      const progress=loop.total*(i+.32)/count;
      const pose=lanePose(loop,progress,direction);
      if(cars.some(other=>near(other,pose,45)&&separation(pose,other).distance<8))continue;
      const police=i===0&&[0,2,4].includes(routeIndex);
      cars.push({...pose,loop,progress,direction,police,laneOffset:16,speed:0,cruise:70+(routeIndex*11+i*17)%47,
        shiftX:0,shiftY:0,pushX:0,pushY:0,accelerationDelay:0,stallTime:0,backoff:0,nextBackoff:1.4,model:police?0:(routeIndex*2+i+1)%5,traffic:true,wheelSpin:0,braking:false});
    }
  }
  return cars;
}

function near(a,b,range){
  return Math.abs(a.x-b.x)<range&&Math.abs(a.y-b.y)<range;
}

export function trafficContact(a,b){
  return near(a,b,45)&&separation(a,b).distance<0;
}

function validPush(pose){
  return (isLand(pose.x,pose.y)||isRoad(pose.x,pose.y))&&
    !vehicleHitsBuilding(pose);
}

function pushTraffic(car,player,normal,dx,dy,cars){
  if(!car.traffic)return;
  const travel=Math.hypot(dx,dy);
  const approach=-(dx*normal.x+dy*normal.y);
  if(travel<.001||approach<=0)return;
  car.accelerationDelay=2;
  const strength=Math.abs(player.speed)*(approach/travel);
  const tangentX=(dx+normal.x*approach)/travel;
  const tangentY=(dy+normal.y*approach)/travel;
  const distance=Math.min(8,-normal.distance+.4+strength*.02);
  const x=-normal.x*distance+tangentX*strength*.017;
  const y=-normal.y*distance+tangentY*strength*.017;
  const pose={x:car.x+x,y:car.y+y,angle:car.angle,model:car.model};
  if(!validPush(pose)||cars.some(other=>other!==car&&trafficContact(pose,other)))return;
  car.x=pose.x;
  car.y=pose.y;
  car.shiftX+=x;
  car.shiftY+=y;
  const impulse=Math.min(95,strength*.57);
  car.pushX=(-normal.x+tangentX*.46)*impulse;
  car.pushY=(-normal.y+tangentY*.46)*impulse;
}

export function slidePastTraffic(player,previous,cars){
  for(const other of cars){
    if(!trafficContact(player,other))continue;
    const before=separation(previous,other);
    const after=separation(player,other);
    if(before.distance<0&&after.distance>before.distance)continue;
    const dx=player.x-previous.x,dy=player.y-previous.y;
    const inward=Math.min(0,dx*after.x+dy*after.y);
    if(inward<0){
      pushTraffic(other,player,after,dx,dy,cars);
      if(!cars.some(car=>trafficContact(player,car))){
        player.speed*=.77;
        return other;
      }
    }
    const slide={x:previous.x+dx-inward*after.x,y:previous.y+dy-inward*after.y,angle:player.angle,model:player.model};
    const moved=Math.hypot(dx,dy);
    const sliding=Math.hypot(slide.x-previous.x,slide.y-previous.y);
    if(sliding>.02&&validPush(slide)&&!cars.some(car=>trafficContact(slide,car))){
      Object.assign(player,slide,{speed:player.speed*Math.min(.94,sliding/moved)});
    }else{
      player.x=previous.x;
      player.y=previous.y;
      if(cars.some(car=>trafficContact(player,car)))player.angle=previous.angle;
      player.speed*=-.25;
    }
    return inward<0?other:null;
  }
}

function clearDistance(car,actors,laneOffset,range){
  for(let travel=3;travel<=range;travel+=5){
    // Test the space the car will actually occupy, including the gradual lane shift.
    const offset=car.laneOffset+(laneOffset-car.laneOffset)*Math.min(1,travel/20);
    const pose=lanePose(car.loop,car.progress+car.direction*travel,car.direction,offset);
    for(const other of actors){
      if(other===car||!near(pose,other,42))continue;
      const gap=separation(pose,other).distance;
      if(gap<.25&&gap<=separation(car,other).distance)return travel-3;
    }
  }
  return range;
}

function clearRecoveryPose(car,pose,actors){
  return validPush(pose)&&actors.every(other=>other===car||!trafficContact(pose,other));
}

function rejoinRoute(car,player,actors){
  const minimumDistance=440;
  for(let distance=130;distance<car.loop.total*.75;distance+=65){
    const progress=car.progress+car.direction*distance;
    for(const laneOffset of [16,23,10]){
      const pose={...lanePose(car.loop,progress,car.direction,laneOffset),model:car.model};
      if(near(pose,player,minimumDistance)||!isRoad(pose.x,pose.y))continue;
      if(!clearRecoveryPose(car,pose,actors))continue;
      Object.assign(car,pose,{progress,laneOffset,speed:0,shiftX:0,shiftY:0,pushX:0,pushY:0,
        stallTime:0,backoff:0,nextBackoff:1.4,braking:false});
      return true;
    }
  }
  return false;
}

function backAway(car,actors,dt){
  car.backoff=Math.max(0,car.backoff-dt);
  const distance=20*dt;
  const progress=car.progress-car.direction*distance;
  const lane=lanePose(car.loop,progress,car.direction,car.laneOffset);
  const pose={...lane,x:lane.x+car.shiftX,y:lane.y+car.shiftY,model:car.model};
  if(!clearRecoveryPose(car,pose,actors)){car.backoff=0;return false;}
  Object.assign(car,pose,{progress,speed:0,braking:false});
  car.wheelSpin=(car.wheelSpin+distance/2.75)%(Math.PI*2);
  return true;
}

export function updateTraffic(cars,player,patrols,dt){
  if(dt<=0)return;
  const actors=[player,...patrols,...cars];
  for(const [index,car] of cars.entries()){
    const oldSpeed=car.speed;
    const oldProgress=car.progress;
    const recovering=car.accelerationDelay>0;
    car.accelerationDelay=Math.max(0,car.accelerationDelay-dt);
    if(!recovering&&car.stallTime>=4.5+(index%5)*.22&&rejoinRoute(car,player,actors))continue;
    if(!recovering&&car.stallTime>=car.nextBackoff){
      car.backoff=.85;
      car.nextBackoff=car.stallTime+1.75;
    }
    if(!recovering&&car.backoff>0&&backAway(car,actors,dt)){
      car.stallTime+=dt;
      continue;
    }
    const look=lanePose(car.loop,car.progress+car.direction*44,car.direction,car.laneOffset);
    const turn=Math.abs(Math.atan2(Math.sin(look.angle-car.angle),Math.cos(look.angle-car.angle)));
    const cruise=car.cruise*(1-Math.min(.48,turn*.46));
    const range=16+car.speed**2/330;
    let lane=16;
    let clearance=clearDistance(car,actors,lane,range);
    if(clearance<range){
      for(const option of [car.laneOffset,23,10]){
        const space=clearDistance(car,actors,option,range);
        if(space>clearance+.1){lane=option;clearance=space;}
      }
    }
    const target=Math.min(cruise,Math.sqrt(2*135*Math.max(0,clearance-2)),
      recovering?Math.max(0,oldSpeed-15*dt):Infinity);
    car.speed+=Math.max(-165*dt,Math.min(48*dt,target-car.speed));
    const progress=car.progress+car.direction*car.speed*dt;
    const laneOffset=car.laneOffset+Math.max(-14*dt,Math.min(14*dt,lane-car.laneOffset));
    const next=lanePose(car.loop,progress,car.direction,laneOffset);
    const drift=Math.hypot(car.pushX,car.pushY);
    const settle=drift>3?1:Math.max(0,1-dt*1.6);
    const shiftX=car.shiftX*settle+car.pushX*dt,shiftY=car.shiftY*settle+car.pushY*dt;
    const friction=Math.exp(-dt*6.5);
    car.pushX*=friction;
    car.pushY*=friction;
    const shifted={...next,x:next.x+shiftX,y:next.y+shiftY,model:car.model};
    const offset=Math.hypot(shiftX,shiftY)>.05;
    const blocked=!validPush(shifted)||(!offset&&!isRoad(shifted.x,shifted.y))||actors.some(other=>{
      if(other===car||!trafficContact(shifted,other))return false;
      return separation(shifted,other).distance<=separation(car,other).distance;
    });
    if(blocked)car.speed=0;
    else{
      Object.assign(car,shifted,{progress,laneOffset,shiftX:offset?shiftX:0,shiftY:offset?shiftY:0});
      car.wheelSpin=(car.wheelSpin-car.speed*dt/2.75)%(Math.PI*2);
    }
    car.braking=car.speed<oldSpeed-.2||target<cruise-1;
    if(!recovering){
      if(Math.abs(car.progress-oldProgress)<dt*8)car.stallTime+=dt;
      else car.stallTime=Math.max(0,car.stallTime-dt*2);
      if(car.stallTime===0)car.nextBackoff=1.4;
    }
  }
}
