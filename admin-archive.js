"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let rows=[],query="",selectedDay="all",loading=false;

  const ms=(s)=>{
    const a=new Date(s.started_at).getTime();
    const b=new Date(s.ended_at||s.last_seen_at||s.started_at).getTime();
    return Math.max(0,b-a);
  };
  const fmtDuration=(v)=>{
    const min=Math.max(0,Math.round(v/60000));
    const h=Math.floor(min/60),m=min%60;
    return h?`${h}h ${m}m`:`${m}m`;
  };
  const dayKey=t=>{
    const d=new Date(t);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  };
  const prettyDay=k=>new Date(k+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});

  function aggregate(filtered){
    const byDay=new Map(),byUser=new Map();
    for(const s of filtered){
      const day=dayKey(s.started_at),name=s.profiles?.full_name||"Unknown member",uid=s.user_id||"unknown",duration=ms(s);
      if(!byDay.has(day))byDay.set(day,{day,visits:0,users:new Set(),duration:0});
      const d=byDay.get(day);d.visits++;d.users.add(uid);d.duration+=duration;
      const key=uid+"|"+day;
      if(!byUser.has(key))byUser.set(key,{uid,day,name,role:s.profiles?.role||"member",visits:0,duration:0,first:s.started_at,last:s.ended_at||s.last_seen_at,live:false,devices:new Set()});
      const u=byUser.get(key);u.visits++;u.duration+=duration;
      if(new Date(s.started_at)<new Date(u.first))u.first=s.started_at;
      const last=s.ended_at||s.last_seen_at;if(new Date(last)>new Date(u.last))u.last=last;
      if(!s.ended_at&&Date.now()-new Date(s.last_seen_at).getTime()<180000)u.live=true;
      [s.device_label,s.browser_label,s.os_label].filter(Boolean).forEach(x=>u.devices.add(x));
    }
    return {days:[...byDay.values()].sort((a,b)=>b.day.localeCompare(a.day)),users:[...byUser.values()].sort((a,b)=>new Date(b.last)-new Date(a.last))};
  }

  function apply(){
    const q=query.trim().toLowerCase();
    const filtered=rows.filter(s=>{
      const name=(s.profiles?.full_name||"").toLowerCase(),role=(s.profiles?.role||"").toLowerCase(),uid=(s.user_id||"").toLowerCase();
      return (!q||name.includes(q)||role.includes(q)||uid.includes(q))&&(selectedDay==="all"||dayKey(s.started_at)===selectedDay);
    });
    const a=aggregate(filtered);
    renderSummary(a,filtered);renderDays(a.days);renderStudents(a.users);
  }

  function renderSummary(a,filtered){
    const host=$("archiveSummary");if(!host)return;
    const users=new Set(filtered.map(x=>x.user_id)).size,total=filtered.reduce((n,s)=>n+ms(s),0);
    host.innerHTML=`<article><small>Archive sessions</small><strong>${filtered.length}</strong><em>Matching visits</em></article><article><small>Students</small><strong>${users}</strong><em>Distinct users</em></article><article><small>Total time</small><strong>${fmtDuration(total)}</strong><em>Combined session time</em></article><article><small>Days</small><strong>${a.days.length}</strong><em>Recorded activity days</em></article>`;
  }

  function renderDays(days){
    const host=$("dailyArchive");if(!host)return;
    host.innerHTML=days.length?days.map(d=>`<button class="archive-day ${selectedDay===d.day?"active":""}" data-day="${d.day}"><span><strong>${esc(prettyDay(d.day))}</strong><small>${d.users.size} students • ${d.visits} visits</small></span><b>${fmtDuration(d.duration)}</b></button>`).join(""):'<div class="row"><small>No matching daily records.</small></div>';
    host.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{selectedDay=selectedDay===b.dataset.day?"all":b.dataset.day;apply()});
  }

  function renderStudents(users){
    const host=$("studentArchive");if(!host)return;
    host.innerHTML=users.length?users.map(u=>`<article class="student-record"><div class="student-record-head"><div><strong>${esc(u.name)}</strong><small>${esc(String(u.role).toUpperCase())} • ${esc(prettyDay(u.day))}${u.live?' • LIVE':''}</small></div><span>${u.visits} visit${u.visits===1?'':'s'}</span></div><div class="student-record-stats"><div><small>Total time</small><b>${fmtDuration(u.duration)}</b></div><div><small>First login</small><b>${new Date(u.first).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</b></div><div><small>Last activity</small><b>${new Date(u.last).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</b></div></div><small class="student-device">${esc([...u.devices].join(" • ")||"Device information unavailable")}</small></article>`).join(""):'<div class="row"><small>No matching student records.</small></div>';
  }

  async function load(){if(loading)return;loading=true;try{
    const {data:{session}}=await c.auth.getSession();if(!session)return;
    const {data:p}=await c.from("profiles").select("role,status").eq("id",session.user.id).single();if(p?.role!=="admin"||p?.status!=="active")return;
    const {data,error}=await c.from("session_activity").select("id,user_id,started_at,last_seen_at,ended_at,device_label,browser_label,os_label,country_code,city,region,profiles(full_name,role)").order("started_at",{ascending:false}).limit(5000);
    if(error)throw error;rows=data||[];apply();if($("archiveUpdated"))$("archiveUpdated").textContent="Updated "+new Date().toLocaleTimeString();
  }catch(e){if($("studentArchive"))$("studentArchive").innerHTML=`<div class="row"><small>Archive unavailable: ${esc(e?.message||"Unknown error")}</small></div>`}finally{loading=false}}

  function start(){
    $("archiveSearch")?.addEventListener("input",e=>{query=e.target.value;apply()});
    $("archiveClear")?.addEventListener("click",()=>{query="";selectedDay="all";if($("archiveSearch"))$("archiveSearch").value="";apply()});
    $("refresh")?.addEventListener("click",()=>setTimeout(load,300));
    load();setInterval(load,30000);
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
})();