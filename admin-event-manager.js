"use strict";
(()=>{
  const cfg=window.AMPRO_CONFIG||{};
  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let selected=new Set(),busy=false,rendering=false,lastRows=[];

  function ensureToolbar(){
    const host=document.getElementById("events");
    if(!host)return null;
    let tools=document.getElementById("eventPersistentTools");
    if(!tools){
      tools=document.createElement("div");
      tools.id="eventPersistentTools";
      tools.className="event-tools";
      tools.innerHTML=`<div class="event-tools-left"><label class="select-all"><input id="eventSelectAll" type="checkbox"><span>Select all</span></label><span id="selectedEventCount">0 selected</span></div><div class="event-tools-actions"><button id="deleteSelectedEvents" class="event-delete" disabled>Delete selected</button><button id="deleteAllEvents" class="event-delete event-delete-all">Delete all shown</button></div>`;
      host.parentElement.insertBefore(tools,host);
    }
    return tools;
  }

  function updateTools(){
    ensureToolbar();
    const all=document.getElementById("eventSelectAll"),count=document.getElementById("selectedEventCount"),del=document.getElementById("deleteSelectedEvents");
    if(count)count.textContent=`${selected.size} selected`;
    if(del)del.disabled=!selected.size;
    if(all){all.checked=lastRows.length>0&&lastRows.every(r=>selected.has(String(r.id)));all.indeterminate=selected.size>0&&!all.checked;}
  }

  async function loadRows(){
    if(busy)return;
    busy=true;
    try{
      const since24=new Date(Date.now()-86400000).toISOString();
      const {data,error}=await c.from("security_events").select("id,user_id,event_type,risk_score,decision,country_code,user_agent_summary,metadata,created_at,profiles(full_name)").gte("created_at",since24).order("created_at",{ascending:false}).limit(200);
      if(error)throw error;
      lastRows=data||[];
      selected=new Set([...selected].filter(id=>lastRows.some(r=>String(r.id)===String(id))));
      render();
    }catch(e){console.warn("Event manager unavailable",e?.message||e)}
    finally{busy=false;}
  }

  function render(){
    const host=document.getElementById("events");
    if(!host)return;
    ensureToolbar();
    rendering=true;
    host.innerHTML=lastRows.length?lastRows.map(e=>{
      const name=e.profiles?.full_name||"Unknown member";
      const meta=e.metadata||{};
      const device=[meta.device,meta.browser,meta.os].filter(Boolean).join(" • ");
      const eventLabel=String(e.event_type||"").replaceAll("_"," ");
      return `<div class="row event-row" data-event-id="${esc(e.id)}"><label class="event-check"><input class="event-selector" type="checkbox" value="${esc(e.id)}" ${selected.has(String(e.id))?"checked":""}><span></span></label><div class="event-main"><strong>${esc(name)} • ${esc(eventLabel)}</strong><small>${new Date(e.created_at).toLocaleString()} • ${esc(e.country_code||"Location unavailable")}</small>${device?`<small>${esc(device)}</small>`:""}</div><div><span class="badge ${Number(e.risk_score||0)>=45?"danger":""}">${esc(e.decision||"review")} • ${Number(e.risk_score||0)}</span></div></div>`;
    }).join(""):'<div class="row"><small>No events in the last 24 hours.</small></div>';
    bind();
    updateTools();
    setTimeout(()=>rendering=false,0);
  }

  function bind(){
    document.querySelectorAll(".event-selector").forEach(ch=>ch.onchange=()=>{ch.checked?selected.add(ch.value):selected.delete(ch.value);updateTools();});
    const all=document.getElementById("eventSelectAll");
    if(all)all.onchange=()=>{if(all.checked)lastRows.forEach(r=>selected.add(String(r.id)));else selected.clear();document.querySelectorAll(".event-selector").forEach(ch=>ch.checked=all.checked);updateTools();};
    const del=document.getElementById("deleteSelectedEvents");
    if(del)del.onclick=()=>remove([...selected]);
    const delAll=document.getElementById("deleteAllEvents");
    if(delAll)delAll.onclick=()=>remove(lastRows.map(r=>String(r.id)));
  }

  async function remove(ids){
    if(!ids.length)return;
    if(!confirm(`Delete ${ids.length} security event(s)? This cannot be undone.`))return;
    document.querySelectorAll(".event-delete").forEach(b=>b.disabled=true);
    try{
      const {error}=await c.rpc("admin_delete_security_events",{event_ids:ids.map(Number)});
      if(error)throw error;
      ids.forEach(id=>selected.delete(String(id)));
      await loadRows();
      document.getElementById("refresh")?.click();
    }catch(e){alert("Delete failed: "+(e?.message||"Unknown error"));updateTools();}
  }

  function observe(){
    const host=document.getElementById("events");
    if(!host)return;
    new MutationObserver(()=>{if(rendering||busy)return;setTimeout(render,0);}).observe(host,{childList:true});
  }

  function start(){ensureToolbar();loadRows();observe();setInterval(loadRows,10000);}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
})();