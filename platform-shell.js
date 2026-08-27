"use strict";
(()=>{
 const groups=[
  ["LEARN",[["Courses","courses"],["Lessons","lessons"],["Lecture Notes","notes"],["Flashcards","flash"],["Question Bank","bank"],["Short Answers","short"],["Quizzes","quizzes"],["Mock Exams","mocks"],["Mistakes","mistakes"]]],
  ["MY STUDY",[["Study Tracker","tracker"],["Calendar","calendar"],["Tasks & Goals","tasks"],["Schedule","schedule"],["Progress","progress"]]],
  ["CONNECT",[["Community","community"],["Q&A","qa"],["Study Groups","groups"],["Live Rooms","rooms"],["Meetings","meetings"],["Messages","messages"]]],
  ["DISCOVER",[["Blog","blog"],["Resources","resources"],["Research & Library","library"],["Events","events"],["Opportunities","opportunities"]]],
  ["NETWORK",[["Lecturers & Tutors","educators"],["Institutions","institutions"],["Student Support","support"],["Career","career"]]]
 ];
 const implemented=new Set(["notes","flash","bank","short","quizzes","mocks","mistakes","schedule","progress","tracker"]);
 function inject(){const nav=document.querySelector(".nav");if(!nav||nav.dataset.platformShell)return;nav.dataset.platformShell="1";nav.innerHTML='<button class="active" data-route="home">⌂ <span>Home</span></button>'+groups.map(([label,items])=>`<div class="nav-group"><small>${label}</small>${items.map(([name,route])=>`<button data-route="${route}" data-platform="${implemented.has(route)?'native':'future'}">${name}${implemented.has(route)?'':'<i>+</i>'}</button>`).join('')}</div>`).join('');
 nav.addEventListener('click',e=>{const b=e.target.closest('button[data-route]');if(!b||b.dataset.platform!=='future')return;e.preventDefault();e.stopImmediatePropagation();nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const app=document.getElementById('app');if(app)app.innerHTML=`<section class="platform-coming glass"><span>ANATOMY MASTERY PRO • ACADEMIC BRIDGE</span><h2>${b.textContent.replace('+','').trim()}</h2><p>This workspace is part of the new connected learning platform. It is being wired to secure accounts, courses, institutions, community and calendar data.</p><div class="coming-grid"><article><b>Connected</b><small>Students • educators • tutors</small></article><article><b>Secure</b><small>Role-based access & privacy</small></article><article><b>Collaborative</b><small>Learning, discussion & live sessions</small></article></div></section>`;});
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inject,{once:true}):inject();
})();