import {isCityBridge,isCityLand} from '../src/city-island.js';
import {randomInt,randomUUID} from 'node:crypto';
import {CARS} from '../src/cars.js';
import {BUST_SECONDS,separation} from '../src/pursuit.js';
import {ISLAND_STARTS,WORLD_WIDTH,WORLD_HEIGHT,WORLD_MIN_Y,isRoad,isSnow,nearestRoadSpawn,vehicleHitsBuilding} from '../src/world.js';

const expiresAfter=6000;
const maxPlayers=24;
const countdownMs=3000;
const chaseMs=90000;
const nameCharacters='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomPlayerName(players){
  const taken=new Set(Array.from(players,player=>player.name));
  let name;
  do{
    name=Array.from({length:5},()=>nameCharacters[randomInt(nameCharacters.length)]).join('');
  }while(taken.has(name)||!/[A-Z]/.test(name)||!/[0-9]/.test(name));
  return name;
}

function readCar(value){
  if(!value||typeof value!=='object')return null;
  const {x,y,angle,model,wheelSpin,braking,lift=0,airPitch=0}=value;
  if(![x,y,angle,wheelSpin,lift,airPitch].every(Number.isFinite)||x<0||x>WORLD_WIDTH||y<WORLD_MIN_Y||y>WORLD_HEIGHT||
    Math.abs(angle)>Math.PI*2||Math.abs(wheelSpin)>7||!Number.isInteger(model)||model<0||model>=CARS.length||
    lift<0||lift>180||Math.abs(airPitch)>Math.PI/2||typeof braking!=='boolean')return null;
  return {x,y,angle,model,wheelSpin,braking,lift,airPitch};
}

function requiresCityGraphics(x,y){
  return isCityLand(x,y)||isCityBridge(x,y)&&!isSnow(x,y);
}

function openSpawn(anchor,model,occupied){
  const inCity=requiresCityGraphics(anchor.x,anchor.y);
  for(let attempt=0;attempt<=240;attempt++){
    const bearing=anchor.angle+attempt*2.39996;
    const distance=60*Math.sqrt(attempt);
    const road=nearestRoadSpawn({
      x:anchor.x+Math.cos(bearing)*distance,
      y:anchor.y+Math.sin(bearing)*distance,
      angle:anchor.angle
    },inCity);
    for(const lane of [0,19,-19]){
      const x=road.x-Math.sin(road.angle)*lane;
      const y=road.y+Math.cos(road.angle)*lane;
      const pose={x,y,angle:road.angle,model};
      if(requiresCityGraphics(x,y)===inCity&&isRoad(x,y,inCity)&&!vehicleHitsBuilding(pose)&&
        occupied.every(other=>Math.hypot(x-other.x,y-other.y)>=44))return pose;
    }
  }
  return null;
}

function movePlayer(player,car,others){
  const dx=car.x-player.x,dy=car.y-player.y;
  const turn=car.angle-player.angle;
  const rotation=Math.atan2(Math.sin(turn),Math.cos(turn));
  const travel=Math.hypot(dx,dy);
  if(travel>260)return true;
  const steps=Math.max(1,Math.ceil((travel+Math.abs(rotation)*18)/5));
  const nearby=others.filter(other=>Math.hypot(other.x-player.x,other.y-player.y)<=travel+42);
  let accepted=player;
  for(let step=1;step<=steps;step++){
    const fraction=step/steps;
    const pose={x:player.x+dx*fraction,y:player.y+dy*fraction,angle:player.angle+rotation*fraction};
    if(nearby.some(other=>separation(pose,other).distance<0)){
      Object.assign(player,accepted);
      return true;
    }
    accepted=pose;
  }
  Object.assign(player,car);
  return false;
}

