const KEY='neuron-beat.profile.v1';
export const DEFAULT_PROFILE=Object.freeze({xp:0,level:1,stars:{},cleared:{},pbCurves:{},atlas:{discovered:[]},achievements:[],streak:{lastDate:'',count:0},lifetime:{spikes:0,songs:0,notes:0,bestCombo:0,perfectRuns:0},failsInARow:{},judgeMode:false,seenIntro:false,seenTutorial:false,settings:{volume:65,reduceMotion:false,haptics:true,assist:false,offset:0},bestScore:0});
const memory=new Map();
export const storage={get(key=KEY){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return memory.get(key)||null;}},set(value,key=KEY){memory.set(key,value);try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
export function loadProfile(){const saved=storage.get()||{},p={...DEFAULT_PROFILE,...saved};p.atlas={...DEFAULT_PROFILE.atlas,...saved.atlas};p.lifetime={...DEFAULT_PROFILE.lifetime,...saved.lifetime};p.settings={...DEFAULT_PROFILE.settings,...saved.settings};p.stars=saved.stars||{};p.cleared=saved.cleared||{};p.pbCurves=saved.pbCurves||{};p.failsInARow=saved.failsInARow||{};p.achievements=saved.achievements||[];return p;}
export function saveProfile(profile){storage.set(profile);}
