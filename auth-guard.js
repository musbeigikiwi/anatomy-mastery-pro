"use strict";
(async()=>{
  const cfg=window.AMPRO_CONFIG||{};
  const fallback="auth.html";
  let tracker=null,heartbeat=null;
  try{
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey) throw new Error("Authentication unavailable");
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session){location.replace(fallback+"?next=index");return}
    const {data:profile,error:profileError}=await client.from("profiles").select("full_name,role,status").eq("id",session.user.id).single();
    if(profileError||!profile||profile.status!=="active"){
      await client.auth.signOut();location.replace(fallback+"?status=pending");return
    }
    window.AMPRO_AUTH={client,session,profile};
    const ua=navigator.userAgent||"";
    const device=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"Apple mobile":/windows/i.test(ua)?"Windows PC":/macintosh|mac os x/i.test(ua)?"Mac":"Unknown device";
    const browser=/edg\//i.test(ua)?"Edge":/chrome\//i.test(ua)?"Chrome":/safari\//i.test(ua)&&!/chrome\//i.test(ua)?"Safari":/firefox\//i.test(ua)?"Firefox":"Other browser";
    const os=/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iOS/iPadOS":/windows/i.test(ua)?"Windows":/mac os x|macintosh/i.test(ua)?"macOS":"Other OS";
    const fp=await crypto.subtle.digest("SHA-256",new TextEncoder().encode([navigator.platform,screen.width,screen.height,navigator.language,ua].join("|")));
    const deviceHash=Array.from(new Uint8Array(fp)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,48);
    const {data:sid,error:sidErr}=await client.rpc("start_my_session",{p_device_hash:deviceHash,p_device_label:device,p_browser_label:browser,p_os_label:os,p_user_agent:ua});
    if(!sidErr&&sid){tracker=sid;heartbeat=setInterval(()=>client.rpc("touch_my_session",{p_session_id:tracker}),60000)}
    fetch(cfg.supabaseUrl+"/functions/v1/risk-evaluate",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({deviceHash,newDevice:false,newCountry:false,vpn:false,tor:false,failedAttempts:0})}).catch(()=>{});
    const access=document.querySelector(".account-access");
    if(access){access.href=profile.role==="admin"?"admin.html":"#";access.innerHTML='<span class="account-shield">✓</span><span><b>'+escapeHtml(profile.full_name||session.user.email)+'</b><small>'+escapeHtml(profile.role)+' account</small></span>';if(profile.role!=="admin")access.addEventListener("click",e=>e.preventDefault())}
    const logout=document.createElement("button");logout.className="secure-logout";logout.type="button";logout.textContent="Sign out";
    logout.addEventListener("click",async()=>{logout.disabled=true;if(heartbeat)clearInterval(heartbeat);if(tracker)await client.rpc("end_my_session",{p_session_id:tracker});await client.auth.signOut();localStorage.removeItem("ampro_complete_v2");location.replace(fallback)});
    document.querySelector(".topbar")?.appendChild(logout);
    window.addEventListener("pagehide",()=>{if(tracker)client.rpc("touch_my_session",{p_session_id:tracker})});
    document.documentElement.classList.remove("auth-pending");
  }catch(e){location.replace(fallback+"?error=auth")}
})();
function escapeHtml(value){return String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
