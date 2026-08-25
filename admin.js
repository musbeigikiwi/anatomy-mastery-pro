"use strict";
const cfg=window.AMPRO_CONFIG||{},ok=cfg.supabaseUrl&&!cfg.supabaseUrl.includes("YOUR_PROJECT");
const c=ok&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null,$=x=>document.getElementById(x);
function deny(msg){$("blocked").classList.add("show");$("blocked").querySelector("p").textContent=msg;$("console").hidden=true}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function load(){
 if(!c)return deny("Backend configuration is not connected yet.");
 const {data:{session}}=await c.auth.getSession();
 if(!session)return deny("Sign in with an administrator account.");
 $("adminEmail").textContent=session.user.email;
 const {data:p}=await c.from("profiles").select("role,status").eq("id",session.user.id).single();
 if(p?.role!=="admin"||p?.status!=="active")return deny("Your account is not authorised for this console.");
 $("blocked").classList.remove("show");$("console").hidden=false;
 const since=new Date(Date.now()-86400000).toISOString();
 const [aq,pp,ev]=await Promise.all([
   c.from("approval_requests").select("id,user_id,state,created_at,profiles(full_name)").eq("state","pending").order("created_at"),
   c.from("profiles").select("id,full_name,status,created_at").eq("status","pending").order("created_at"),
   c.from("security_events").select("id,event_type,risk_score,decision,country_code,user_agent_summary,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(100)
 ]);
 const byUser=new Map();
 (aq.data||[]).forEach(a=>byUser.set(a.user_id,{user_id:a.user_id,created_at:a.created_at,full_name:a.profiles?.full_name||"New member",source:"queue"}));
 (pp.data||[]).forEach(pending=>{if(!byUser.has(pending.id))byUser.set(pending.id,{user_id:pending.id,created_at:pending.created_at,full_name:pending.full_name||"New member",source:"profile"})});
 const approvals=[...byUser.values()].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
 const events=ev.data||[];
 $("pendingCount").textContent=approvals.length;$("eventCount").textContent=events.length;$("riskCount").textContent=events.filter(e=>e.risk_score>=45).length;
 $("approvals").innerHTML=approvals.length?approvals.map(a=>'<div class="row"><div><strong>'+esc(a.full_name)+'</strong><small>'+esc(a.user_id)+' • '+new Date(a.created_at).toLocaleString()+(a.source==="profile"?' • recovered pending profile':'')+'</small></div><button class="approve" data-user="'+esc(a.user_id)+'">Approve</button></div>').join(""):'<div class="row"><small>No pending approvals.</small></div>';
 $("events").innerHTML=events.length?events.map(e=>'<div class="row"><div><strong>'+esc(e.event_type)+'</strong><small>'+new Date(e.created_at).toLocaleString()+' • '+esc(e.country_code||"Unknown country")+'</small></div><div><span class="badge '+(e.risk_score>=45?"danger":"")+'">'+esc(e.decision)+' • '+e.risk_score+'</span></div></div>').join(""):'<div class="row"><small>No events in the last 24 hours.</small></div>';
 $("lastRefresh").textContent="Last secure refresh: "+new Date().toLocaleTimeString();
 document.querySelectorAll(".approve").forEach(b=>b.onclick=()=>approve(b.dataset.user));
}
async function approve(userId){
 if(!confirm("Approve this member as a student?"))return;
 const btn=document.querySelector('.approve[data-user="'+CSS.escape(userId)+'"]');
 if(btn){btn.disabled=true;btn.textContent="Approving…"}
 try{
   const {error}=await c.rpc("approve_member",{target:userId,new_role:"student"});
   if(error)throw error;
   await load();
 }catch(e){alert(e.message||"Approval failed");if(btn){btn.disabled=false;btn.textContent="Approve"}}
}
$("refresh").onclick=load;$("logout").onclick=async()=>{if(c)await c.auth.signOut();location.href="auth.html"};load();