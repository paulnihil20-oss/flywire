export const PARAMS=Object.freeze({DT_MS:.5,V_REST:-52,V_RESET:-52,V_THRESH:-45,TAU_MEM_MS:20,TAU_SYN_MS:5,REFRACTORY_STEPS:4,DELAY_STEPS:4,W_SYN_MV:.275,STIM_RATE_HZ:150,STIM_WEIGHT_MV:300,SYN_GAIN:3});
export const mulberry32=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
export function hashSeed(...parts){let h=2166136261;for(const part of parts){for(const c of String(part)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}}return h>>>0;}

export function buildCircuit(json){
  const n=json.neurons.id.length,counts=new Int32Array(n);
  for(const pre of json.edges.pre)counts[pre]++;
  const outStart=new Int32Array(n+1);for(let i=0;i<n;i++)outStart[i+1]=outStart[i]+counts[i];
  const next=outStart.slice(0,n),outTo=new Int32Array(json.edges.pre.length),outW=new Float32Array(outTo.length);
  for(let e=0;e<json.edges.pre.length;e++){const pre=json.edges.pre[e],at=next[pre]++;outTo[at]=json.edges.post[e];outW[at]=json.neurons.sign[pre]*json.edges.syn[e]*PARAMS.W_SYN_MV*PARAMS.SYN_GAIN;}
  return{n,outStart,outTo,outW,meta:json.meta,neurons:json.neurons,groups:json.groups};
}

export function envelope(t,shape,params={},bpm=110){
  const beat=60000/bpm;
  if(shape==='steady')return 1;
  if(shape==='pulse'){const period=Math.max(.001,(params.periodBeats||1)*beat),phase=((t+(params.phaseBeats||0)*beat)%period+period)%period/period;return phase<(params.duty??.4)?1:0;}
  if(shape==='swell'){const period=Math.max(.001,(params.periodBeats||4)*beat),phase=((t+(params.phaseBeats||0)*beat)%period+period)%period/period;return Math.sin(Math.PI*phase)**2;}
  if(shape==='burst'){const cycle=(params.pulseBeats||.18)*beat,rest=(params.restBeats||2)*beat,total=cycle*(params.pulses||3)+rest,phase=((t+(params.phaseBeats||0)*beat)%total+total)%total;return phase<cycle*(params.pulses||3)&&phase%cycle<cycle*.58?1:0;}
  if(shape==='ramp'){const cycle=(params.periodBeats||8)*beat,phase=((t+(params.phaseBeats||0)*beat)%cycle+cycle)%cycle,from=(params.fromBeats||0)*beat,to=(params.toBeats||2)*beat,hold=(params.holdBeats||3)*beat;if(phase<from||phase>hold)return 0;return Math.max(0,Math.min(1,(phase-from)/Math.max(1,to-from)));}
  return 0;
}

export function validateProgram(program,circuit){const errors=[];if(!program||!Number.isFinite(program.durationMs)||program.durationMs<=0||program.durationMs>60000)errors.push('Duration must be between 1 and 60,000 ms.');if(!Array.isArray(program?.tracks)||program.tracks.length>6)errors.push('A program needs 1 to 6 stimulus tracks.');for(const [i,t]of(program?.tracks||[]).entries()){if(!circuit.groups[t.group])errors.push(`Track ${i+1}: unknown region “${t.group}”.`);if(!['pulse','burst','ramp','swell','steady'].includes(t.shape))errors.push(`Track ${i+1}: unsupported stimulus shape.`);if(!(t.coverage>0&&t.coverage<=1))errors.push(`Track ${i+1}: coverage must be in (0, 1].`);if(!(t.intensity>0&&t.intensity<=1))errors.push(`Track ${i+1}: intensity must be in (0, 1].`);}return errors;}

function expand(program,circuit){const rng=mulberry32(program.seed>>>0);return program.tracks.map(track=>{const source=[...circuit.groups[track.group].neurons];for(let i=source.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[source[i],source[j]]=[source[j],source[i]];}return{...track,neurons:source.slice(0,Math.max(1,Math.floor(source.length*track.coverage)))};});}

