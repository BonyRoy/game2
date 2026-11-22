export const CARS=[
  {name:'Ember Coupe',alloy:{spokes:5,rim:1.59,finish:'#d2d8d5',lip:'#a5b2b5',inner:.27,outer:.105},paint:['#963b2d','#d05d40','#ed895f','#bc4d36','#93382d'],roof:'#ee8e66',cabin:[1.7,-6.05,-10.9,9.8]},
  {name:'Tidal Fastback',alloy:{spokes:5,split:true,rim:1.76,finish:'#757f89',lip:'#adb9c0',inner:.13,outer:.065,sweep:.15},paint:['#24526a','#387892','#65a6bc','#326b85','#254e64'],roof:'#71acbf',cabin:[2.8,-3.4,-13.4,9.3],spoiler:true,exhausts:[-4.2,4.2],flameExhaust:true},
  {name:'Juniper Wagon',alloy:{spokes:8,rim:1.60,finish:'#ba9863',lip:'#dac293',inner:.18,outer:.083},paint:['#465943','#647c55','#9ca77b','#657751','#4b5940'],roof:'#a9af87',cabin:[2.5,-11.8,-14.2,11.2],rails:true,beltLift:.65},
  {name:'Citrus Hatchback',alloy:{spokes:4,rim:1.53,finish:'#e0dfd2',lip:'#bdbbb4',inner:.29,outer:.22},paint:['#95712e','#c18e35','#e6ba55','#b38232','#856324'],roof:'#f1ca69',
    cabin:[2.7,-11,-14.7,9.6],length:.82,width:.91},
  {name:'Summit SUV',alloy:{spokes:6,rim:1.67,finish:'#7d8c94',lip:'#545f65',inner:.26,outer:.16,bolts:true},paint:['#3d464f','#495b6e','#748ca0','#425466','#35414d'],roof:'#8298aa',
    cabin:[3.1,-12.7,-15.3,12.95],length:1.06,width:1.12,rails:true,rugged:true,blackExhaust:true}
];

export function cycleCar(index,direction){
  return (index+direction+CARS.length)%CARS.length;
}
