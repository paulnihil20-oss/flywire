import {hashSeed} from './sim.js';

const PREFIX='NB1',MISS=32767,DIFFICULTIES=new Set(['easy','normal','hard','expert']);
function toBase64Url(text){const bytes=new TextEncoder().encode(text);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromBase64Url(text){const binary=atob(text.replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));}

export function encodeReplay({songId,difficulty,outcomes}){
  if(!songId||!DIFFICULTIES.has(difficulty)||!Array.isArray(outcomes)||outcomes.length<1||outcomes.length>750)throw new Error('This run cannot be shared.');
  const payload={v:1,songId,difficulty,outcomes:outcomes.map(value=>value===null?MISS:Math.max(-150,Math.min(150,Math.round(value))))};
  const body=toBase64Url(JSON.stringify(payload));
  return `${PREFIX}.${body}.${hashSeed(body,PREFIX).toString(36)}`;
}

export function decodeReplay(code){
  const match=String(code||'').trim().match(/^NB1\.([A-Za-z0-9_-]+)\.([a-z0-9]+)$/);
  if(!match||match[1].length>12000||hashSeed(match[1],PREFIX).toString(36)!==match[2])throw new Error('That race code is invalid or incomplete.');
  let payload;try{payload=JSON.parse(fromBase64Url(match[1]));}catch{throw new Error('That race code could not be read.');}
  if(payload?.v!==1||typeof payload.songId!=='string'||payload.songId.length>80||!DIFFICULTIES.has(payload.difficulty)||!Array.isArray(payload.outcomes)||payload.outcomes.length<1||payload.outcomes.length>750||payload.outcomes.some(n=>n!==MISS&&(!Number.isInteger(n)||n < -150||n > 150)))throw new Error('That race code is not a supported replay.');
  return{...payload,outcomes:payload.outcomes.map(n=>n===MISS?null:n)};
}

export function captureOutcomes(engine){return engine.notes.map(note=>note.judged&&note.kind!=='miss'?Math.max(-150,Math.min(150,Math.round(note.error))):null);}

export function createGhost(chart,outcomes,label='RIVAL'){
  if(!Array.isArray(outcomes)||outcomes.length!==chart.notes.length)throw new Error('This replay was made for a different chart version.');
  const raw=chart.notes.map((note,index)=>{const error=outcomes[index];if(error===null)return{at:note.t+150,kind:null};const abs=Math.abs(error);return{at:note.t+error,kind:abs<=45?'perfect':abs<=90?'great':'good'};}).sort((a,b)=>a.at-b.at);
  let score=0,combo=0;const events=raw.map(event=>{if(!event.kind){combo=0;return{...event,score,combo,hit:false};}combo++;score+=({perfect:300,great:200,good:100}[event.kind])*Math.min(4,1+Math.floor((combo-1)/10));return{...event,score,combo,hit:true};});
  return{events,index:0,score:0,totalScore:score,combo:0,label,outcomes};
}
