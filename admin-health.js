"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let running=false;

  function setState(id,state,text){
    const el=$(id); if(!el)return;
    el.className="health-state "+state;
    el.textContent=text;
  }

  async function refresh(){
    if(running)return; running=true;
    try{
      const {data:{session}}=await c.auth.getSession();
      if(!session){setState("healthAuth","bad","Not signed in");return;}
      setState("healthAuth","good","Authenticated");

      const {data:profile,error:profileError}=await c.from("profiles").select("role,status").eq("id",session.user.id).single();
      if(profileError||profile?.role!=="admin"||profile?.status!=="active"){
        setState("healthProfile","bad","Admin check failed");return;
      }
      setState("healthProfile","good","Active admin");

      const activeSince=new Date(Date.now()-180000).toISOString();
      const today=new Date(); today.setHours(0,0,0,0);
      const [active,recent,total,events,approvals]=await Promise.all([
        c.from("session_activity").select("user_id,last_seen_at,ended_at").is("ended_at",null).gte("last_seen_at",activeSince).limit(5000),
        c.from("session_activity").select("user_id,started_at,last_seen_at,ended_at").order("last_seen_at",{ascending:false}).limit(20),
        c.from("session_activity").select("id",{count:"exact",head:true}),
        c.from("security_events").select("id",{count:"exact",head:true}).gte("created_at",today.toISOString()),
        c.from("approval_requests").select("id",{count:"exact",head:true}).eq("state","pending")
      ]);

      if(active.error){
        setState("healthSessions","bad","Session query failed");
        if($("activeCount"))$("activeCount").textContent="—";
        if($("onlineHealthNote"))$("onlineHealthNote").textContent=active.error.message||"Session telemetry query failed.";
      }else{
        const unique=new Set((active.data||[]).map(x=>x.user_id)).size;
        if($("activeCount"))$("activeCount").textContent=String(unique);
        setState("healthSessions",unique?"good":"warn",unique?`${unique} online now`:"No live heartbeat");
        if($("onlineHealthNote"))$("onlineHealthNote").textContent=unique?"Users with a heartbeat in the last 3 minutes are counted as online.":"No session has reported activity in the last 3 minutes.";
      }

      setState("healthEvents",events.error?"bad":"good",events.error?"Events query failed":`${events.count??0} events today`);
      setState("healthApprovals",approvals.error?"bad":"good",approvals.error?"Approval query failed":`${approvals.count??0} pending`);
      if($("healthTotalSessions"))$("healthTotalSessions").textContent=total.error?"Unavailable":String(total.count??0);

      const last=(recent.data||[])[0];
      if($("healthLastHeartbeat")){
        $("healthLastHeartbeat").textContent=recent.error?"Unavailable":last?.last_seen_at?new Date(last.last_seen_at).toLocaleString():"No session recorded";
      }
      if($("healthUpdated"))$("healthUpdated").textContent="Checked "+new Date().toLocaleTimeString();
    }catch(e){
      setState("healthSessions","bad","Health check failed");
      if($("onlineHealthNote"))$("onlineHealthNote").textContent=e?.message||"Unknown telemetry error";
    }finally{running=false;}
  }

  const start=()=>{refresh();setInterval(refresh,10000);document.getElementById("refresh")?.addEventListener("click",()=>setTimeout(refresh,250));};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
