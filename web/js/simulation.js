import {buildCircuit,createSimulation} from './sim.js';

let worker=null,nextId=1;
function getWorker(){if(worker)return worker;try{worker=new Worker(new URL('./sim.worker.js',import.meta.url),{type:'module'});}catch{return null;}return worker;}
function abortError(){return new DOMException('Simulation cancelled.','AbortError');}
function report(onProgress,fraction){try{onProgress(fraction);}catch{}}

export function runSimulation(circuitJson,program,onProgress=()=>{},{signal}={}){
  if(signal?.aborted)return Promise.reject(abortError());
  const current=getWorker();
  return current?runOnWorker(current,circuitJson,program,onProgress,signal):runFallback(circuitJson,program,onProgress,signal);
}

function runOnWorker(current,circuitJson,program,onProgress,signal){
  const requestId=nextId++;
  return new Promise((resolve,reject)=>{
    let settled=false,timer;
    const cleanup=()=>{clearTimeout(timer);current.removeEventListener('message',onMessage);current.removeEventListener('error',onError);signal?.removeEventListener('abort',onAbort);};
    const onAbort=()=>{if(settled)return;settled=true;cleanup();try{current.postMessage({type:'cancel',requestId});}catch{}reject(abortError());};
    const failover=()=>{if(settled)return;if(signal?.aborted){onAbort();return;}settled=true;cleanup();current.terminate();if(worker===current)worker=null;runFallback(circuitJson,program,onProgress,signal).then(resolve,reject);};
    const onError=()=>failover();
    const onMessage=event=>{if(event.data.requestId!==requestId)return;const message=event.data;if(message.type==='progress')report(onProgress,message.fraction);if(message.type==='done'||message.type==='error'){if(settled)return;settled=true;cleanup();message.type==='done'?resolve(message.result):reject(new Error(message.message||'Simulation failed.'));}};
    current.addEventListener('message',onMessage);current.addEventListener('error',onError,{once:true});signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(failover,30000);
    try{current.postMessage({circuitJson,program,requestId});}catch{failover();}
  });
}

async function runFallback(circuitJson,program,onProgress,signal){
  const sim=createSimulation(buildCircuit(circuitJson),program);let fraction=0;
  while(fraction<1){if(signal?.aborted)throw abortError();fraction=sim.stepChunk(500);report(onProgress,fraction);await new Promise(resolve=>setTimeout(resolve,0));}
  if(signal?.aborted)throw abortError();return sim.finish();
}
