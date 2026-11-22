import {createTraffic,slidePastTraffic,updateTraffic} from './traffic';
import {BUST_SECONDS,HOME_DELAY,createPursuit,updatePursuit,recordPursuit} from './pursuit';
import {LIGHTING_PRESETS} from './lighting';
import {CARS,cycleCar} from './cars';
import {CHECKPOINT_COUNT,createChase,restartChase,delayChase,updateChase,recordChase,checkpointDirections} from './chase';
import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {START,KMH_PER_SPEED_UNIT,ISLAND_NAMES,ISLAND_STARTS,islandName,isRoad,nearestRoadSpawn,carMarker,drive,makeMap,renderWorld,drawMinimap} from './world';
import {makeScene,WHEEL_RADIUS} from './scene3d';
import './style.css';
import {createEngine} from './engine';

const parked={boundaryHit:false,speed:0,wheelSpin:0,steer:0,pitch:0,braking:false};
const bindings={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};
const formatTime=seconds=>{
  const cs=Math.floor(seconds*100);
  return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;
};

function Icon({name,size=18}){
  const paths={wheel:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 10h17M9 10l3 4 3-4m-3 4v7',flag:'M5 21V4m0 1c5-5 9 4 14-1v10c-5 5-9-4-14 1',map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',reset:'M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6',expand:'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4',chevron:'m9 6 6 6-6 6',home:'m3 11 9-8 9 8m-16-1v10h5v-6h4v6h5V10'};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

function TouchIcon({action}){
  if(action==='left'||action==='right'){
    return <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path d={action==='left'?'M4 16 27 4 22 16l5 12Z':'M28 16 5 4l5 12-5 12Z'} fill="currentColor"/>
    </svg>;
  }
  const brake=action==='brakeReverse';
  return <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <rect x={brake?5:9} y={brake?8:3} width={brake?22:14} height={brake?18:26} rx="4" fill="currentColor" opacity=".25"/>
    <rect x={brake?5:9} y={brake?8:3} width={brake?22:14} height={brake?18:26} rx="4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d={brake?'M9 13h14m-14 4h14m-14 4h14':'M13 9h6m-6 5h6m-6 5h6m-6 5h6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

function App(){
  const world=useRef(null), fallback=useRef(null), radar=useRef(null), largeRadar=useRef(null);
  const held=useRef(new Map());
  const started=useRef(false);
  const lightingTime=useRef(LIGHTING_PRESETS.Day);
  const [lightingPreset,setLightingPreset]=useState('Day');
  const engine=useRef(null);
  const [soundOff,setSoundOff]=useState(()=>{
    try {return localStorage.getItem('coastline-chase-muted')==='true';}
    catch {return false;}
  });
  const muted=useRef(soundOff);
  const [driving,setDriving]=useState(false);
  const [selectedCar,setSelectedCar]=useState(0);
  const startingIsland=useRef('coast');
  const [selectedIsland,setSelectedIsland]=useState('coast');
  const wide=useRef(false);
  const [wideView,setWideView]=useState(false);
  const [flatView,setFlatView]=useState(false);
  const race=useRef(null);
  const pursuit=useRef(null);
  const traffic=useRef(null);
  const pursuitBestRef=useRef(null);
  const [pursuitBest,setPursuitBest]=useState(null);
  const [policeMode,setPoliceMode]=useState(null);
  const pausedAt=useRef(null);
  const [paused,setPaused]=useState(false);
  const previousPoints=useRef([]);
  const emptyRecord={best:null,last:null};
  const recordRef=useRef(emptyRecord);
  const [record,setRecord]=useState(emptyRecord);
  const car=useRef({...START,...parked,model:0,smokeGeneration:0});
  const camera=useRef({...START,zoom:1.12});
  const [stats,setStats]=useState({speed:0,angle:START.angle,road:true});
  const [trial,setTrial]=useState(null);
  const [mapOpen,setMapOpen]=useState(false);
  const [phoneMenu,setPhoneMenu]=useState(false);
  const [islandPickerOpen,setIslandPickerOpen]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);

  function beginDrive(){
    held.current.clear();
    started.current=true;
    traffic.current=createTraffic();
    try {
      engine.current??=createEngine();
      engine.current?.setMuted(muted.current);
    } catch {}
    setDriving(true);
  }

  function selectLighting(label){
    lightingTime.current=LIGHTING_PRESETS[label];
    setLightingPreset(label);
  }

  function toggleSound(){
    const next=!muted.current;
    muted.current=next;
    setSoundOff(next);
    engine.current?.setMuted(next||pausedAt.current!==null);
    try {localStorage.setItem('coastline-chase-muted',String(next));} catch {}
  }

  function switchCamera(){
    wide.current=!wide.current;
    setWideView(wide.current);
  }

  function resumeChase(){
    if(pausedAt.current===null)return;
    const elapsed=performance.now()-pausedAt.current;
    if(race.current)delayChase(race.current,elapsed);
    pausedAt.current=null;
    setPaused(false);
    if(started.current)engine.current?.setMuted(muted.current);
  }

  function togglePause(){
    if(!race.current?.remaining.length||race.current.time<=0)return;
    if(pausedAt.current!==null){
      resumeChase();
      return;
    }
    pausedAt.current=performance.now();
    held.current.clear();
    setPaused(true);
    engine.current?.setMuted(true);
  }

  function reset(){
    resumeChase();
    held.current.clear();
    const spawn=ISLAND_STARTS[startingIsland.current];
    Object.assign(car.current,spawn,parked);
    car.current.smokeGeneration++;
    Object.assign(camera.current,spawn);
    setStats({speed:0,angle:spawn.angle,road:true,island:ISLAND_NAMES[startingIsland.current]});
    race.current=null;
    pursuit.current=null;
    setTrial(null);
    setPoliceMode(null);
  }

  function chooseIsland(key){
    startingIsland.current=key;
    setSelectedIsland(key);
    reset();
    setIslandPickerOpen(false);
    setPhoneMenu(false);
  }

  function respawn(){
    const spawn=nearestRoadSpawn(car.current);
    pursuit.current?.patrols.forEach(patrol=>{patrol.closeEncounter=false;});
    Object.assign(car.current,spawn,parked);
    car.current.smokeGeneration++;
    Object.assign(camera.current,spawn);
  }

  function selectCar(direction){
    car.current.model=cycleCar(car.current.model,direction);
    setSelectedCar(car.current.model);
  }

  function savePursuit(run){
    const best=recordPursuit(pursuitBestRef.current,run);
    if(best===pursuitBestRef.current)return;
    pursuitBestRef.current=best;
    setPursuitBest(best);
    try {localStorage.setItem('coastline-chase-pursuit-best',JSON.stringify(best));} catch {}
  }

  function goHome(){
    if(pursuit.current)savePursuit(pursuit.current);
    started.current=false;
    held.current.clear();
    engine.current?.setMuted(true);
    reset();
    setMapOpen(false);
    setPhoneMenu(false);
    setIslandPickerOpen(false);
    setDriving(false);
  }

  function beginChase(run){
    reset();
    setPhoneMenu(false);
    race.current=run;
    previousPoints.current=run.points;
    setTrial({cleared:0,time:0,finished:false,directions:checkpointDirections(run.remaining,car.current)});
  }

  function startTrial(){
    beginChase(createChase(previousPoints.current,Math.random,ISLAND_STARTS[startingIsland.current]));
  }

  function launchPursuit(cruiser=null,now=performance.now()){
    if(cruiser){
      const trafficCars=traffic.current;
      trafficCars.splice(trafficCars.indexOf(cruiser),1);
      race.current=null;
      setTrial(null);
    }
    setPhoneMenu(false);
    pursuit.current=createPursuit(car.current,now,cruiser,traffic.current??[]);
    setPoliceMode({contact:0,busted:false,patrolCount:pursuit.current.patrols.length,survived:0,escaped:0});
  }

  function startPursuit(){
    reset();
    launchPursuit();
  }

  function retryTrial(){
    if(race.current)beginChase(restartChase(race.current.points));
  }

  useEffect(()=>{
    try {
      const stored=JSON.parse(localStorage.getItem('coastline-chase-record'));
      if(stored&&[stored.best,stored.last].every(time=>Number.isFinite(time)&&time>0)){
        recordRef.current=stored;
        setRecord(stored);
      }
    } catch {}
    try {
      const stored=JSON.parse(localStorage.getItem('coastline-chase-pursuit-best'));
      if(stored&&Number.isFinite(stored.survived)&&stored.survived>0&&Number.isInteger(stored.escaped)&&stored.escaped>=0){
        pursuitBestRef.current=stored;
        setPursuitBest(stored);
      }
    } catch {}
    const onKey=e=>{
      if(!started.current){
        if(e.target.closest?.('input'))return;
        if(e.type==='keydown' && (e.code==='ArrowLeft'||e.code==='ArrowRight')){
          e.preventDefault();
          if(!e.repeat)selectCar(e.code==='ArrowLeft'?-1:1);
        }
        if(e.type==='keydown' && e.code==='Space' && !e.target.closest?.('button')){
          e.preventDefault();
          beginDrive();
        }
        return;
      }
      if(pursuit.current?.bustedAt!=null)return;
      if(e.key==='Escape'){setMapOpen(false);setPhoneMenu(false);return;}
      if(e.code==='KeyP'&&e.type==='keydown'&&!e.repeat){togglePause();return;}
      if(pausedAt.current!==null&&e.code!=='KeyM')return;
      if(e.target.closest?.('button') && (e.code==='Space'||e.code==='Enter') && e.type==='keydown')return;
      if(bindings[e.code]){
        e.preventDefault();
        if(e.type==='keydown')held.current.set(e.code,bindings[e.code]);
        else held.current.delete(e.code);
      }
      if(e.type==='keyup'||e.repeat)return;
      if(e.code==='KeyR')respawn();
      if(e.code==='KeyC')switchCamera();
      if(e.code==='KeyM')setMapOpen(open=>!open);
    };
    const clear=()=>held.current.clear();
    const onFullscreen=()=>setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('keydown',onKey);
    window.addEventListener('keyup',onKey);
    window.addEventListener('blur',clear);
    document.addEventListener('fullscreenchange',onFullscreen);

    let scene;
    try {scene=makeScene(world.current);} catch(error){console.warn('3D renderer unavailable',error);}
    if(!scene)setFlatView(true);
    const canvas=scene?world.current:fallback.current;
    const map=scene?null:makeMap();
    const ctx=scene?null:canvas.getContext('2d');
    let width,height,raf,last=null,update=0,orbitStart=null;
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize=()=>{
      ({width,height}=world.current.getBoundingClientRect());
      const ratio=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*ratio);
      canvas.height=Math.round(height*ratio);
      ctx?.setTransform(ratio,0,0,ratio,0,0);
    };
    const observer=new ResizeObserver(resize);
    observer.observe(world.current);
    resize();

    function frame(now){
      const dt=last===null||pausedAt.current!==null||pursuit.current?.bustedAt!=null?0:Math.min((now-last)/1000,.05);
      last=now;
      if(!started.current){
        orbitStart??=now;
        const orbit=car.current.angle+.68+(reduceMotion.matches?0:(now-orbitStart)*2*Math.PI/32000);
        if(scene)scene.render(camera.current,car.current,[],false,orbit);
        else renderWorld(ctx,map,camera.current,width,height,car.current,[],now/1000);
        raf=requestAnimationFrame(frame);
        return;
      }
      let police=pursuit.current;
      if(police?.bustedAt!=null&&now-police.bustedAt>=HOME_DELAY){
        goHome();
        raf=requestAnimationFrame(frame);
        return;
      }
      orbitStart=null;
      const controls=new Set(held.current.values());
      const player=car.current;
      const {x,y,speed,angle}=player;
      const canDrive=pausedAt.current===null&&police?.bustedAt==null;
      const wasOnRoad=canDrive?drive(player,controls,dt):isRoad(player.x,player.y);
      const hitBoundary=player.boundaryHit;
      const civilians=traffic.current??[];
      if(canDrive&&!hitBoundary){
        const collision=slidePastTraffic(player,{x,y,angle},civilians);
        if(collision?.police&&!police){
          launchPursuit(collision,now);
          police=pursuit.current;
        }
      }
      if(hitBoundary)respawn();
      const road=hitBoundary||wasOnRoad;
      const travel=hitBoundary?0:(player.x-x)*Math.cos(player.angle)+(player.y-y)*Math.sin(player.angle);
      player.wheelSpin=(player.wheelSpin-travel/WHEEL_RADIUS)%(Math.PI*2);
      const response=1-Math.exp(-dt*11);
      const acceleration=dt>0&&!hitBoundary?(player.speed-speed)/dt:0;
      const pitch=Math.max(-.034,Math.min(.021,acceleration*.00016));
      player.pitch+=(pitch-player.pitch)*response;
      if(pausedAt.current===null)player.braking=controls.has('brake')||(speed>0&&controls.has('brakeReverse'))||speed>8&&controls.has('down');
      if(police&&police.bustedAt===null){
        updatePursuit(police,player,dt,now);
        if(police.bustedAt!==null){
          held.current.clear();
          setMapOpen(false);
          savePursuit(police);
          setPoliceMode({contact:BUST_SECONDS,busted:true,patrolCount:police.patrols.length,survived:police.survived,escaped:police.escaped});
          engine.current?.setMuted(true);
        }
      }
      const patrols=police?.patrols??[];
      updateTraffic(civilians,player,patrols,dt);
      const active=race.current;
      if(pausedAt.current===null&&active&&updateChase(active,player,now,controls.has('up')||controls.has('down')||(player.speed<0&&controls.has('brakeReverse')))){
        const next=recordChase(recordRef.current,active.time);
        recordRef.current=next;
        setRecord(next);
        try {localStorage.setItem('coastline-chase-record',JSON.stringify(next));} catch {}
      }
      const targets=active?.remaining??[];
      const cam=camera.current;
      const follow=1-Math.exp(-dt*5);
      cam.x+=(player.x-cam.x)*follow;
      cam.y+=(player.y-cam.y)*follow;
      const turn=player.angle-cam.angle;
      cam.angle+=Math.atan2(Math.sin(turn),Math.cos(turn))*follow;
      const zoom=Math.max(.79,Math.min(1.45,width/940))-Math.abs(player.speed)*.0006;
      cam.zoom+=(zoom-cam.zoom)*follow;
      if(scene)scene.render(cam,player,targets,wide.current,null,dt,road,controls.has('up')&&!player.braking,lightingTime.current,patrols,now,civilians);
      else renderWorld(ctx,map,cam,width,height,player,targets,now/1000,[...patrols,...civilians]);
      if(now-update>65){
        update=now;
        engine.current?.update(player.speed,controls.has('up')||controls.has('down')||(player.speed<0&&controls.has('brakeReverse')),muted.current||pausedAt.current!==null||police?.bustedAt!=null||document.hidden);
        setStats({speed:Math.round(Math.abs(player.speed)*KMH_PER_SPEED_UNIT),angle:player.angle,road,island:islandName(player.x,player.y)});
        if(police&&police.bustedAt===null)setPoliceMode({contact:police.contact,busted:false,patrolCount:police.patrols.length,survived:police.survived,escaped:police.escaped});
        if(active)setTrial({cleared:CHECKPOINT_COUNT-targets.length,time:active.time,finished:targets.length===0,directions:checkpointDirections(targets,player)});
        for(const canvas of [radar.current,largeRadar.current]) {
          if(canvas)drawMinimap(canvas.getContext('2d'),canvas.width,canvas.height,player,targets,canvas===largeRadar.current,patrols);
        }
      }
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
    return ()=>{
      observer.disconnect();
      scene?.destroy();
      engine.current?.close();
      engine.current=null;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown',onKey);
      window.removeEventListener('keyup',onKey);
      window.removeEventListener('blur',clear);
      document.removeEventListener('fullscreenchange',onFullscreen);
    };
  },[]);

  function touch(action,label){
    const release=e=>held.current.delete(e.pointerId);
    return <button type="button" aria-label={label} onPointerDown={e=>{
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      held.current.set(e.pointerId,action);
    }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><TouchIcon action={action}/></button>;
  }
  const heading=['N','NE','E','SE','S','SW','W','NW'][((Math.round((stats.angle+Math.PI/2)/(Math.PI/4))%8)+8)%8];

  return <main className="shell">
    <canvas className="world" ref={world} aria-label="3D coastal driving world" aria-hidden={flatView}/>
    <canvas className="world" ref={fallback} hidden={!flatView} aria-label="Top-down coastal driving world"/>
    <div className="vignette"/>
    <header className="top">
      <div className="brand">
        <img className="mark" src={`${import.meta.env.BASE_URL}coastline-192.png`} alt="" width="46" height="46"/>
        <div><h1>Coastline Chase<span>.io</span></h1></div>
      </div>
      {driving&&<button className="square phone-menu-button" type="button"
        aria-expanded={phoneMenu} aria-controls="phone-game-menu"
        onClick={()=>{held.current.clear();setPhoneMenu(open=>!open);}}>
        Menu
      </button>}
      <div className={driving?'top-actions':'top-actions landing-actions'}>
        {driving&&<>
        <button className="square" title="Home" aria-label="Home" onClick={goHome}><Icon name="home"/></button>
        <button className="square camera" aria-label="Mute engine sound" aria-pressed={soundOff}
          onClick={toggleSound}>
          <span>{soundOff?'OFF':'SND'}</span>
        </button>
        {!flatView&&<button className="square camera" title="Switch camera (C)" aria-label="Wide chase camera" aria-pressed={wideView} onClick={switchCamera}><span>CAM</span></button>}
        <button className="square" title="Respawn on nearest road (R)" aria-label="Respawn on nearest road" onClick={respawn} disabled={paused}><Icon name="reset"/></button>
        {!flatView&&<div className="lighting-controls panel" role="group" aria-label="Time of day">
          {Object.keys(LIGHTING_PRESETS).map(label=>(
            <button type="button" key={label} aria-pressed={lightingPreset===label} onClick={()=>selectLighting(label)}>{label}</button>
          ))}
        </div>}
        </>}
        <button className="square fullscreen" title={fullscreen?'Exit fullscreen':'Fullscreen'} aria-label={fullscreen?'Exit fullscreen':'Fullscreen'} onClick={()=>{const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();action?.catch(()=>{});}}><Icon name="expand"/></button>
      </div>
    </header>
    {!driving&&<section className="intro" aria-label="Choose a car and starting island">
      <div className="car-selector">
        <button className="square previous-car" aria-label="Previous car" onClick={()=>selectCar(-1)}><Icon name="chevron"/></button>
        <div aria-live="polite"><h2>{CARS[selectedCar].name}</h2><p>{selectedCar+1} / {CARS.length}</p></div>
        <button className="square" aria-label="Next car" onClick={()=>selectCar(1)}><Icon name="chevron"/></button>
      </div>
      <fieldset className="island-selector">
        <legend>Start from</legend>
        {Object.entries(ISLAND_NAMES).map(([key,name])=><label key={key}>
          <input type="radio" name="starting-island" checked={selectedIsland===key} onChange={()=>chooseIsland(key)}/>
          <span>{name}</span>
        </label>)}
      </fieldset>
      <button className="start intro-start" onClick={beginDrive}><Icon name="wheel" size={20}/> Start driving</button>
      <span className="intro-shortcut">Press <kbd>Space</kbd></span>
    </section>}
    {driving&&<>
    <div id="phone-game-menu" className="phone-game-menu" data-view={phoneMenu?'modes':'drive'}>
    {phoneMenu&&<header className="phone-menu-header">
      <h2>Menu</h2>
      <button type="button" className="square" autoFocus onClick={()=>setPhoneMenu(false)}>Back to drive</button>
    </header>}
    <aside className="mission" aria-label="Driving modes">
      {!trial&&!policeMode&&<section className="mode-card panel free-roam-card">
        <div className="mode"><span/>CURRENT LOCATION</div>
        <h2>{stats.island??islandName(START.x,START.y)}</h2>
        <button className="start island-switch" type="button" aria-expanded={islandPickerOpen}
          aria-controls="island-destinations" onClick={()=>setIslandPickerOpen(open=>!open)}>Switch island</button>
        <div className="island-destinations" id="island-destinations" hidden={!islandPickerOpen}>
          {Object.entries(ISLAND_NAMES).map(([key,name])=>(
            <button type="button" key={key} disabled={stats.island===name} onClick={()=>chooseIsland(key)}>{name}</button>
          ))}
        </div>
      </section>}
      {!policeMode&&<section className="mode-card panel chase-card">
        {trial&&<div className="mode"><span/>CHECKPOINT CHASE</div>}
        <h2>{trial?.finished?'Chase complete':paused?'Chase paused':trial?'Find the checkpoints':'Checkpoint Chase'}</h2>
        <p>{trial?`${trial.cleared}/${CHECKPOINT_COUNT} checkpoints cleared`:'Find five randomly placed checkpoints across the islands.'}</p>
        {record.best!==null&&<p>Best time {formatTime(record.best)}</p>}
        {!trial&&record.last!==null&&<p>Last run {formatTime(record.last)}</p>}
        {trial&&!trial.finished&&!paused&&<p>Follow the numbered arrows or open Map (<kbd>M</kbd>). Clear all five in any order.</p>}
        {trial&&!trial.finished&&!paused&&trial.time===0&&<p>The timer starts when you accelerate.</p>}
        {trial&&<output className="timer" aria-label={trial.finished?'Finish time':'Elapsed time'}>{formatTime(trial.time)}</output>}
        {trial&&!trial.finished?<div className="chase-actions">
          {trial.time>0&&<button className="start" onClick={togglePause} title="Pause or resume chase (P)">{paused?'Resume':'Pause'}</button>}
          <button className="start chase-restart" onClick={retryTrial}>Restart</button>
        </div>:<button className="start" onClick={startTrial}><Icon name="flag" size={16}/>{trial?'New chase':'Start chase'}</button>}
      </section>}
      {(!trial||trial.finished)&&<section className="mode-card panel pursuit-card">
        {policeMode&&<div className="mode"><span/>POLICE PURSUIT</div>}
        <h2>{policeMode?'Lose the patrols':'Police Pursuit'}</h2>
        <p>{policeMode?`${policeMode.patrolCount} patrol cars in pursuit`:'Outrun four patrol cars. Another joins every 10 seconds and the patrols get faster.'}</p>
        <p>{policeMode?'Five seconds of continuous contact gets you busted.':'Hit a police cruiser in traffic to start a pursuit on the spot.'}</p>
        <p>Best survival {pursuitBest?formatTime(pursuitBest.survived):'—'}</p>
        <p>Patrol cars escaped {pursuitBest?.escaped??'—'}</p>
        {policeMode&&<p>Survived {formatTime(policeMode.survived)} · Escaped {policeMode.escaped}</p>}
        {policeMode?<div className="pursuit-meter">
          <span>{policeMode.contact>0?`Contact ${policeMode.contact.toFixed(1)} / ${BUST_SECONDS}s`:'No contact'}</span>
          <progress aria-label="Police contact" max={BUST_SECONDS} value={policeMode.contact}/>
        </div>:<button className="start pursuit-start" onClick={startPursuit}>Start police pursuit</button>}
      </section>}
      {!trial&&!policeMode&&<section className="mode-card panel multiplayer-card">
        <h2>Multiplayer</h2>
        <p>Coming soon</p>
        <button type="button" className="start" disabled>Play Multiplayer</button>
      </section>}
    </aside>
    <div className="touch" aria-label="Touch controls"><div>{touch('left','Left')}{touch('right','Right')}</div><div>{touch('brakeReverse','Brake or hold to reverse')}{touch('up','Accelerate')}</div></div>
    </div>
    <div className="compass" aria-label={`Heading ${heading}`}><span/> <b>{heading}</b> <span/></div>
    {trial?.directions.length>0&&<div className="checkpoint-directions panel" aria-label="Checkpoint directions">
      {trial.directions.map(({number,angle})=><div className="checkpoint-direction" key={number}
        aria-label={`Checkpoint ${number}, ${['ahead','ahead right','right','behind right','behind','behind left','left','ahead left'][(Math.round(angle/(Math.PI/4))+8)%8]}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" style={{transform:`rotate(${angle}rad)`}} aria-hidden="true">
          <path d="M12 2 21 20l-9-4-9 4Z" fill="currentColor"/>
        </svg>
        <span>{number}</span>
      </div>)}
    </div>}
    <footer className="bottom">
      <section className="speed panel" aria-label="Speedometer">
        <div className="readout"><b>{String(stats.speed).padStart(3,'0')}</b><span>KM/H</span></div>
        <div className="speed-track" aria-hidden="true"><i style={{width:`${Math.min(100,stats.speed/1.86)}%`}}/></div>
        <div className="surface"><span/>{stats.road?'PAVED ROAD':'OFF-ROAD'}</div>
      </section>
      <div className="keyboard panel" aria-label="Keyboard controls">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Drive</span></div>
        <div><kbd>Space</kbd><span>Brake</span></div>
        <div><kbd>R</kbd><span>Respawn</span></div>
      </div>
      <button className="minimap panel" aria-label="Open map" onClick={()=>setMapOpen(true)}>
        <div><Icon name="map" size={15}/> MAP <kbd>M</kbd></div>
        <canvas ref={radar} width="288" height="228"/>
      </button>
    </footer>
    {mapOpen&&<div className="overlay" onClick={()=>setMapOpen(false)}>
      <section className="atlas panel" role="dialog" aria-modal="true" aria-label="Map" onClick={e=>e.stopPropagation()}>
        <div><h2>Map</h2><button autoFocus className="square" onClick={()=>setMapOpen(false)} aria-label="Close map">×</button></div>
        <canvas ref={largeRadar} width="960" height="782"/>
        <p className="map-legend">
          <span><svg viewBox="-8 -10 16 20" width="14" height="17" aria-hidden="true">
            <path d={carMarker.body} fill="#fff4cf"/>
            <path d={carMarker.glass} fill="#345358"/>
          </svg>Your car</span>
          {trial&&!trial.finished&&<span><i aria-hidden="true"/>Remaining checkpoints</span>}
        </p>
      </section>
    </div>}
    {policeMode?.busted&&<div className="busted-screen" role="alertdialog" aria-modal="true" aria-label="Busted">
      <div><h2>BUSTED</h2><p>Returning Home</p></div>
    </div>}
    </>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