export function lanMultiplayer(){
  function install(server){
    const players=new Map();
    const rooms=new Map();
    let nextNumber=1;

    function spawn(player,pose){
      Object.assign(player,pose,{lift:0,airPitch:0,wheelSpin:0,braking:false,revision:randomUUID()});
    }

    function roomPlayers(room){
      return [...players.values()].filter(player=>player.room===room);
    }

    function exitRoom(player){
      const pose=openSpawn(player,player.model,roomPlayers(null))??
        openSpawn(ISLAND_STARTS.coast,player.model,roomPlayers(null));
      if(pose)spawn(player,pose);
      player.room=null;
    }

    function removeFromRoom(player){
      const room=player.room;
      if(!room)return;
      if(room.host===player.number){
        rooms.delete(room.host);
        for(const member of roomPlayers(room))exitRoom(member);
      }else{
        exitRoom(player);
        if(room.runner===player.number)room.runner=room.host;
      }
    }

    function removePlayer(id){
      const player=players.get(id);
      players.delete(id);
      if(!player)return;
      removeFromRoom(player);
      for(const room of rooms.values())room.invites.delete(player.number);
    }

    function advanceRound(room,now){
      const {round}=room;
      if(!round||round.result)return;
      const members=roomPlayers(room);
      const runner=members.find(player=>player.number===round.runner);
      const officers=members.filter(player=>player!==runner);
      if(!runner||!officers.length){
        round.result='cancelled';
        return;
      }
      if(now<round.startsAt)return;
      const deadline=round.startsAt+chaseMs;
      const time=Math.min(now,deadline);
      const nearRunner=officers.some(officer=>separation(officer,runner).distance<12);
      round.contactSince=nearRunner?round.contactSince??time:null;
      round.contact=round.contactSince===null?0:Math.min(BUST_SECONDS,(time-round.contactSince)/1000);
      if(round.contact>=BUST_SECONDS)round.result='caught';
      else if(now>=deadline)round.result='escaped';
    }

    function startRound(room,player,others,now){
      const mixedGraphics=others.some(officer=>!officer.cityAvailable);
      const anchor=requiresCityGraphics(player.x,player.y)&&mixedGraphics?ISLAND_STARTS.coast:nearestRoadSpawn(player,player.cityAvailable);
      const behind={x:anchor.x-140*Math.cos(anchor.angle),y:anchor.y-140*Math.sin(anchor.angle),angle:anchor.angle};
      const runnerPose=openSpawn(anchor,player.model,[]);
      if(!runnerPose)return false;
      const lineup=[runnerPose];
      for(const officer of others){
        const start=requiresCityGraphics(anchor.x,anchor.y)===requiresCityGraphics(behind.x,behind.y)?behind:anchor;
        const pose=openSpawn(start,officer.model,lineup);
        if(!pose)return false;
        lineup.push(pose);
      }
      [player,...others].forEach((driver,index)=>spawn(driver,lineup[index]));
      room.round={runner:player.number,startsAt:now+countdownMs,contactSince:null,contact:0,result:null};
      return true;
    }

    function roomAction(player,action,now){
      const [command,value]=action.split(':');
      const target=Number(value);
      const room=player.room;
      if(command==='create-room'&&!room){
        const created={host:player.number,runner:player.number,invites:new Set(),round:null};
        rooms.set(player.number,created);
        player.room=created;
        for(const pending of rooms.values())pending.invites.delete(player.number);
      }else if(command==='decline'){
        rooms.get(target)?.invites.delete(player.number);
      }else if(command==='accept'&&!room){
        const destination=rooms.get(target);
        if(!destination?.invites.has(player.number)||destination.round&&!destination.round.result){
          return 'This invitation is no longer available.';
        }
        const members=roomPlayers(destination);
        const leader=members[0];
        const anchor=!player.cityAvailable&&requiresCityGraphics(leader.x,leader.y)?ISLAND_STARTS.coast:leader;
        const pose=openSpawn(anchor,player.model,members);
        if(!pose)return 'No open spawn in this room.';
        player.room=destination;
        spawn(player,pose);
        for(const pending of rooms.values())pending.invites.delete(player.number);
      }else if(command==='leave-room'){
        removeFromRoom(player);
      }else if(room?.host===player.number&&(!room.round||room.round.result)){
        const members=roomPlayers(room);
        if(command==='invite'){
          const guest=[...players.values()].find(other=>other.number===target&&!other.room);
          if(!guest)return 'This player is already in a room or has disconnected.';
          room.invites.add(target);
        }else if(command==='runner'&&members.some(member=>member.number===target)){
          room.runner=target;
        }else if(command==='start-room'&&members.length>=2){
          const runner=members.find(member=>member.number===room.runner);
          if(!startRound(room,runner,members.filter(member=>member!==runner),now)){
            return 'No room to start here. Try a different road.';
          }
          room.invites.clear();
        }
      }
      return null;
    }

    server.middlewares.use('/api/lan',async(req,res)=>{
      const send=(status,data)=>{
        res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify(data));
      };
      if(req.method!=='POST')return send(405,{error:'Method unavailable'});
      if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'){
        return send(403,{error:'Open the game on this host to join.'});
      }
      if(req.headers['content-type']!=='application/json')return send(415,{error:'Expected JSON'});
      let message;
      try{
        let body='';
        for await(const chunk of req){
          body+=chunk;
          if(body.length>1024){
            send(413,{error:'Update too large'});
            return;
          }
        }
        message=JSON.parse(body);
      }catch{
        if(!res.destroyed)send(400,{error:'Invalid update'});
        return;
      }
      if(typeof message?.id!=='string'||!(/^[a-f0-9]{32}$/).test(message.id)){
        return send(400,{error:'Invalid player ID'});
      }
      const {id,leave,action,revision}=message;
      const now=Date.now();
      for(const [key,player] of players){
        if(now-player.lastSeen>expiresAfter)removePlayer(key);
      }
      if(leave===true){
        removePlayer(id);
        return send(200,{});
      }
      const car=readCar(message.car);
      if(!car)return send(400,{error:'Invalid car update'});
      let player=players.get(id);
      let bump=false,notice=null;
      const cityAvailable=message.cityAvailable===true;
      if(!player){
        if(players.size>=maxPlayers)return send(409,{error:'The multiplayer session is full.'});
        const anchor=!cityAvailable&&requiresCityGraphics(car.x,car.y)?ISLAND_STARTS.coast:car;
        const pose=openSpawn(anchor,car.model,roomPlayers(null));
        if(!pose)return send(409,{error:'No open spawn. Try again shortly.'});
        player={number:nextNumber++,name:randomPlayerName(players.values()),room:null,cityAvailable};
        spawn(player,pose);
        players.set(id,player);
      }else if(!cityAvailable&&requiresCityGraphics(player.x,player.y)){
        player.cityAvailable=false;
        const pose=openSpawn(ISLAND_STARTS.coast,player.model,roomPlayers(player.room));
        if(pose)spawn(player,pose);
      }else if(revision===player.revision){
        player.cityAvailable=cityAvailable;
        const round=player.room?.round;
        const active=round&&!round.result;
        const others=roomPlayers(player.room).filter(other=>other!==player);
        if(typeof action==='string'&&(action.includes(':')||['create-room','start-room','leave-room'].includes(action))){
          notice=roomAction(player,action,now);
        }else if(action==='city'&&!player.cityAvailable){
          notice='Harbor City requires Full Graphics.';
        }else if(action==='boundary'||!active&&(action==='respawn'||Object.hasOwn(ISLAND_STARTS,action))){
          const anchor=Object.hasOwn(ISLAND_STARTS,action)?ISLAND_STARTS[action]:player;
          const pose=openSpawn(anchor,player.model,others);
          if(pose)spawn(player,pose);
          else notice='No open spawn nearby.';
        }else if(!active||now>=round.startsAt&&now<round.startsAt+chaseMs){
          bump=!player.cityAvailable&&requiresCityGraphics(car.x,car.y)||movePlayer(player,{...car,model:player.model},others);
        }
      }
      player.lastSeen=now;
      for(const room of rooms.values())advanceRound(room,now);
      const room=player.room;
      const round=room?.round;
      const others=roomPlayers(room).filter(other=>other!==player);
      const pursuit=round?{
        runner:round.runner,
        phase:round.result??(now<round.startsAt?'countdown':'chase'),
        seconds:Math.ceil(Math.max(0,(now<round.startsAt?round.startsAt:round.startsAt+chaseMs)-now)/1000),
        contact:Math.floor(round.contact*10)/10
      }:null;
      const {lastSeen,room:currentRoom,cityAvailable:graphicsCapability,...self}=player;
      const lobby=room?{host:room.host,runner:room.runner,members:[player,...others].map(member=>member.number).sort((a,b)=>a-b),
        pending:[...room.invites]}:null;
      const online=[...players.values()].filter(other=>other!==player)
        .map(other=>({number:other.number,name:other.name,available:!other.room}));
      const invitations=[...rooms.values()].filter(candidate=>candidate.invites.has(player.number))
        .map(candidate=>candidate.host);
      send(200,{self,bump,notice,pursuit,lobby,online,invitations,
        others:others.map(({lastSeen,revision,room,cityAvailable,...other})=>other)});
    });
  }
  return {name:'lan-multiplayer',configureServer:install,configurePreviewServer:install};
}
