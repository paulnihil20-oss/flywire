export const LAYER_COMBOS=Object.freeze([10,25,50,100]);
export function activeLayers(combo){let layers=0;for(const threshold of LAYER_COMBOS)if(combo>=threshold)layers++;return layers;}
export function layerGains(combo){const active=activeLayers(combo);return Array.from({length:5},(_,index)=>index===0?1:index<=active?1:0);}
