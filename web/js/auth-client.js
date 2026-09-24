import {SUPABASE_URL,SUPABASE_ANON_KEY} from './backend-config.js';

const SESSION_KEY='neuron-beat-online-session-v1';
let session=null;
const configReady=()=>{try{return new URL(SUPABASE_URL).protocol==='https:'&&(/^eyJ|^sb_publishable_/.test(SUPABASE_ANON_KEY));}catch{return false;}};
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function saveSession(next){session=next;if(next)localStorage.setItem(SESSION_KEY,JSON.stringify(next));else localStorage.removeItem(SESSION_KEY);}
async function request(path,{method='GET',body,token,prefer}={}){
  if(!configReady())throw new Error('Online accounts are not configured yet.');
  const response=await fetch(`${SUPABASE_URL}${path}`,{method,headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${token||session?.access_token||SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.msg||data.message||data.error_description||data.error||`Online service error (${response.status}).`);return data;
}
async function ensureSession(){if(!session)session=readSession();if(!session)return null;if((session.expires_at||0)<Date.now()/1000+45){if(!session.refresh_token){saveSession(null);return null;}try{saveSession(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},token:SUPABASE_ANON_KEY}));}catch{saveSession(null);return null;}}return session;}

export const onlineReady=configReady;
export function currentUser(){return session?.user||readSession()?.user||null;}
export async function initializeAuth(){if(!configReady())return null;await ensureSession();return currentUser();}
export async function signUp({email,password,displayName}){const data=await request('/auth/v1/signup',{method:'POST',body:{email,password,data:{display_name:displayName}} ,token:SUPABASE_ANON_KEY});if(data.access_token)saveSession(data);return data;}
export async function signIn({email,password}){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},token:SUPABASE_ANON_KEY});saveSession(data);return data;}
export async function signOut(){const old=await ensureSession();if(old?.access_token)try{await request('/auth/v1/logout',{method:'POST'});}finally{saveSession(null);}else saveSession(null);}
export async function submitScore({songId,difficulty,score,accuracy,maxCombo,seed}){await ensureSession();if(!session?.access_token)throw new Error('Sign in to add your score to the global standings.');return request('/rest/v1/rpc/submit_neuron_beat_score',{method:'POST',body:{p_song_id:songId,p_difficulty:difficulty,p_score:Math.round(score),p_accuracy:Number(accuracy.toFixed(2)),p_max_combo:maxCombo,p_pattern_seed:seed},prefer:'return=minimal'});}
export async function fetchLeaderboard({songId,difficulty}){await ensureSession();const q=new URLSearchParams({select:'score,accuracy,max_combo,updated_at,profiles!scores_user_id_fkey(display_name)',game_level:`eq.${songId}`,difficulty:`eq.${difficulty}`,order:'score.desc,accuracy.desc,max_combo.desc,updated_at.asc',limit:'10'});return request(`/rest/v1/scores?${q}`,{token:session?.access_token||SUPABASE_ANON_KEY});}
