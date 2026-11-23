import {CAR_TOP_SPEED,KMH_PER_SPEED_UNIT,drive,nearestRoadSpawn} from './world.js';

const throttle=new Set(['up']);
export const BUST_SECONDS=5;
export const HOME_DELAY=4000;
export const POLICE_PAINT=['#243044','#34465d','#c4d2db','#34465d','#222d3e'];

const patrolLimits=[168,176,184,192];
const waveInterval=10000;
const speedStep=2/KMH_PER_SPEED_UNIT;
const maximumPatrolSpeed=CAR_TOP_SPEED-speedStep;

export function patrolSpeedLimit(index,wave){
  const base=patrolLimits[index%patrolLimits.length];
  return Math.min(maximumPatrolSpeed,base+wave*speedStep);
}

function placePatrol(player,index,distance,occupied){
  const behind=player.angle+Math.PI+(index-1.5)*.39;
  for(let attempt=0;attempt<24+occupied.length;attempt++){
    const offset=behind+attempt*.73;
    const range=distance+attempt*45;
    const x=player.x+Math.cos(offset)*range;
    const y=player.y+Math.sin(offset)*range;
    const spawn=nearestRoadSpawn({x,y,angle:player.angle});
    if(separation(spawn,player).distance<45)continue;
    if(occupied.some(other=>separation(spawn,other).distance<8))continue;
    return {...spawn,speed:0,steer:0,wheelSpin:0,stalled:0,braking:false,closeEncounter:false,police:true};
  }
  return null;
}

export function createPursuit(player,now=null,cruiser=null,traffic=[]){
  const patrols=cruiser?[{x:cruiser.x,y:cruiser.y,angle:cruiser.angle,speed:cruiser.speed,
    wheelSpin:cruiser.wheelSpin,steer:0,stalled:0,braking:cruiser.braking,closeEncounter:true,police:true}]:[];
  for(let i=patrols.length;i<patrolLimits.length;i++){
    const patrol=placePatrol(player,i,100+i*64,[...patrols,...traffic]);
    if(patrol)patrols.push(patrol);
  }
  return {patrols,contact:0,bustedAt:null,startedAt:now,survived:0,escaped:0};
}

export function separation(patrol,player){
  const a=Math.cos(player.angle),b=Math.sin(player.angle);
  const c=Math.cos(patrol.angle),d=Math.sin(patrol.angle);
  const dx=patrol.x-player.x,dy=patrol.y-player.y;
  let closest={distance:-Infinity,x:0,y:0};
  for(const [x,y] of [[a,b],[-b,a],[c,d],[-d,c]]){
    const projection=dx*x+dy*y;
    const extent=(fx,fy)=>17.55*Math.abs(x*fx+y*fy)+7.65*Math.abs(y*fx-x*fy);
    const distance=Math.abs(projection)-extent(a,b)-extent(c,d);
    if(distance>closest.distance){
      const sign=projection<0?-1:1;
      closest={distance,x:x*sign,y:y*sign};
    }
  }
  return closest;
}

export function recordPursuit(record,run){
  const {survived,escaped}=run;
  if(survived<=0)return record;
  if(record&&(record.survived>survived||(record.survived===survived&&record.escaped>=escaped)))return record;
  return {survived,escaped};
}

export function updatePursuit(run,player,dt,now,brokenScenery){
  run.startedAt??=now;
  const elapsed=Math.max(0,now-run.startedAt);
  run.survived=elapsed/1000;
  const wave=Math.floor(elapsed/waveInterval);
  if(run.patrols.length<patrolLimits.length+wave){
    const index=run.patrols.length;
    const reinforcement=placePatrol(player,index,260+index%4*68,run.patrols);
    if(reinforcement)run.patrols.push(reinforcement);
  }
  for(const [index,patrol] of run.patrols.entries()){
    const previous={x:patrol.x,y:patrol.y,angle:patrol.angle};
    const dx=player.x-patrol.x,dy=player.y-patrol.y;
    const distance=Math.hypot(dx,dy);
    if(!patrol.escaped){
      if(distance<=125)patrol.closeEncounter=true;
      if(patrol.closeEncounter&&distance>=380){
        patrol.escaped=true;
        run.escaped++;
      }
    }
    const desired=Math.atan2(dy,dx);
    const turn=Math.atan2(Math.sin(desired-patrol.angle),Math.cos(desired-patrol.angle));
    patrol.angle+=Math.max(-2.35*dt,Math.min(2.35*dt,turn));
    const limit=patrolSpeedLimit(index,wave);
    const speedLimit=distance<43?Math.min(limit,Math.max(12,Math.abs(player.speed)+8)):limit;
    const {x,y,speed}=patrol;
    drive(patrol,throttle,dt,speedLimit,brokenScenery);
    const gap=separation(patrol,player);
    if(gap.distance<0){
      patrol.x-=gap.distance*gap.x;
      patrol.y-=gap.distance*gap.y;
    }
    const occupied=run.patrols.filter(other=>other!==patrol);
    if(occupied.some(other=>separation(patrol,other).distance<.35)){
      Object.assign(patrol,previous,{speed:0});
    }
    if(dt>0)patrol.braking=Math.abs(patrol.speed)<Math.abs(speed)-.25;
    patrol.wheelSpin=(patrol.wheelSpin-Math.hypot(patrol.x-x,patrol.y-y)/2.75)%(Math.PI*2);
    patrol.stalled=patrol.boundaryHit||(distance>50&&Math.hypot(patrol.x-x,patrol.y-y)<dt*8)
      ?patrol.stalled+dt:0;
    if(patrol.stalled>2||distance>1600){
      const replacement=placePatrol(player,index,220+index%4*68,occupied);
      if(replacement)Object.assign(patrol,replacement);
    }
  }
  if(run.patrols.some(patrol=>separation(patrol,player).distance<1.4)){
    run.contact=Math.min(BUST_SECONDS,run.contact+dt);
    player.speed*=Math.exp(-dt*.42);
  }else run.contact=0;
  if(run.contact>=BUST_SECONDS)run.bustedAt=now;
}
