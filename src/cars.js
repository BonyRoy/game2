const carFiles=`${import.meta.env?.BASE_URL??'/'}3js%20/cars/`;
const paintFinish=(tint,gloss)=>({tint,gloss,solid:true});
const rapidRed=paintFinish([.97,.055,.045],.08);
const virtusWhite=paintFinish([.97,.97,.96],.55);

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
    cabin:[3.1,-12.7,-15.3,12.95],length:1.06,width:1.12,rails:true,rugged:true,blackExhaust:true},
  {name:'Bloodstone Hatch',length:.94,width:1.03,beltLift:.65,
    paint:['#550b15','#850e22','#ad172d','#720b19','#5d0b15'],roof:'#99172a',cabin:[2.6,-10.5,-14.4,11.9],
    alloy:{spokes:5,split:true,rim:1.60,finish:'#aaaeb0',lip:'#c4c9cc',inner:.28,outer:.08},
    asset:{url:`${carFiles}2022_suzuki_baleno.glb`,onDemand:true,keepIndices:true,scale:.197,origin:[39.107,0,-79.905],
      paint:{M_2022_Suzuki_Baleno_Nexa_Blue:paintFinish([.60,.045,.10],.68)},
      front:{x:13.9,y:5.5,z:5.5,width:2.4},rear:{x:-14.1,y:7.7,z:5.2,width:2.4}}},
  {name:'Smokecrest Hatch',length:.94,width:1.02,beltLift:.55,
    paint:['#353944','#545a64','#777e87','#494e57','#3c4048'],roof:'#68707a',cabin:[2.1,-11.1,-14.8,11.3],
    alloy:{spokes:6,rim:1.58,finish:'#898f99',lip:'#b9c0c5',inner:.25,outer:.10},
    asset:{url:`${carFiles}hyundai_i20_2016.glb`,onDemand:true,keepIndices:true,scale:27.6,origin:[-.002,0,.0302],
      paint:{Material:{texture:`${carFiles}i20-smoke-gray.jpg`,gloss:.24}},
      front:{x:13.9,y:5.2,z:5.5,width:2.5},rear:{x:-14.4,y:6,z:5.2,width:2.3}}},
  {name:'Obsidian Saloon',length:1.05,width:1.03,beltLift:.3,gloss:1.3,
    paint:['#101014','#17181d','#24262a','#141519','#111216'],roof:'#202127',cabin:[2.1,-7.1,-11.5,10.8],
    alloy:{spokes:10,rim:1.64,finish:'#afb4bd',lip:'#d1d6da',inner:.16,outer:.075},
    asset:{url:`${carFiles}2021_suzuki_ciaz.glb`,onDemand:true,keepIndices:true,scale:7.8,reverse:true,origin:[0,-.0035,.0243],
      paint:{primary:paintFinish([.035,.039,.045],.96)},
      front:{x:15.4,y:5.6,z:6.1,width:2.3},rear:{x:-16.5,y:7.2,z:6,width:2.4}}},
  {name:'Ivory GT',length:1.06,width:1.03,beltLift:.35,
    paint:['#aeb4b4','#d9dddb','#fdfdf7','#d1d5d3','#b9c0c0'],roof:'#f5f6f0',cabin:[2.6,-7.3,-11.3,10.5],
    alloy:{spokes:5,split:true,rim:1.66,finish:'#575b61',lip:'#7b838b',inner:.25,outer:.09},
    asset:{url:`${carFiles}2022_volkswagen_virtus_gt.glb`,onDemand:true,keepIndices:true,scale:6.7,reverse:true,origin:[-.004,-.0005,.0004],
      paint:{primary:virtusWhite,'primary.001':virtusWhite},
      front:{x:15.4,y:5.8,z:5.6,width:2.6},rear:{x:-16,y:6.8,z:5.9,width:2.5}}},
  {name:'Signal Sprint',length:1.02,width:1.01,beltLift:.2,gloss:.13,
    paint:['#a31c22','#e5252b','#fa343a','#cc2026','#b81d23'],roof:'#f02d32',cabin:[2.1,-7.7,-11.9,10.9],
    alloy:{spokes:5,rim:1.62,finish:'#73797d',lip:'#afb5b7',inner:.29,outer:.10},
    asset:{url:`${carFiles}2020_skoda_rapid.glb`,onDemand:true,keepIndices:true,scale:318,origin:[0,.00103,.000052],
      paint:{carpaint:rapidRed,black_paint:rapidRed},
      front:{x:15.1,y:5.45,z:5.3,width:2.5},rear:{x:-15.8,y:5.9,z:5.7,width:2.4}}}
];

export const POLICE_ASSET={
  url:`${import.meta.env?.BASE_URL??'/'}3js%20/cars/police_car.glb`,
  scale:5.25,origin:[-.435,.022,-.08],wheelNodes:/^DEF-Wheel\.(Ft|Bk)\.[LR]_/,roofLightMaterial:'roof_lights',
  front:{x:17.15,y:3.85,z:4.65,width:2.1},rear:{x:-16.72,y:4.02,z:5,width:1.85}
};

export function cycleCar(index,direction){
  return (index+direction+CARS.length)%CARS.length;
}