export function createSimulation(circuit,program){
  const errors=validateProgram(program,circuit);if(errors.length)throw new Error(errors.join(' '));
  const tracks=expand(program,circuit),dt=PARAMS.DT_MS,steps=Math.ceil(program.durationMs/dt),n=circuit.n,rng=mulberry32(program.seed>>>0);
  const v=new Float32Array(n).fill(PARAMS.V_REST),g=new Float32Array(n),refractory=new Int8Array(n),stimulated=new Uint8Array(n),active=new Int32Array(n),awake=new Uint8Array(n),ring=Array.from({length:PARAMS.DELAY_STEPS+1},()=>new Float32Array(n)),ringIndices=Array.from({length:PARAMS.DELAY_STEPS+1},()=>[]);
  let activeCount=0,step=0,totalSpikes=0,spikeSteps=[],spikeNeurons=[],counts=new Int32Array(n),secondBins=new Uint16Array(Math.ceil(program.durationMs/1000));
  const activate=i=>{if(!awake[i]){awake[i]=1;active[activeCount++]=i;}};
  for(const track of tracks)for(const i of track.neurons){stimulated[i]=1;activate(i);}
  const addRing=slot=>{const pending=ring[slot],indices=ringIndices[slot];for(const i of indices){const amount=pending[i];if(amount!==0){g[i]+=amount;pending[i]=0;activate(i);}}indices.length=0;};
  const api={
    steps,dtMs:dt,durationMs:program.durationMs,stimulated,
    stepChunk(limit=1000){const stop=Math.min(steps,step+limit);for(;step<stop;step++){
      const slot=step%(PARAMS.DELAY_STEPS+1);addRing(slot);
      const time=step*dt;
      for(const track of tracks){const env=envelope(time,track.shape,track.params,program.bpm)*track.intensity,probability=PARAMS.STIM_RATE_HZ*env*dt/1000;if(probability<=0)continue;for(const i of track.neurons)if(rng()<probability)g[i]+=PARAMS.STIM_WEIGHT_MV;}
      // Update only neurons that are stimulated, active, or have scheduled input.
      for(let cursor=0;cursor<activeCount;){const i=active[cursor];if(refractory[i]>0){refractory[i]--;v[i]=PARAMS.V_RESET;g[i]*=1-dt/PARAMS.TAU_SYN_MS;}
        else{const oldG=g[i];v[i]+=(PARAMS.V_REST-v[i]+oldG)/PARAMS.TAU_MEM_MS*dt;g[i]=oldG*(1-dt/PARAMS.TAU_SYN_MS);if(v[i]>=PARAMS.V_THRESH){spikeSteps.push(step);spikeNeurons.push(i);counts[i]++;totalSpikes++;secondBins[Math.floor(time/1000)]++;v[i]=PARAMS.V_RESET;refractory[i]=PARAMS.REFRACTORY_STEPS;const due=(step+PARAMS.DELAY_STEPS)%(PARAMS.DELAY_STEPS+1);const queue=ring[due];for(let e=circuit.outStart[i];e<circuit.outStart[i+1];e++){const post=circuit.outTo[e];if(queue[post]===0)ringIndices[due].push(post);queue[post]+=circuit.outW[e];}}}
        if(Math.abs(g[i])<.001&&Math.abs(v[i]-PARAMS.V_REST)<.001&&refractory[i]===0){v[i]=PARAMS.V_REST;g[i]=0;awake[i]=0;active[cursor]=active[--activeCount];}else cursor++;
      }
    }return step/steps;},
    finish(){if(step<steps)throw new Error('Simulation is not complete.');let activeNeurons=0,overloadWindows=0;for(const c of counts)if(c)activeNeurons++;for(const c of secondBins)if(c>n*.6)overloadWindows++;return{steps,dtMs:dt,durationMs:program.durationMs,spikeStep:Int32Array.from(spikeSteps),spikeNeuron:Int32Array.from(spikeNeurons),counts,stimulated,totalSpikes,activeNeurons,overloadWindows};},
  };
  return api;
}

export function simulateProgram(circuit,program){const run=createSimulation(circuit,program);while(run.stepChunk(4000)<1){}return run.finish();}
