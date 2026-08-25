"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const host=()=>document.getElementById("sessions");
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const duration=(a,b)=>{const sec=Math.max(0,Math.floor((new Date(b||Date.now())-new Date(a))/1000));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}h ${m}m`:m?`${m}m ${s}s`:`${s}s`};
  const ago=t=>{const s=Math.max(0,Math.floor((Date.now()-new Date(t))/1000));return s<60?`${s}s ago`:s<3600?`${Math.floor(s/60)}m ago`:`${Math.floor(s/3600)}h ago`};
  let busy=false;
  async function load(){if(busy)return;busy=true;try{
    const {data:{session}}=await c.auth.getSession();if(!session)return;
    const {data:me}=await c.from("profiles").select("role,status").eq("id",session.user.id).maybeSingle();if(me?.role!=="admin"||me?.status!=="active")return;
    const {data:sessions,error}=await c.from("session_activity").select("id,user_id,started_at,last_seen_at,ended_at,country_code,city,region,device_label,browser_label,os_label,vpn,tor").order("started_at",{ascending:false}).limit(100);
    if(error)throw error;
    const ids=[...new Set((sessions||[]).map(s=>s.user_id).filter(Boolean))];
    const map=new Map();if(ids.length){const {data:profiles}=await c.from("profiles").select("id,full_name,role").in("id",ids);(profiles||[]).forEach(p=>map.set(p.id,p));}
    const el=host();if(!el)return;
    el.innerHTML=(sessions||[]).length?(sessions||[]).map(s=>{const p=map.get(s.user_id)||{},live=!s.ended_at&&Date.now()-new Date(s.last_seen_at).getTime()<180000,loc=[s.city,s.region,s.country_code].filter(Boolean).join(", ")||"Location unavailable",net=s.tor?"TOR":s.vpn?"VPN":"Direct/unknown";return `<div class="row"><div><strong>${esc(p.full_name||"Unknown member")} • ${esc(String(p.role||"member").toUpperCase())}${live?' • LIVE':''}</strong><small>Login: ${new Date(s.started_at).toLocaleString()} • Last activity: ${ago(s.last_seen_at)} • Session duration: ${duration(s.started_at,s.ended_at||Date.now())}</small><small>${esc([s.device_label,s.browser_label,s.os_label].filter(Boolean).join(" • ")||"Device information unavailable")} • ${esc(loc)} • ${esc(net)}${s.ended_at?` • Logout: ${new Date(s.ended_at).toLocaleString()}`:""}</small></div></div>`}).join(""):'<div class="row"><small>No session telemetry yet.</small></div>';
  }catch(e){const el=host();if(el)el.innerHTML=`<div class="row"><small>Session display unavailable: ${esc(e?.message||"Unknown error")}</small></div>`}finally{busy=false}}
  const start=()=>{load();setInterval(load,5000);document.getElementById("refresh")?.addEventListener("click",()=>setTimeout(load,200));};
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
})();