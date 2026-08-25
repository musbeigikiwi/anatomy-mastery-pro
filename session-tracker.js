"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const KEY="ampro_session_id";
  let heartbeat=null,starting=false,lastRisk=null,riskTick=0;

  const info=async()=>{
    const ua=navigator.userAgent||"";
    const device=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"Apple mobile":/windows/i.test(ua)?"Windows PC":/macintosh|mac os x/i.test(ua)?"Mac":"Unknown device";
    const browser=/edg\//i.test(ua)?"Edge":/chrome\//i.test(ua)?"Chrome":/safari\//i.test(ua)&&!/chrome\//i.test(ua)?"Safari":/firefox\//i.test(ua)?"Firefox":"Other browser";
    const version=(ua.match(/(?:Edg|Chrome|Firefox)\/(\d+)/i)||ua.match(/Version\/(\d+).*Safari/i)||[])[1]||"unknown";
    const os=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iOS/iPadOS":/windows/i.test(ua)?"Windows":/mac os x|macintosh/i.test(ua)?"macOS":"Other OS";
    const legacyBrowser=/MSIE|Trident\//i.test(ua);
    const raw=[navigator.platform,screen.width,screen.height,navigator.language,ua].join("|");
    const fp=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
    const hash=Array.from(new Uint8Array(fp)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,48);
    return {ua,device,browser,version,os,legacyBrowser,hash};
  };

  const touch=id=>client.rpc("touch_my_session",{p_session_id:id}).catch(()=>{});

  async function resolveRole(roleHint){
    if(roleHint)return roleHint;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session)return null;
      const {data}=await client.from("profiles").select("role").eq("id",session.user.id).single();
      return data?.role||null;
    }catch{return null}
  }

  async function blockAccess(id,reason){
    if(heartbeat)clearInterval(heartbeat);
    try{if(id)await client.rpc("end_my_session",{p_session_id:id})}catch{}
    sessionStorage.removeItem(KEY);
    try{await client.auth.signOut()}catch{}
    const r=encodeURIComponent(reason||"network_policy");
    location.replace("auth.html?blocked="+r);
  }

  // Account approval is already enforced by auth-guard. The risk tracker only
  // performs network/browser enforcement, preventing false blocks caused by a
  // duplicate profile lookup inside the Edge Function.
  const explicitBlockReasons=new Set(["outside_new_zealand","vpn_not_allowed","proxy_not_allowed","tor_not_allowed","unsafe_browser_context"]);

  async function runRisk(id,i,roleHint){
    const role=await resolveRole(roleHint);
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session)return null;
      const payload={sessionId:id,deviceHash:i.hash,newDevice:false,newCountry:false,secureContext:window.isSecureContext,legacyBrowser:i.legacyBrowser,webdriver:!!navigator.webdriver,browserName:i.browser,browserVersion:i.version};
      const {data,error}=await client.functions.invoke("risk-evaluate",{body:payload,headers:{Authorization:"Bearer "+session.access_token}});
      if(error){
        let detail=null;
        try{if(error.context&&typeof error.context.json==="function")detail=await error.context.json()}catch{}
        const reason=detail?.reason||detail?.blockReason||detail?.error||"security_check_unavailable";
        lastRisk={allowed:true,decision:"allow",reason:"risk_service_degraded",detail:reason};
        if(role!=="admin"&&explicitBlockReasons.has(reason))await blockAccess(id,reason);
        else console.warn("Risk service unavailable; verified account remains signed in",reason);
        return lastRisk;
      }
      const result=data||{};
      lastRisk=result;
      const reason=result.reason||result.blockReason||"network_policy";
      if((result?.decision==="block"||result?.allowed===false)&&role!=="admin"&&explicitBlockReasons.has(reason))await blockAccess(id,reason);
      return result;
    }catch(e){
      console.warn("Network security check unavailable",e?.message||e);
      lastRisk={allowed:true,decision:"allow",reason:"risk_service_degraded"};
      return lastRisk;
    }
  }

  const startHeartbeat=(id,i,roleHint)=>{
    if(heartbeat)clearInterval(heartbeat);
    riskTick=0;
    heartbeat=setInterval(async()=>{
      await touch(id);
      riskTick++;
      if(riskTick%4===0)await runRisk(id,i,roleHint);
    },30000);
  };

  async function ensure(roleHint){
    if(starting)return sessionStorage.getItem(KEY);
    const {data:{session}}=await client.auth.getSession();
    if(!session)return null;
    starting=true;
    try{
      const i=await info();
      let id=sessionStorage.getItem(KEY);
      if(!id){
        const {data,error}=await client.rpc("start_my_session",{p_device_hash:i.hash,p_device_label:i.device,p_browser_label:i.browser,p_os_label:i.os,p_user_agent:i.ua});
        if(error)throw error;
        id=data||null;
        if(id)sessionStorage.setItem(KEY,id);
      }
      if(id){
        startHeartbeat(id,i,roleHint);
        await runRisk(id,i,roleHint);
      }
      return id;
    }catch(e){
      console.warn("Session audit unavailable",e?.message||e);
      return null;
    }finally{starting=false}
    return null;
  }

  async function end(){
    const id=sessionStorage.getItem(KEY);
    if(heartbeat)clearInterval(heartbeat);
    if(id){try{await client.rpc("end_my_session",{p_session_id:id})}catch{}}
    sessionStorage.removeItem(KEY);
  }

  async function logFailure(method="password"){
    try{const i=await info();await client.rpc("log_login_failure",{p_device_label:i.device,p_browser_label:i.browser,p_os_label:i.os,p_user_agent:i.ua,p_method:method})}catch{}
  }

  async function markIfStillSignedOut(method){
    await new Promise(r=>setTimeout(r,1800));
    const {data:{session}}=await client.auth.getSession();
    if(!session)logFailure(method);
  }

  const onProtectedPage=()=>!/(^|\/)auth\.html$/i.test(location.pathname);
  if(onProtectedPage()){
    client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)ensure();if(event==="SIGNED_OUT")end()});
    client.auth.getSession().then(({data})=>{if(data.session)ensure()}).catch(()=>{});
  }
  const loginForm=document.getElementById("loginForm");if(loginForm)loginForm.addEventListener("submit",()=>markIfStillSignedOut("password"),true);
  const passkey=document.getElementById("passkeyLogin");if(passkey)passkey.addEventListener("click",()=>markIfStillSignedOut("passkey"),true);
  window.AMPRO_SESSION_TRACKER={ensure,end,logFailure,key:KEY,client,getLastRisk:()=>lastRisk};
})();
