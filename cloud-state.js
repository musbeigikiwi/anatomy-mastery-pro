"use strict";
(()=>{
 const STORE="ampro_complete_v2", TASKSTORE="ampro_tasks_v1", META="ampro_cloud_meta_v1";
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 let client=null,userId=null,lastPayload="",syncing=false,hydrated=false;
 let resolveReady;
 const ready=new Promise(r=>{resolveReady=r});
 const parse=k=>{try{return JSON.parse(localStorage.getItem(k)||"{}")||{}}catch{return {}}};
 const payload=()=>({app_state:parse(STORE),task_state:parse(TASKSTORE)});
 const hasLocalState=()=>{try{const raw=localStorage.getItem(STORE);if(!raw)return false;const s=JSON.parse(raw)||{};return Object.keys(s).length>0}catch{return false}};
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
       lastPayload=JSON.stringify(local); hydrated=true; return;
     }
     const meta=(()=>{try{return JSON.parse(localStorage.getItem(META)||"{}")||{}}catch{return {}}})();
     const localMissing=!hasLocalState();
     const cloudNewer=!meta.updated_at||meta.user_id!==userId||new Date(data.updated_at).getTime()>new Date(meta.updated_at||0).getTime();
     if(cloudNewer||localMissing){
       localStorage.setItem(STORE,JSON.stringify(data.app_state||{}));
       localStorage.setItem(TASKSTORE,JSON.stringify(data.task_state||{}));
       localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:data.updated_at}));
     }
     lastPayload=JSON.stringify(payload()); hydrated=true;
   }catch(e){console.warn("Cloud state restore unavailable",e?.message||e)}
   finally{resolveReady?.();resolveReady=null}
 }
 async function syncNow(){
   if(!hydrated||syncing||!client||!userId)return;
   const p=payload(),raw=JSON.stringify(p); if(raw===lastPayload)return;
   syncing=true;
   try{
     const now=new Date().toISOString();
     const {error}=await client.from("user_learning_state").upsert({user_id:userId,...p,updated_at:now},{onConflict:"user_id"});
     if(!error){lastPayload=raw;localStorage.setItem(META,JSON.stringify({user_id:userId,updated_at:now}))}
   }finally{syncing=false}
 }
 window.AMPRO_CLOUD_STATE={syncNow,ready,isHydrated:()=>hydrated};
 hydrate();
 setInterval(syncNow,4000);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)syncNow()});
 window.addEventListener("pagehide",syncNow);
})();