"use strict";
(async()=>{
  const cfg=window.AMPRO_CONFIG||{};
  const fallback="auth.html";
  try{
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw new Error("Authentication unavailable");
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session){location.replace(fallback+"?next=index");return}
    const {data:profile,error:profileError}=await client.from("profiles").select("full_name,role,status").eq("id",session.user.id).single();
    if(profileError||!profile||profile.status!=="active"){
      await client.auth.signOut();location.replace(fallback+"?status=pending");return
    }
    window.AMPRO_AUTH={client,session,profile};
    if(window.AMPRO_SESSION_TRACKER)await window.AMPRO_SESSION_TRACKER.ensure();
    fetch(cfg.supabaseUrl+"/functions/v1/risk-evaluate",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({newDevice:false,newCountry:false,vpn:false,tor:false,failedAttempts:0})}).catch(()=>{});
    const access=document.querySelector(".account-access");
    if(access){access.href=profile.role==="admin"?"admin.html":"#";access.innerHTML='<span class="account-shield">✓</span><span><b>'+escapeHtml(profile.full_name||session.user.email)+'</b><small>'+escapeHtml(profile.role)+' account</small></span>';if(profile.role!=="admin")access.addEventListener("click",e=>e.preventDefault())}
    const logout=document.createElement("button");logout.className="secure-logout";logout.type="button";logout.textContent="Sign out";
    logout.addEventListener("click",async()=>{logout.disabled=true;if(window.AMPRO_SESSION_TRACKER)await window.AMPRO_SESSION_TRACKER.end();await client.auth.signOut();localStorage.removeItem("ampro_complete_v2");location.replace(fallback)});
    document.querySelector(".topbar")?.appendChild(logout);
    document.documentElement.classList.remove("auth-pending");
  }catch(e){location.replace(fallback+"?error=auth")}
})();
function escapeHtml(value){return String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
