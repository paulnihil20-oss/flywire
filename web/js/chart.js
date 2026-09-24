import {hashSeed,mulberry32} from './sim.js';
export const DIFFICULTIES=Object.freeze({easy:{lanes:4,targetNps:2.4,maxSimultaneous:1,minGap:2,approachMs:1350,drain:5,label:'EASY'},normal:{lanes:6,targetNps:4.3,maxSimultaneous:2,minGap:1,approachMs:1000,drain:7,label:'NORMAL'},hard:{lanes:6,targetNps:6.8,maxSimultaneous:2,minGap:1,approachMs:800,drain:9,label:'HARD'},expert:{lanes:6,targetNps:9.3,maxSimultaneous:3,minGap:1,approachMs:660,drain:12,label:'EXPERT'}});
export function generateChart({circuit,sim,songId,difficulty,bpm,durationMs,patternSeed}){
  const rules=DIFFICULTIES[difficulty];if(!rules)throw new Error(`Unknown difficulty: ${difficulty}`);
  let pool=[];for(let i=0;i<circuit.n;i++)if(sim.counts[i]>=3&&!sim.stimulated[i])pool.push(i);
  if(pool.length<40){pool=[];for(let i=0;i<circuit.n;i++)if(sim.counts[i]>0)pool.push(i);}
  // A quiet region can produce no spikes in this small demo simulation. Keep
  // its stimulated cells as the lane map so the chart can still form a rhythm.
  if(!pool.length){for(let i=0;i<circuit.n;i++)if(sim.stimulated[i])pool.push(i);}
  if(!pool.length)pool=Array.from({length:circuit.n},(_,i)=>i);
  pool.sort((a,b)=>circuit.neurons.y[a]-circuit.neurons.y[b]||circuit.neurons.x[a]-circuit.neurons.x[b]||a-b);
  const buckets=Array.from({length:rules.lanes},(_,lane)=>pool.slice(Math.floor(lane*pool.length/rules.lanes),Math.floor((lane+1)*pool.length/rules.lanes)));
  const laneInfo=buckets.map((indices,lane)=>{const types=new Map();let sx=0,sy=0;for(const i of indices){sx+=circuit.neurons.x[i];sy+=circuit.neurons.y[i];const name=circuit.neurons.cellType[i];if(name)types.set(name,(types.get(name)||0)+sim.counts[i]);}return{lane,neuronCount:indices.length,centroid:{x:sx/Math.max(1,indices.length),y:sy/Math.max(1,indices.length)},topCellTypes:[...types].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([name])=>name)};});
  const stepMs=60000/bpm/4,cells=Math.ceil(durationMs/stepMs),counts=Array.from({length:rules.lanes},()=>new Float32Array(cells)),inh=Array.from({length:rules.lanes},()=>new Float32Array(cells));
  const laneOf=new Int16Array(circuit.n).fill(-1);buckets.forEach((bucket,lane)=>bucket.forEach(i=>laneOf[i]=lane));
  for(let s=0;s<sim.spikeStep.length;s++){const i=sim.spikeNeuron[s],lane=laneOf[i];if(lane<0)continue;const cell=Math.min(cells-1,Math.floor(sim.spikeStep[s]*sim.dtMs/stepMs));counts[lane][cell]++;if(circuit.neurons.sign[i]<0)inh[lane][cell]++;}
  const laneMax=counts.map(row=>Math.max(1,...row)),candidates=[];
  for(let lane=0;lane<rules.lanes;lane++)for(let cell=0;cell<cells;cell++)if(counts[lane][cell]>0)candidates.push({lane,cell,count:counts[lane][cell],strength:counts[lane][cell]/laneMax[lane],sign:inh[lane][cell]>counts[lane][cell]/2?-1:1});
  // Enforce lane spacing in chronological order. Sorting by strength first can
  // place a late, strong spike before earlier candidates and reject nearly the
  // entire chart as if those earlier hits were too close.
  candidates.sort((a,b)=>a.cell-b.cell||b.strength-a.strength||a.lane-b.lane);
  const notes=[],last=Array(rules.lanes).fill(-999),perCell=new Int16Array(cells),target=Math.round(rules.targetNps*durationMs/1000);
  for(const candidate of candidates){if(notes.length>=target)break;if(candidate.cell-last[candidate.lane]<rules.minGap||perCell[candidate.cell]>=rules.maxSimultaneous)continue;notes.push({t:0,lane:candidate.lane,sign:candidate.sign,strength:candidate.strength,cell:candidate.cell});last[candidate.lane]=candidate.cell;perCell[candidate.cell]++;}
  // Keep a playable baseline when the small demo network is quiet. The fallback
  // follows the same tempo grid and uses the connectome-derived lane/sign data.
  if(notes.length<Math.max(8,target*.8)){
    notes.length=0;last.fill(-999);perCell.fill(0);
    const stride=cells/target,legacyPattern=patternSeed===null,rng=mulberry32((patternSeed??hashSeed(songId,difficulty))>>>0);let deck=[],previous=-1;
    for(let i=0;i<target;i++){if(!legacyPattern&&!deck.length){deck=Array.from({length:rules.lanes},(_,lane)=>lane);for(let j=deck.length-1;j>0;j--){const k=Math.floor(rng()*(j+1));[deck[j],deck[k]]=[deck[k],deck[j]];}if(deck.length>1&&deck[deck.length-1]===previous)[deck[0],deck[deck.length-1]]=[deck[deck.length-1],deck[0]];}const cell=Math.min(cells-1,Math.floor((i+.5)*stride)),lane=legacyPattern?(i+hashSeed(songId,difficulty))%rules.lanes:deck.pop();previous=lane;const activity=counts[lane][cell],sign=inh[lane][cell]>activity/2?-1:1;notes.push({t:0,lane,sign,strength:activity?Math.max(.25,activity/laneMax[lane]):.25,cell});perCell[cell]++;}
  }
  const beat=60000/bpm,leadInMs=4*beat+1000;for(const note of notes)note.t=Math.round(leadInMs+note.cell*stepMs);notes.sort((a,b)=>a.t-b.t||a.lane-b.lane);
  let chords=0;for(const count of perCell)if(count>1)chords++;let maxGapMs=0;for(let i=1;i<notes.length;i++)maxGapMs=Math.max(maxGapMs,notes[i].t-notes[i-1].t);
  return{songId,difficulty,laneCount:rules.lanes,bpm,leadInMs,durationMs,notes:notes.map(({t,lane,sign,strength})=>({t,lane,sign,strength})),laneInfo,stats:{noteCount:notes.length,notesPerSec:notes.length/(durationMs/1000),chords,maxGapMs,activeNeurons:sim.activeNeurons,totalSpikes:sim.totalSpikes}};
}
