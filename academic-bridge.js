"use strict";
(()=>{
 const core=new Set(["courses","lessons","calendar","tasks","community","qa","meetings"]);
 const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 const layouts={courses:["Courses","Your academic spaces","Browse enrolled courses, modules and learning material.","courses"],lessons:["Lessons","Continue learning","Open lessons, lecture material and course resources.","lessons"],calendar:["Calendar","Academic calendar","Keep classes, meetings, deadlines and events together.","calendar_events"],tasks:["Tasks & Goals","Plan your study","Track assignments, revision goals and personal study tasks.","tasks"],community:["Community","Academic community","Discuss learning with students, tutors and educators.","community_posts"],qa:["Q&A","Ask. Answer. Learn.","A focused space for academic questions and useful answers.","community_posts"],meetings:["Meetings","Live academic connections","Classes, tutorials and external Zoom, Meet or Teams sessions.","calendar_events"]};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function card(route,title,subtitle){return `<section class="bridge-head glass"><p class="eyebrow">ACADEMIC BRIDGE</p><h2>${esc(title)}</h2><p>${esc(subtitle)}</p><div class="bridge-actions"><button class="primary" data-bridge-refresh="${route}">Refresh</button></div></section><section id="bridgeData" class="bridge-grid"><article class="glass bridge-empty"><b>Connecting…</b><small>Opening your secure academic workspace.</small></article></section>`}
 function normalize(x){return x.title||x.name||x.question||x.content||x.event_title||"Untitled"}
 async function getClient(){
   for(let i=0;i<120;i++){
     const client=window.AMPRO_AUTH?.client;
     if(client?.from)return client;
     if(!document.documentElement.classList.contains("auth-pending")&&window.AMPRO_AUTH?.client?.from)return window.AMPRO_AUTH.client;
     await sleep(100);
   }
   throw new Error("Secure database session could not start. Please reload the page.");
 }
 async function load(route){
   if(!layouts[route])return;
   const [,title,subtitle,table]=layouts[route],app=document.getElementById("app");if(!app)return;
   app.innerHTML=card(route,title,subtitle);const target=document.getElementById("bridgeData");
   try{
     const client=await getClient();
     const {data,error}=await client.from(table).select("*").limit(24);
     if(error)throw error;
     if(!data?.length){target.innerHTML=`<article class="glass bridge-empty"><b>${esc(title)} ready</b><small>Database connected successfully. No records have been added here yet.</small></article>`;return}
     target.innerHTML=data.map(x=>`<article class="glass bridge-card"><small>${esc(route.toUpperCase())}</small><h3>${esc(normalize(x))}</h3><p>${esc(x.description||x.summary||x.content||x.body||x.location||"Open this workspace to continue.")}</p></article>`).join("");
   }catch(e){target.innerHTML=`<article class="glass bridge-empty"><b>Database connection issue</b><small>${esc(e.message||"Unable to load records right now.")}</small><button class="primary" data-bridge-refresh="${route}" style="margin-top:14px">Try again</button></article>`}
 }
 function bind(){
   document.addEventListener("click",e=>{const b=e.target.closest("button[data-route]");if(!b||!core.has(b.dataset.route))return;e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x===b));load(b.dataset.route)},true);
   document.addEventListener("click",e=>{const b=e.target.closest("[data-bridge-refresh]");if(b){e.preventDefault();load(b.dataset.bridgeRefresh)}});
 }
 document.readyState==="loading"?document.addEventListener("DOMContentLoaded",bind,{once:true}):bind();
})();