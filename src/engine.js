export function createEngine(){
  const Audio = window.AudioContext || window.webkitAudioContext;
  if(!Audio)return null;
  const context=new Audio();
  const master=context.createGain();
  const filter=context.createBiquadFilter();
  filter.type='lowpass';
  master.gain.value=0;
  filter.connect(master).connect(context.destination);

  const voices=['triangle','sawtooth'].map((type,index)=>{
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type=type;
    oscillator.frequency.value=32*(index+1);
    gain.gain.value=index===0?.72:.16;
    oscillator.connect(gain).connect(filter);
    oscillator.start();
    return oscillator;
  });

  let disabled=false;
  function silence(now){
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0,now);
  }
  return {
    setMuted(value){
      disabled=value;
      if(value)silence(context.currentTime);
      else context.resume().catch(()=>{});
    },
    update(speed,load,muted){
      const now=context.currentTime;
      if(disabled||muted){silence(now);return;}
      const velocity=Math.abs(speed)*.76;
      const ratios=[45,75,110,150,195];
      const gear=ratios.findIndex(limit=>velocity<limit);
      const index=gear<0?ratios.length-1:gear;
      const progress=(velocity-(ratios[index-1]??0))/(ratios[index]-(ratios[index-1]??0));
      const frequency=29+index*4+Math.max(0,progress)*40+(load?7:0);
      voices.forEach((voice,i)=>voice.frequency.setTargetAtTime(frequency*(i+1),now,.085));
      filter.frequency.setTargetAtTime(165+frequency*(load?6:3),now,.12);
      master.gain.setTargetAtTime(load?.075:.038,now,.09);
    },
    close(){context.close().catch(()=>{});}
  };
}
