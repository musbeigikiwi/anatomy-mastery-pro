(async()=>{
const C=window.QUIZ_CONFIG||{};
async function loadExtra(){if(!['6','7','8'].includes(String(C.chapter||'')))return;await new Promise(r=>{const s=document.createElement('script');s.src=`chapter${C.chapter}-extra.js?v=5`;s.onload=r;s.onerror=r;document.head.appendChild(s)})}
await loadExtra();
const D=window.QUIZ_DATA||[],V=window.QUIZ_VISUALS||{},ch=String(C.chapter||'');
const $=s=>document.querySelector(s),menu=$('#menu'),game=$('#game'),result=$('#result'),qEl=$('#question'),opts=$('#options'),feed=$('#feedback'),next=$('#next'),visual=$('#visual');
const wrongKey=C.storage||`ora-ch${ch}-wrong`,progressKey=`ora-ch${ch}-progress-v2`;
let wrongSet=new Set(JSON.parse(localStorage.getItem(wrongKey)||'[]')),progress=JSON.parse(localStorage.getItem(progressKey)||'{}'),queue=[],pos=0,correct=0,wrong=0,streak=0,answered=false,mode='20';
const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
const variants=['','Choose the BEST answer: ','Exam check — ','Rapid recall — ','Which answer would earn the mark? ','Do not overthink this one: ','Chapter mastery check — ','Select the most accurate answer: '];
const hasTag=(q,t)=>String(q.tags||'').split(/[ ,|]+/).includes(t)||String(q.tags||'').includes(t);
const lessonOf=q=>{const m=String(q.tags||'').match(/[5-8]\.[0-3]/);return m?m[0]:''};
function save(){localStorage.setItem(wrongKey,JSON.stringify([...wrongSet]));localStorage.setItem(progressKey,JSON.stringify(progress))}
function statFor(id){return progress[id]||{a:0,c:0}}
function accuracy(id){const s=statFor(id);return s.a?s.c/s.a:1}
function record(q,ok){const id=String(q.id);const s=statFor(id);s.a++;if(ok)s.c++;progress[id]=s;save()}
function weakIds(){return D.map((q,i)=>({...q,id:q.id??i})).filter(q=>{const s=statFor(String(q.id));return wrongSet.has(q.id)||(s.a>0&&s.c/s.a<.85)}).map(q=>q.id)}
function stats(){
 $('#correctStat').textContent=correct;$('#wrongStat').textContent=wrong;$('#streakStat').textContent=streak;$('#reviewStat').textContent=wrongSet.size;
 $('#reviewMenu').disabled=wrongSet.size===0;$('#reviewNow').disabled=wrongSet.size===0;
 const wb=$('#weakCount');if(wb)wb.textContent=weakIds().length;
}
function makeVariant(base,i){const v=i%variants.length;return{...base,q:(variants[v]||'')+base.q,vid:(base.id??'q')+'-'+v}}
function basePool(){return D.map((q,i)=>({...q,id:q.id??i}))}
function build(modeName){
 let pool=basePool();
 if(modeName==='review') pool=pool.filter(q=>wrongSet.has(q.id));
 else if(modeName==='weak') pool=pool.filter(q=>{const s=statFor(String(q.id));return wrongSet.has(q.id)||(s.a>0&&s.c/s.a<.85)});
 else if(modeName==='sprint'){
   const wrongQs=shuffle(pool.filter(q=>wrongSet.has(q.id)));
   const weakQs=shuffle(pool.filter(q=>!wrongSet.has(q.id)&&statFor(String(q.id)).a>0&&accuracy(String(q.id))<.85));
   const unseen=shuffle(pool.filter(q=>statFor(String(q.id)).a===0));
   const seen=new Set(),out=[];[...wrongQs,...weakQs,...unseen,...shuffle(pool)].forEach(q=>{if(out.length<15&&!seen.has(q.id)){seen.add(q.id);out.push(q)}});return out;
 }
 else if(modeName==='lab') pool=pool.filter(q=>hasTag(q,'lab')||hasTag(q,'visual'));
 else if(modeName==='revision') pool=pool.filter(q=>hasTag(q,'revision'));
 else if(modeName.startsWith('topic:')) pool=pool.filter(q=>q.topic===modeName.slice(6));
 else if(modeName.startsWith('lesson:')) pool=pool.filter(q=>hasTag(q,modeName.slice(7)));
 if(modeName==='all'||modeName==='review'||modeName==='weak'||modeName==='lab'||modeName==='revision'||modeName.startsWith('topic:')||modeName.startsWith('lesson:')) return shuffle(pool);
 const expanded=[];pool.forEach(q=>{for(let v=0;v<variants.length;v++)expanded.push(makeVariant(q,v))});
 const n=modeName==='20'?20:modeName==='50'?50:30;return shuffle(expanded).slice(0,Math.min(n,expanded.length));
}
function start(m){mode=m;queue=build(m);if(!queue.length&&m==='weak'){queue=build('sprint')}pos=0;correct=0;wrong=0;streak=0;menu.classList.add('hidden');game.classList.remove('hidden');result.classList.add('hidden');render()}
function render(){
 answered=false;next.disabled=true;feed.innerHTML='Choose an answer.';if(pos>=queue.length){finish();return}
 const q=queue[pos],lesson=lessonOf(q);$('#counter').textContent=`Question ${pos+1} of ${queue.length}`;$('#topic').textContent=`${q.topic||''}${lesson?' • Source '+lesson:''}`;$('#bar').style.width=`${(pos/queue.length)*100}%`;qEl.textContent=q.q;opts.innerHTML='';
 if(q.visual&&V[q.visual]){visual.innerHTML=V[q.visual];visual.classList.add('show')}else{visual.classList.remove('show');visual.innerHTML=''};
 shuffle([q.a,...q.d]).forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='option';b.dataset.value=o;b.textContent=`${String.fromCharCode(65+i)}) ${o}`;b.addEventListener('click',()=>choose(q,o,b));opts.appendChild(b)});stats()
}
function choose(q,o,clicked){
 if(answered)return;answered=true;[...opts.children].forEach(b=>{b.disabled=true;if(b.dataset.value===q.a)b.classList.add('correct')});const ok=o===q.a;
 if(ok){correct++;streak++;if(mode==='review')wrongSet.delete(q.id);feed.innerHTML=`<b>✅ Correct</b><br>${q.e||''}`}
 else{wrong++;streak=0;wrongSet.add(q.id);clicked.classList.add('wrong');feed.innerHTML=`<b>❌ Wrong</b><br>Correct: <b>${q.a}</b><br>${q.e||''}`}
 record(q,ok);save();stats();next.disabled=false
}
function lessonSummary(){
 const lessons=[0,1,2,3].map(n=>`${ch}.${n}`),pool=basePool();return lessons.map(l=>{const qs=pool.filter(q=>hasTag(q,l));let a=0,c=0;qs.forEach(q=>{const s=statFor(String(q.id));a+=s.a;c+=s.c});return{l,a,c,p:a?Math.round(c/a*100):0,n:qs.length}})
}
function finish(){
 qEl.textContent='Quiz complete 🎯';opts.innerHTML='';visual.classList.remove('show');feed.innerHTML='';next.disabled=true;$('#bar').style.width='100%';result.classList.remove('hidden');const total=correct+wrong,pct=total?Math.round(correct/total*100):0;const weak=weakIds().length;
 result.innerHTML=`<div class="scoreBig">${pct}%</div><div class="sub">Correct ${correct} • Wrong ${wrong} • Saved review ${wrongSet.size} • Weak ${weak}</div><p>${pct>=95?'🏆 A++ target level. Repeat with a different mode to confirm consistency.':pct>=90?'🏆 Strong mastery. Clear Weak Topics and Wrong Answers next.':pct>=75?'👍 Good. Use Weak Topics before the next exam mode.':'📚 Use Mastery Sprint and repeat this lesson.'}</p>`
}
function enhanceMenu(){
 const grid=document.querySelector('.menuGrid');if(!grid)return;
 if(['6','7','8'].includes(ch)){
   const sprint=document.createElement('button');sprint.className='btn primary';sprint.dataset.mode='sprint';sprint.textContent='🚀 Mastery Sprint 15';grid.appendChild(sprint);
   const weak=document.createElement('button');weak.className='btn';weak.dataset.mode='weak';weak.innerHTML='🎯 Weak Topics (<85%) <span id="weakCount"></span>';grid.appendChild(weak);
   ['0','1','2','3'].forEach(n=>{const b=document.createElement('button');b.className='btn';b.dataset.mode=`lesson:${ch}.${n}`;b.textContent=`📘 ${ch}.${n}`;grid.appendChild(b)});
   const fb=document.createElement('a');fb.className='btn';fb.style.cssText='display:flex;align-items:center;justify-content:center;text-decoration:none';fb.href=`chapter-flashcards.html?ch=${ch}`;fb.textContent='🧠 Flashcards';grid.appendChild(fb);
   const tg=document.querySelector('.topicGrid');if(tg){const info=document.createElement('div');info.className='topicChip';info.style.gridColumn='1/-1';info.innerHTML=`Expanded bank: <b>${D.length} core questions</b> + shuffled exam variants. Weak Topics uses your saved accuracy.`;tg.appendChild(info);lessonSummary().forEach(x=>{const d=document.createElement('div');d.className='topicChip';d.innerHTML=`<b>${x.l}</b> • ${x.n} core • ${x.a?x.p+'%':'not started'}`;tg.appendChild(d)})}
 }
}
enhanceMenu();document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));$('#reviewMenu').addEventListener('click',()=>start('review'));$('#reviewNow').addEventListener('click',()=>start('review'));next.addEventListener('click',()=>{if(!answered)return;pos++;render()});$('#restart').addEventListener('click',()=>start(mode));$('#back').addEventListener('click',()=>{game.classList.add('hidden');menu.classList.remove('hidden');stats()});$('#resetSaved').addEventListener('click',()=>{wrongSet.clear();progress={};save();stats()});stats();
const requested=new URLSearchParams(location.search).get('mode');if(requested&&['20','50','exam','sprint','weak','review','lab','revision'].includes(requested))start(requested);
})();