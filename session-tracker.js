"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const KEY="ampro_session_id";
  let heartbeat=null,starting=false;
  const info=async()=>{
    const ua=navigator.userAgent||"";
    const device=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"Apple mobile":/windows/i.test(ua)?"Windows PC":/macintosh|mac os x/i.test(ua)?"Mac":"Unknown device";
    const browser=/edg\//i.test(ua)?"Edge":/chrome\//i.test(ua)?"Chrome":/safari\//i.test(ua)&&!/chrome\//i.test(ua)?"Safari":/firefox\//i.test(ua)?"Firefox":"Other browser";
    const os=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iOS/iPadOS":/windows/i.test(ua)?"Windows":/mac os x|macintosh/i.test(ua)?"macOS":"Other OS";
    const raw=[navigator.platform,screen.width,screen.height,navigator.language,ua].join("|");
    const fp=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
    const hash=Array.from(new Uint8Array(fp)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,48);
    return {ua,device,browser,os,hash};
  };
  const touch=id=>client.rpc("touch_my_session",{p_session_id:id}).catch(()=>{});
  const startHeartbeat=id=>{if(heartbeat)clearInterval(heartbeat);heartbeat=setInterval(()=>touch(id),30000)};
  async function ensure(){
    if(starting)return sessionStorage.getItem(KEY);
    const current=sessionStorage.getItem(KEY);
    if(current){startHeartbeat(current);return current}
    const {data:{session}}=await client.auth.getSession();if(!session)return null;
    starting=true;
    try{
      const i=await info();
      const {data,error}=await client.rpc("start_my_session",{p_device_hash:i.hash,p_device_label:i.device,p_browser_label:i.browser,p_os_label:i.os,p_user_agent:i.ua});
      if(error)throw error;
      if(data){sessionStorage.setItem(KEY,data);startHeartbeat(data);return data}
    }catch(e){console.warn("Session audit unavailable",e?.message||e)}finally{starting=false}
    return null;
  }
  async function end(){
    const id=sessionStorage.getItem(KEY);if(heartbeat)clearInterval(heartbeat);
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
  client.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)ensure();if(event==="SIGNED_OUT")end()});
  client.auth.getSession().then(({data})=>{if(data.session)ensure()}).catch(()=>{});
  const loginForm=document.getElementById("loginForm");if(loginForm)loginForm.addEventListener("submit",()=>markIfStillSignedOut("password"),true);
  const passkey=document.getElementById("passkeyLogin");if(passkey)passkey.addEventListener("click",()=>markIfStillSignedOut("passkey"),true);
  window.AMPRO_SESSION_TRACKER={ensure,end,logFailure,key:KEY,client};
})();
