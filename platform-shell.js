"use strict";
(()=>{
 const groups=[
  ["LEARN",[["Courses","courses"],["Lessons","lessons"],["Lecture Notes","notes"],["Flashcards","flash"],["Question Bank","bank"],["Short Answers","short"],["Quizzes","quizzes"],["Mock Exams","mocks"],["Mistakes","mistakes"]]],
  ["MY STUDY",[["Study Tracker","tracker"],["Calendar","calendar"],["Tasks & Goals","tasks"],["Schedule","schedule"],["Progress","progress"]]],
  ["CONNECT",[["Community","community"],["Study Groups","groups"],["Live Rooms","rooms"],["Meetings","meetings"],["Messages","messages"]]],
  ["DISCOVER",[["Blog","blog"],["Resources","resources"],["Research & Library","library"],["Events","events"],["Opportunities","opportunities"]]],
  ["NETWORK",[["Lecturers & Tutors","educators"],["Institutions","institutions"],["Student Support","support"],["Career","career"]]]
 ];
 const implemented=new Set(["notes","flash","bank","short","quizzes","mocks","mistakes","schedule","progress","tracker","courses","lessons","calendar","tasks","community","qa","meetings"]);
 function injectBrand(){
  const brand=document.querySelector('.topbar .brand');
  if(!brand||brand.dataset.oraBrand)return;
  brand.dataset.oraBrand='1';
  brand.innerHTML='<img class="ora-site-logo" src="assets/ora-logo.webp" alt="ORA New Zealand"><div class="ora-site-copy"><b>Anatomy Mastery Pro</b><small>Learn • Connect • Grow</small></div>';
  if(!document.getElementById('ora-brand-style')){
   const style=document.createElement('style');
   style.id='ora-brand-style';
   style.textContent=`.topbar .brand{display:flex;align-items:center;gap:14px;min-width:0}.ora-site-logo{width:clamp(150px,15vw,225px);height:64px;object-fit:contain;object-position:left center;display:block;filter:drop-shadow(0 3px 10px rgba(218,165,63,.16))}.ora-site-copy{display:flex;flex-direction:column;gap:2px;white-space:nowrap}.ora-site-copy b{font-size:.95rem}.ora-site-copy small{font-size:.69rem;letter-spacing:.06em;color:var(--muted)}@media(max-width:900px){.ora-site-logo{width:160px;height:56px}.ora-site-copy{display:none}}@media(max-width:600px){.ora-site-logo{width:132px;height:48px}.topbar .brand{gap:6px}}`;
   document.head.appendChild(style);
  }
 }
 function inject(){injectBrand();const nav=document.querySelector(".nav");if(!nav||nav.dataset.platformShell)return;nav.dataset.platformShell="1";nav.innerHTML='<button class="active" data-route="home">⌂ <span>Home</span></button><button data-route="qa" data-platform="native">💬 <span>Question Discussion</span></button>'+groups.map(([label,items])=>`<div class="nav-group"><small>${label}</small>${items.map(([name,route])=>`<button data-route="${route}" data-platform="${implemented.has(route)?'native':'future'}">${name}${implemented.has(route)?'':'<i>+</i>'}</button>`).join('')}</div>`).join('');nav.addEventListener('click',e=>{const b=e.target.closest('button[data-route]');if(!b||b.dataset.platform!=='future')return;e.preventDefault();e.stopImmediatePropagation();nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const app=document.getElementById('app');if(app)app.innerHTML=`<section class="platform-coming glass"><span>ORA NEW ZEALAND • ACADEMIC BRIDGE</span><h2>${b.textContent.replace('+','').trim()}</h2><p>This workspace is part of the connected learning platform and will be activated in the next platform phase.</p><div class="coming-grid"><article><b>Connected</b><small>Students • educators • tutors</small></article><article><b>Secure</b><small>Role-based access & privacy</small></article><article><b>Collaborative</b><small>Learning, discussion & live sessions</small></article></div></section>`;});}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inject,{once:true}):inject();
})();