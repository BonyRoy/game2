const folder=`${import.meta.env?.BASE_URL??'/'}3js%20/scenery/`;

export const sceneryFiles={
  palm:'tropical_palm_tree',
  broadleaf:'realistic_hd_dwarf_red_horse_chestnut_920',
  pine:'pine_tree_-_ps1_low_poly',
  streetlight:'nyc_park_streetlight',
  bench:'wooden_bench',
  planter:'free__small_succulent_in_planter',
  flower:'garden_flower_-_vegetation',
  shrub:'cliff_shrub_for_terrain',
  grass:'tuft_of_grass'
};

export function sceneryAssetConfig(kind,file){
  return {url:folder+file+'.glb',scale:1,normalize:true,groundAnchor:kind==='palm'};
}
