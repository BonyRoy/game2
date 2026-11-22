import {routes,START,isLand} from './world.js';

export const CHECKPOINT_COUNT=5;
const candidates=routes.flatMap(route=>route.slice(1).flatMap(([x,y],i)=>{
  const [ax,ay]=route[i];
  const dx=x-ax,dy=y-ay;
  const length=Math.hypot(dx,dy);
  const points=[];
  for(let offset=48;offset<=length-48;offset+=96){
    const px=ax+dx*offset/length,py=ay+dy*offset/length;
    if(isLand(px,py)){
      points.push({x:px,y:py,angle:Math.atan2(dy,dx)+Math.PI/2});
    }
  }
  return points;
}));

export function createChase(previous=[],random=Math.random,start=START){
  const points=[];
  let available=candidates.filter(point=>Math.hypot(point.x-start.x,point.y-start.y)>235&&!previous.some(old=>old.x===point.x&&old.y===point.y));
  while(points.length<CHECKPOINT_COUNT){
    const point=available[Math.floor(random()*available.length)];
    points.push({...point,number:points.length+1});
    available=available.filter(other=>Math.hypot(point.x-other.x,point.y-other.y)>=420);
  }
  return restartChase(points);
}

export function restartChase(points){
  return {points,remaining:[...points],startedAt:null,time:0};
}

export function delayChase(run,elapsed){
  if(run.startedAt!==null)run.startedAt+=elapsed;
}

export function updateChase(run,car,now,moving){
  if(run.remaining.length===0)return false;
  if(run.startedAt===null){
    if(!moving)return false;
    run.startedAt=now;
  }
  run.time=(now-run.startedAt)/1000;
  const hit=run.remaining.findIndex(point=>Math.hypot(point.x-car.x,point.y-car.y)<36);
  if(hit<0)return false;
  run.remaining.splice(hit,1);
  return run.remaining.length===0;
}

export function recordChase(record,time){
  return {last:time,best:Math.min(record.best??Infinity,time)};
}


export function checkpointDirections(points,car){
  return points.map(point=>{
    const bearing=Math.atan2(point.y-car.y,point.x-car.x)-car.angle;
    return {number:point.number,angle:Math.atan2(Math.sin(bearing),Math.cos(bearing))};
  });
}
