"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const app=document.getElementById("app");
  const nav=document.querySelector(".nav");
  if(!app||!nav)return;

  let session=null,currentRoute="home",routeStartedAt=Date.now(),writing=false;
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const fmtSec=s=>{s=Math.max(0,Math.round(Number(s)||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return h?`${h}h ${m}m`:m?`${m}m ${r}s`:`${r}s`};
  const nzDate=d=>new Date(d).toLocaleDateString("en-NZ",{timeZone:"Pacific/Auckland",weekday:"short",day:"numeric",month:"short"});
  const dayKey=d=>new Intl.DateTimeFormat("en-CA",{timeZone:"Pacific/Auckland",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d));

  function ensureButton(){
    if(document.getElementById("studyTrackerBtn"))return;
    const b=document.createElement("button");
    b.id="studyTrackerBtn"; b.type="button"; b.innerHTML='<span class="nav-icon">◷</span><span>Study Tracker</span>';
    nav.appendChild(b);
    b.addEventListener("click",()=>openTracker());
  }

  async function addEvent(event_type,route,duration_seconds=0,metadata={}){
    if(!session||writing)return;
    writing=true;
    try{
      await client.from("study_activity_events").insert({user_id:session.user.id,event_type,route:route||null,duration_seconds:Math.max(0,Math.round(duration_seconds)),metadata});
    }catch(e){console.warn("Study tracker write unavailable",e?.message||e)}finally{writing=false}
  }

  async function closeRoute(reason="route_change"){
    if(!session||!currentRoute)return;
    const sec=Math.max(0,Math.round((Date.now()-routeStartedAt)/1000));
    if(sec>=3) await addEvent("section_visit",currentRoute,sec,{reason});
  }

  document.addEventListener("click",async e=>{
    const b=e.target.closest("[data-route]");
    if(!b)return;
    const next=b.dataset.route;
    if(!next||next===currentRoute)return;
    await closeRoute("navigation");
    currentRoute=next; routeStartedAt=Date.now();
  },true);

  document.addEventListener("visibilitychange",async()=>{
    if(document.hidden){await closeRoute("hidden")}else{routeStartedAt=Date.now()}
  });
  window.addEventListener("pagehide",()=>{closeRoute("pagehide")});

  function setActive(){
    document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.id==="studyTrackerBtn"));
  }

  function calendarCells(events){
    const now=new Date(),days=[];
    for(let i=34;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push(dayKey(d));}
    const map=new Map();
    events.forEach(e=>{const k=dayKey(e.occurred_at);const v=map.get(k)||{sec:0,count:0};v.sec+=Number(e.duration_seconds||0);v.count++;map.set(k,v)});
    return days.map(k=>{const v=map.get(k)||{sec:0,count:0};const level=v.sec>=3600?4:v.sec>=1800?3:v.sec>=600?2:v.sec>0?1:0;return `<button class="tracker-day level-${level}" title="${esc(k)} • ${fmtSec(v.sec)} • ${v.count} activities" data-day="${k}"><span>${Number(k.slice(-2))}</span></button>`}).join("");
  }

  async function openTracker(){
    setActive();
    await closeRoute("tracker_open"); currentRoute="tracker"; routeStartedAt=Date.now();
    await addEvent("study_tracker_opened","tracker",0,{});
    app.innerHTML='<section class="tracker-loading glass">Loading your study history…</section>';
    const since=new Date(Date.now()-1000*60*60*24*90).toISOString();
    const {data,error}=await client.from("study_activity_events").select("id,event_type,route,duration_seconds,metadata,occurred_at").eq("user_id",session.user.id).gte("occurred_at",since).order("occurred_at",{ascending:false}).limit(1500);
    if(error){app.innerHTML=`<article class="panel"><h2>Study Tracker needs database setup</h2><p>${esc(error.message)}</p><p>Run the study tracker migration in Supabase once.</p></article>`;return}
    const rows=data||[],today=dayKey(new Date()),todayRows=rows.filter(x=>dayKey(x.occurred_at)===today),todaySec=todayRows.reduce((n,x)=>n+Number(x.duration_seconds||0),0),totalSec=rows.reduce((n,x)=>n+Number(x.duration_seconds||0),0),activeDays=new Set(rows.filter(x=>Number(x.duration_seconds)>0).map(x=>dayKey(x.occurred_at))).size;
    const byRoute=new Map(); rows.forEach(x=>{if(!x.route)return;byRoute.set(x.route,(byRoute.get(x.route)||0)+Number(x.duration_seconds||0)});const top=[...byRoute.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    app.innerHTML=`
      <section class="tracker-head">
        <div><p class="eyebrow">PERSONAL STUDY ANALYTICS</p><h2>Study Tracker</h2><p>Your activity, study time and learning pattern are stored securely under your account.</p></div>
        <div class="tracker-badge">Last 90 days</div>
      </section>
      <section class="tracker-kpis">
        <article class="glass"><small>Today</small><strong>${fmtSec(todaySec)}</strong><span>Focused study</span></article>
        <article class="glass"><small>90-day total</small><strong>${fmtSec(totalSec)}</strong><span>Recorded activity</span></article>
        <article class="glass"><small>Active days</small><strong>${activeDays}</strong><span>Days with study</span></article>
        <article class="glass"><small>Activities</small><strong>${rows.length}</strong><span>Tracked events</span></article>
      </section>
      <section class="tracker-layout">
        <article class="panel tracker-calendar-panel"><div class="tracker-title"><div><small>CALENDAR</small><h3>Study consistency</h3></div><span>35 days</span></div><div class="tracker-calendar">${calendarCells(rows)}</div><div class="tracker-legend"><span>Less</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>More</span></div></article>
        <article class="panel"><div class="tracker-title"><div><small>FOCUS BREAKDOWN</small><h3>Where your time went</h3></div></div>${top.length?top.map(([r,s])=>`<div class="focus-row"><span>${esc(r.replaceAll('_',' '))}</span><strong>${fmtSec(s)}</strong></div>`).join(''):'<p class="muted">No study activity recorded yet.</p>'}</article>
      </section>
      <article class="panel tracker-timeline"><div class="tracker-title"><div><small>ACTIVITY HISTORY</small><h3>Recent learning activity</h3></div></div>${rows.slice(0,30).map(x=>`<div class="timeline-row"><div><strong>${esc((x.route||x.event_type).replaceAll('_',' '))}</strong><small>${nzDate(x.occurred_at)} • ${new Date(x.occurred_at).toLocaleTimeString('en-NZ',{timeZone:'Pacific/Auckland',hour:'2-digit',minute:'2-digit'})}</small></div><b>${x.duration_seconds?fmtSec(x.duration_seconds):'Recorded'}</b></div>`).join('')||'<p class="muted">Your activity will appear here as you use the learning tools.</p>'}</article>`;
  }

  async function init(){
    const {data:{session:s}}=await client.auth.getSession();session=s;if(!session)return;ensureButton();
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
