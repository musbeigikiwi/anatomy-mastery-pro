"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let adminSessionId=null,beat=null,running=false;
  const $=id=>document.getElementById(id);

  async function deviceInfo(){
    const ua=navigator.userAgent||"";
    const device=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"Apple mobile":/windows/i.test(ua)?"Windows PC":/macintosh|mac os x/i.test(ua)?"Mac":"Unknown device";
    const browser=/edg\//i.test(ua)?"Edge":/chrome\//i.test(ua)?"Chrome":/safari\//i.test(ua)&&!/chrome\//i.test(ua)?"Safari":/firefox\//i.test(ua)?"Firefox":"Other browser";
    const os=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iOS/iPadOS":/windows/i.test(ua)?"Windows":/macintosh|mac os x/i.test(ua)?"macOS":"Other OS";
    const raw=[navigator.platform,screen.width,screen.height,navigator.language,ua].join("|");
    const fp=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
    const hash=Array.from(new Uint8Array(fp)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,48);
    return {ua,device,browser,os,hash};
  }

  async function verifyAdmin(){
    const {data:{session},error}=await c.auth.getSession();
    if(error||!session)return null;
    const {data:p,error:pe}=await c.from("profiles").select("role,status").eq("id",session.user.id).single();
    if(pe||p?.role!=="admin"||p?.status!=="active")return null;
    return session;
  }

  async function startFreshAdminSession(){
    const session=await verifyAdmin();
    if(!session)return;
    const i=await deviceInfo();
    const {data,error}=await c.rpc("start_my_session",{p_device_hash:i.hash,p_device_label:i.device,p_browser_label:i.browser,p_os_label:i.os,p_user_agent:i.ua});
    if(error){console.warn("Admin live session start failed",error.message);return;}
    adminSessionId=data||null;
    if(adminSessionId){
      sessionStorage.setItem("ampro_admin_session",adminSessionId);
      await c.rpc("touch_my_session",{p_session_id:adminSessionId});
      if(beat)clearInterval(beat);
      beat=setInterval(()=>{if(adminSessionId)c.rpc("touch_my_session",{p_session_id:adminSessionId})},30000);
    }
  }

  async function refreshLive(){
    if(running)return;running=true;
    try{
      const since=new Date(Date.now()-180000).toISOString();
      const {data,error}=await c.from("session_activity").select("user_id,last_seen_at,ended_at").is("ended_at",null).gte("last_seen_at",since).limit(5000);
      if(error){
        if($("activeCount"))$("activeCount").textContent="—";
        if($("onlineHealthNote"))$("onlineHealthNote").textContent="Online query failed: "+error.message;
        return;
      }
      const count=new Set((data||[]).map(r=>r.user_id).filter(Boolean)).size;
      if($("activeCount"))$("activeCount").textContent=String(count);
      if($("healthSessions")){$("healthSessions").textContent=count?count+" online now":"No live heartbeat";$("healthSessions").className="health-state "+(count?"good":"warn")}
      if($("onlineHealthNote"))$("onlineHealthNote").textContent=count?"Unique users with activity in the last 3 minutes are online.":"No active session heartbeat has been recorded in the last 3 minutes.";
    }finally{running=false}
  }

  async function boot(){
    // A stale sessionStorage id was the main cause of an admin appearing offline.
    sessionStorage.removeItem("ampro_admin_session");
    await startFreshAdminSession();
    await refreshLive();
    setInterval(refreshLive,10000);
    document.getElementById("refresh")?.addEventListener("click",()=>setTimeout(refreshLive,200));
  }

  window.addEventListener("pagehide",()=>{if(adminSessionId)c.rpc("touch_my_session",{p_session_id:adminSessionId})});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
