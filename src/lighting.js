export const LIGHTING_PRESETS={Day:85,Evening:190,Night:300};

const skyColors=[
  [.86,.79,.66],
  [.74,.84,.88],
  [.94,.56,.36],
  [.075,.12,.22]
];

function smooth(value){
  const t=Math.max(0,Math.min(1,value));
  return t*t*(3-2*t);
}

export function daylight(seconds){
  const phase=Math.max(0,Math.min(300,seconds));
  const durations=[85,105,110];
  const index=phase<85?0:phase<190?1:2;
  const start=[0,85,190][index];
  const blend=smooth((phase-start)/durations[index]);
  return {
    sky:skyColors[index].map((channel,i)=>channel+(skyColors[index+1][i]-channel)*blend),
    dusk:smooth((phase-125)/68)*(1-smooth((phase-203)/82)),
    night:smooth((phase-180)/120),
    lamps:smooth((phase-162)/76)
  };
}
