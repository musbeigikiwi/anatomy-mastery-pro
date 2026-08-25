"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let selected=new Set(),rendering=false,lastSignature="";
  function toolbar(){return `<div class="event-tools"><label class="select-all"><input id="eventSelectAll" type="checkbox"> <span>Select all</span></label><span id="selectedEventCount">0 selected</span><button id="deleteSelectedEvents" class="event-delete" disabled>Delete selected</button><button id="deleteAllEvents" class="event-delete event-delete-all">Delete all shown</button></div>`}
  async function refreshEvents(){
    if(rendering)return;rendering=true;
    try{
      const since24=new Date(Date.now()-86400000).toISOString();
      const {data,error}=await c.from("security_events").select("id,event_type,risk_score,decision,country_code,created_at").gte("created_at",since24).order("created_at",{ascending:false}).limit(200);
      if(error)throw error;
      const rows=data||[],host=document.getElementById("events");if(!host)return;
      const sig=rows.map(x=>x.id).join(",");
      if(sig!==lastSignature){selected=new Set([...selected].filter(id=>rows.some(r=>String(r.id)===String(id))));lastSignature=sig}
      host.innerHTML=toolbar()+(rows.length?rows.map(e=>`<div class="row event-row" data-event-id="${esc(e.id)}"><label class="event-check"><input class="event-selector" type="checkbox" value="${esc(e.id)}" ${selected.has(String(e.id))?"checked":""}><span></span></label><div class="event-main"><strong>${esc(e.event_type)}</strong><small>${new Date(e.created_at).toLocaleString()} • ${esc(e.country_code||"Unknown country")}</small></div><div><span class="badge ${e.risk_score>=45?"danger":""}">${esc(e.decision)} • ${Number(e.risk_score||0)}</span></div></div>`).join(""):'<div class="row"><small>No events in the last 24 hours.</small></div>');
      bind(rows);
    }catch(e){console.warn("Event manager unavailable",e?.message||e)}finally{rendering=false}
  }
  function updateTools(rows){
    const count=document.getElementById("selectedEventCount"),del=document.getElementById("deleteSelectedEvents"),all=document.getElementById("eventSelectAll");
    if(count)count.textContent=`${selected.size} selected`;if(del)del.disabled=!selected.size;if(all){all.checked=rows.length>0&&rows.every(r=>selected.has(String(r.id)));all.indeterminate=selected.size>0&&!all.checked}
  }
  function bind(rows){
    document.querySelectorAll(".event-selector").forEach(ch=>ch.onchange=()=>{ch.checked?selected.add(ch.value):selected.delete(ch.value);updateTools(rows)});
    const all=document.getElementById("eventSelectAll");if(all)all.onchange=()=>{if(all.checked)rows.forEach(r=>selected.add(String(r.id)));else rows.forEach(r=>selected.delete(String(r.id)));refreshEvents()};
    const del=document.getElementById("deleteSelectedEvents");if(del)del.onclick=()=>remove([...selected],"selected security events");
    const delAll=document.getElementById("deleteAllEvents");if(delAll)delAll.onclick=()=>remove(rows.map(r=>String(r.id)),"all security events currently shown");
    updateTools(rows);
  }
  async function remove(ids,label){
    if(!ids.length)return;
    if(!confirm(`Delete ${ids.length} ${label}? This cannot be undone.`))return;
    const buttons=[document.getElementById("deleteSelectedEvents"),document.getElementById("deleteAllEvents")].filter(Boolean);buttons.forEach(b=>b.disabled=true);
    try{
      const {data,error}=await c.rpc("admin_delete_security_events",{event_ids:ids.map(Number)});
      if(error)throw error;
      ids.forEach(id=>selected.delete(String(id)));
      await refreshEvents();
      const refresh=document.getElementById("refresh");if(refresh)refresh.click();
    }catch(e){alert((e?.message||"Delete failed")+"\n\nThe one-time admin delete SQL may not be installed yet.")}
  }
  const start=()=>{refreshEvents();setInterval(refreshEvents,30000)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
