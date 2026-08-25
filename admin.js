"use strict";
const cfg=window.AMPRO_CONFIG||{},ok=cfg.supabaseUrl&&!cfg.supabaseUrl.includes("YOUR_PROJECT");
const c=ok&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null,$=x=>document.getElementById(x);
function deny(msg){$("blocked").classList.add("show");$("blocked").querySelector("p").textContent=msg;$("console").hidden=true}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function ago(t){const s=Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/1000));return s<60?s+"s ago":s<3600?Math.floor(s/60)+"m ago":s<86400?Math.floor(s/3600)+"h ago":Math.floor(s/86400)+"d ago"}
function dur(a,b){const sec=Math.max(0,Math.floor((new Date(b||Date.now())-new Date(a))/1000));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?h+"h ":"")+(m?m+"m ":"")+s+"s"}
async function load(){
 if(!c)return deny("Backend configuration is not connected yet.");
 const {data:{session}}=await c.auth.getSession();if(!session)return deny("Sign in with an administrator account.");
 $("adminEmail").textContent=session.user.email;
 const {data:p}=await c.from("profiles").select("role,status").eq("id",session.user.id).single();if(p?.role!=="admin"||p?.status!=="active")return deny("Your account is not authorised for this console.");
 $("blocked").classList.remove("show");$("console").hidden=false;
 const since=new Date(Date.now()-86400000).toISOString();
 const [aq,pp,ev,ss]=await Promise.all([
   c.from("approval_requests").select("id,user_id,state,created_at,profiles(full_name)").eq("state","pending").order("created_at"),
   c.from("profiles").select("id,full_name,status,created_at").eq("status","pending").order("created_at"),
   c.from("security_events").select("id,event_type,risk_score,decision,country_code,user_agent_summary,metadata,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(100),
   c.from("session_activity").select("id,user_id,started_at,last_seen_at,ended_at,country_code,city,region,device_label,browser_label,os_label,vpn,tor,ip_hash,profiles(full_name)").order("started_at",{ascending:false}).limit(100)
 ]);
 const byUser=new Map();(aq.data||[]).forEach(a=>byUser.set(a.user_id,{user_id:a.user_id,created_at:a.created_at,full_name:a.profiles?.full_name||"New member",source:"queue"}));(pp.data||[]).forEach(x=>{if(!byUser.has(x.id))byUser.set(x.id,{user_id:x.id,created_at:x.created_at,full_name:x.full_name||"New member",source:"profile"})});
 const approvals=[...byUser.values()].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),events=ev.data||[],sessions=ss.data||[];
 const active=sessions.filter(s=>!s.ended_at&&Date.now()-new Date(s.last_seen_at).getTime()<120000);
 $("pendingCount").textContent=approvals.length;$("activeCount").textContent=active.length;$("eventCount").textContent=events.length;$("riskCount").textContent=events.filter(e=>e.risk_score>=45).length;
 $("approvals").innerHTML=approvals.length?approvals.map(a=>'<div class="row"><div><strong>'+esc(a.full_name)+'</strong><small>'+esc(a.user_id)+' • '+new Date(a.created_at).toLocaleString()+'</small></div><button class="approve" data-user="'+esc(a.user_id)+'">Approve</button></div>').join(""):'<div class="row"><small>No pending approvals.</small></div>';
 $("sessions").innerHTML=sessions.length?sessions.map(s=>{const live=!s.ended_at&&Date.now()-new Date(s.last_seen_at).getTime()<120000;const loc=[s.city,s.region,s.country_code].filter(Boolean).join(", ")||"Location unavailable";const network=(s.tor?"TOR":s.vpn?"VPN":"Direct/unknown");return '<div class="row"><div><strong>'+esc(s.profiles?.full_name||"Member")+(live?' • LIVE':'')+'</strong><small>Login: '+new Date(s.started_at).toLocaleString()+' • Last seen: '+ago(s.last_seen_at)+' • Duration: '+dur(s.started_at,s.ended_at||Date.now())+'</small><small>'+esc([s.device_label,s.browser_label,s.os_label].filter(Boolean).join(" • ")||"Device unknown")+' • '+esc(loc)+' • '+esc(network)+(s.ended_at?' • Logout: '+new Date(s.ended_at).toLocaleString():'')+'</small></div></div>'}).join(""):'<div class="row"><small>No session telemetry yet.</small></div>';
 $("events").innerHTML=events.length?events.map(e=>'<div class="row"><div><strong>'+esc(e.event_type)+'</strong><small>'+new Date(e.created_at).toLocaleString()+' • '+esc(e.country_code||"Unknown country")+'</small></div><div><span class="badge '+(e.risk_score>=45?"danger":"")+'">'+esc(e.decision)+' • '+e.risk_score+'</span></div></div>').join(""):'<div class="row"><small>No events in the last 24 hours.</small></div>';
 $("lastRefresh").textContent="Last secure refresh: "+new Date().toLocaleTimeString();document.querySelectorAll(".approve").forEach(b=>b.onclick=()=>approve(b.dataset.user));
}
async function approve(userId){if(!confirm("Approve this member as a student?"))return;const btn=document.querySelector('.approve[data-user="'+CSS.escape(userId)+'"]');if(btn){btn.disabled=true;btn.textContent="Approving…"}try{const {error}=await c.rpc("approve_member",{target:userId,new_role:"student"});if(error)throw error;await load()}catch(e){alert(e.message||"Approval failed");if(btn){btn.disabled=false;btn.textContent="Approve"}}}
$("refresh").onclick=load;$("logout").onclick=async()=>{if(c)await c.auth.signOut();location.href="auth.html"};load();setInterval(load,30000);
