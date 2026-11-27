const endpoint=`${import.meta.env.BASE_URL}api/lan`;
const updateInterval=80;

function send(message,options){
  return fetch(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(message),
    ...options
  });
}

export function joinMultiplayer(car,hasCity,onSession,onStatus,onCorrection){
  const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const cars=new Map();
  const actions=[];
  let stopped=false,timer,request,sessionKey,revision=null,inFlightAction=null,pursuit=null,number=null,name=null;

  function publishSession(online,invitations,lobby,notice){
    const key=JSON.stringify([number,name,online,invitations,lobby,pursuit,notice]);
    if(key===sessionKey)return;
    sessionKey=key;
    onSession({number,name,others:online,invitations,lobby,pursuit,notice});
  }

  async function update(){
    const started=performance.now();
    const {x,y,angle,model,wheelSpin,braking,lift,airPitch}=car.current;
    const nextAction=actions.shift()??null;
    inFlightAction=nextAction;
    request=new AbortController();
    let delay=updateInterval;
    const timeout=setTimeout(()=>request.abort(),2500);
    try{
      const response=await send({id,revision,cityAvailable:hasCity(),action:nextAction,car:{x,y,angle:angle%(2*Math.PI),model,wheelSpin,braking,lift,airPitch}},{signal:request.signal});
      if(!response.ok){
        const message=response.status===409?(await response.json()).error:'Reconnecting to multiplayer…';
        throw new Error(message);
      }
      const {self,bump,others,notice,online,invitations,lobby,pursuit:nextPursuit}=await response.json();
      if(stopped)return;
      pursuit=nextPursuit;
      number=self.number;
      name=self.name;
      if(revision!==self.revision||bump){
        onCorrection(self,revision!==self.revision);
        revision=self.revision;
      }
      const present=new Set();
      for(const other of others){
        present.add(other.number);
        other.lift??=0;
        other.airPitch??=0;
        other.police=Boolean(pursuit&&['countdown','chase'].includes(pursuit.phase)&&other.number!==pursuit.runner);
        const remote=cars.get(other.number);
        if(remote)remote.target=other;
        else cars.set(other.number,{...other,target:other});
      }
      for(const key of cars.keys()){
        if(!present.has(key))cars.delete(key);
      }
      publishSession(online,invitations,lobby,notice);
      onStatus('Connected');
    }catch(error){
      if(stopped)return;
      cars.clear();
      delay=1000;
      number=null;
      name=null;
      pursuit=null;
      publishSession([],[],null,null);
      onStatus(error.message==='Failed to fetch'||error.name==='AbortError'?'Reconnecting to multiplayer…':error.message);
    }finally{
      inFlightAction=null;
      clearTimeout(timeout);
      if(!stopped)timer=setTimeout(update,Math.max(0,delay-(performance.now()-started)));
    }
  }

  const leave=()=>{
    if(stopped)return;
    stopped=true;
    clearTimeout(timer);
    request?.abort();
    cars.clear();
    window.removeEventListener('pagehide',onPageHide);
    send({id,leave:true},{keepalive:true}).catch(()=>{});
  };
  const onPageHide=event=>{if(!event.persisted)leave();};
  window.addEventListener('pagehide',onPageHide);
  update();

  return {
    leave,
    act(next){actions.push(next);},
    get ready(){return number!==null&&!actions.length&&!inFlightAction&&pursuit?.phase!=='countdown';},
    get police(){return Boolean(pursuit&&['countdown','chase'].includes(pursuit.phase)&&number!==pursuit.runner);},
    get racing(){return Boolean(pursuit&&['countdown','chase'].includes(pursuit.phase));},
    obstacles(){return Array.from(cars.values(),remote=>remote.target);},
    render(dt){
      const blend=1-Math.exp(-dt*16);
      for(const remote of cars.values()){
        const target=remote.target;
        const snap=Math.hypot(target.x-remote.x,target.y-remote.y)>120;
        const weight=snap?1:blend;
        remote.x+=(target.x-remote.x)*weight;
        remote.y+=(target.y-remote.y)*weight;
        const turn=target.angle-remote.angle;
        remote.angle+=Math.atan2(Math.sin(turn),Math.cos(turn))*weight;
        remote.lift+=(target.lift-remote.lift)*weight;
        if(remote.lift<.025)remote.lift=0;
        remote.airPitch+=(target.airPitch-remote.airPitch)*weight;
        remote.wheelSpin=target.wheelSpin;
        remote.braking=target.braking;
        remote.model=target.model;
        remote.police=target.police;
      }
      return [...cars.values()];
    }
  };
}
