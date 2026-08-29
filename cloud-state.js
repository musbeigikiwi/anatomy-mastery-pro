"use strict";
(()=>{
 const STORE="ampro_complete_v2", TASKSTORE="ampro_tasks_v1", META="ampro_cloud_meta_v1";
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 let client=null,userId=null,lastPayload="",syncing=false,hydrated=false;
 let resolveReady;
 const ready=new Promise(r=>{resolveReady=r});
 const parse=k=>{try{return JSON.parse(localStorage.getItem(k)||"{}")||{}}catch{return {}}};
 const payload=()=>({app_state:parse(STORE),task_state:parse(TASKSTORE)});
 const num=v=>Math.max(0,Number(v)||0);
 function mergeApp(local={},cloud={}){
   const localTotal=num(local.totalSec), cloudTotal=num(cloud.totalSec);
   const base=cloudTotal>=localTotal?{...local,...cloud}:{...cloud,...local};
   base.totalSec=Math.max(localTotal,cloudTotal);
   const lt=String(local.todayKey||""), ct=String(cloud.todayKey||"");
   if(lt&&ct&&lt===ct){base.todayKey=lt;base.todaySec=Math.max(num(local.todaySec),num(cloud.todaySec));}
   else if(ct&&!lt){base.todayKey=ct;base.todaySec=num(cloud.todaySec);}
   else if(lt&&!ct){base.todayKey=lt;base.todaySec=num(local.todaySec);}
   else if(lt&&ct){const useCloud=ct>lt;base.todayKey=useCloud?ct:lt;base.todaySec=useCloud?num(cloud.todaySec):num(local.todaySec);}
   base.answered=Math.max(num(local.answered),num(cloud.answered));
   base.correct=Math.max(num(local.correct),num(cloud.correct));
   if(Array.isArray(cloud.mistakes)&&(!Array.isArray(local.mistakes)||cloud.mistakes.length>local.mistakes.length))base.mistakes=cloud.mistakes;
   return base;
 }
 async function getAuth(){for(let i=0;i<120;i++){if(window.AMPRO_AUTH?.client&&window.AMPRO_AUTH?.session?.user?.id){client=window.AMPRO_AUTH.client;userId=window.AMPRO_AUTH.session.user.id;return}await sleep(100)}throw new Error("auth_not_ready")}
 async function hydrate(){
   try{
     await getAuth();
     const {data,error}=await client.from("user_learning_state").select("app_state,task_state,updated_at").eq("user_id",userId).maybeSingle();
     if(error) throw error;
     const local=payload();
     if(!data){
       const now=new Date().toISOString();
       const {error:upErr}=await client.from("user_learning_state").upsert({user_id:userId,...local,updated_at:now},{onConflict:"user_id"});
       if(upErr) throw upErr;
       localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:now}));
       lastPayload=JSON.stringify(local);hydrated=true;return;
     }
     const merged={app_state:mergeApp(local.app_state||{},data.app_state||{}),task_state:Object.keys(data.task_state||{}).length?data.task_state:(local.task_state||{})};
     localStorage.setItem(STORE,JSON.stringify(merged.app_state));
     localStorage.setItem(TASKSTORE,JSON.stringify(merged.task_state));
     localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:data.updated_at}));
     lastPayload=JSON.stringify(merged);hydrated=true;
     const now=new Date().toISOString();
     const {error:mergeErr}=await client.from("user_learning_state").upsert({user_id:userId,...merged,updated_at:now},{onConflict:"user_id"});
     if(!mergeErr){localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:now}));lastPayload=JSON.stringify(merged)}
   }catch(e){console.warn("Cloud state restore unavailable",e?.message||e)}
   finally{resolveReady?.();resolveReady=null}
 }
 async function syncNow(){
   if(!hydrated||syncing||!client||!userId)return;
   const p=payload(),raw=JSON.stringify(p);if(raw===lastPayload)return;
   syncing=true;
   try{
     const {data}=await client.from("user_learning_state").select("app_state,task_state").eq("user_id",userId).maybeSingle();
     const safe={app_state:mergeApp(p.app_state||{},data?.app_state||{}),task_state:p.task_state||{}};
     localStorage.setItem(STORE,JSON.stringify(safe.app_state));
     const now=new Date().toISOString();
     const {error}=await client.from("user_learning_state").upsert({user_id:userId,...safe,updated_at:now},{onConflict:"user_id"});
     if(!error){lastPayload=JSON.stringify(safe);localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:now}))}
   }finally{syncing=false}
 }
 window.AMPRO_CLOUD_STATE={syncNow,ready,isHydrated:()=>hydrated};
 hydrate();
 setInterval(syncNow,4000);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)syncNow()});
 window.addEventListener("pagehide",syncNow);
})();