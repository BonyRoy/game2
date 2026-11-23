export const CARS=[
  {name:'Ember Coupe',asset:{url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/1968_lamborghini_miura_p400.glb`,scale:800,rear:{x:-16.64,y:4.50,z:5,width:1.85}},
    alloy:{spokes:5,rim:1.59,finish:'#d2d8d5',lip:'#a5b2b5',inner:.27,outer:.105},paint:['#963b2d','#d05d40','#ed895f','#bc4d36','#93382d'],roof:'#ee8e66',cabin:[1.7,-6.05,-10.9,9.8],exhausts:[-4.1,4.1]},
  {name:'Tidal Fastback',asset:{url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/2014_lamborghini_aventador_lbworks.glb`,scale:735,rear:{x:-15.8,y:4.7,z:4.5,width:2.6}},alloy:{spokes:5,split:true,rim:1.76,finish:'#757f89',lip:'#adb9c0',inner:.13,outer:.065,sweep:.15},paint:['#24526a','#387892','#65a6bc','#326b85','#254e64'],roof:'#71acbf',cabin:[2.8,-3.4,-13.4,9.3],spoiler:true,exhausts:[-4.2,4.2],flameExhaust:true},
  {name:'Juniper Wagon',asset:{
    url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/2011_land_rover_range_rover_evoque.glb`,
    scale:800,lift:1.91,paint:{rphong2SG1:[.20,.45,.24]},bakedWheels:true,clusterLights:true,
    rear:{x:-16.2,y:8.7,z:5.6,width:2.2}
  },alloy:{spokes:8,rim:1.60,finish:'#ba9863',lip:'#dac293',inner:.18,outer:.083},paint:['#465943','#647c55','#9ca77b','#657751','#4b5940'],roof:'#a9af87',cabin:[2.5,-11.8,-14.2,11.2],rails:true,beltLift:.65},
  {name:'Citrus Hatchback',asset:{
    url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/1965_austin_mini_cooper_s.glb`,
    scale:880,lift:1.35,paint:{CarPaint_Color_1:[1,.78,.08],CarPaint_Color_2:[1,.78,.08]},
    combinedWheels:{materials:['tire','rims'],front:1.075,rear:-.974,centerY:.095,track:.596},
    lensMaterials:{front:'glass_N',rear:'red_glass'},
    rear:{x:-12.32,y:4.52,z:4.95,width:.82}
  },alloy:{spokes:4,rim:1.53,finish:'#e0dfd2',lip:'#bdbbb4',inner:.29,outer:.22},paint:['#95712e','#c18e35','#e6ba55','#b38232','#856324'],roof:'#f1ca69',
    cabin:[2.7,-11,-14.7,9.6],length:.82,width:.91},
  {name:'Summit SUV',asset:{
    url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/mercedes_benz_g-class_w263.glb`,
    scale:12,origin:[0,.343,.79],paint:{'Material.001':[65/255,105/255,225/255]},wheelNodes:/^Circle\.00[1-4]_/,lensMaterials:{front:'Material.014',rear:'Material.013'},
    rear:{x:-16.67,y:5.65,z:5.78,width:1.3}
  },alloy:{spokes:6,rim:1.67,finish:'#7d8c94',lip:'#545f65',inner:.26,outer:.16,bolts:true},paint:['#233779','#3152b5','#4169e1','#2d49a5','#253a81'],roof:'#4169e1',
    cabin:[3.1,-12.7,-15.3,12.95],length:1.06,width:1.12,rails:true,rugged:true,blackExhaust:true}
];

export const POLICE_ASSET={
  url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/police_car.glb`,
  scale:5.25,origin:[-.435,.022,-.08],wheelNodes:/^DEF-Wheel\.(Ft|Bk)\.[LR]_/,roofLightMaterial:'roof_lights',
  front:{x:17.15,y:3.85,z:4.65,width:2.1},rear:{x:-16.72,y:4.02,z:5,width:1.85}
};

export function cycleCar(index,direction){
  return (index+direction+CARS.length)%CARS.length;
}
