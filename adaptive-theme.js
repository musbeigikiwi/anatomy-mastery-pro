"use strict";
(()=>{
  const KEY="ampro_theme_mode";
  const root=document.documentElement;
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a8.5 8.5 0 1 0 11.7 11.7Z"></path></svg>';
  const auto='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z"></path><path d="M12 4v16"></path></svg>';
  const hour=()=>new Date().getHours();
  const systemDark=()=>window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const autoTheme=()=>{
    const h=hour();
    // Daylight-first: bright from 7am–6:59pm. At night we use dark mode.
    if(h>=7&&h<19)return "light";
    return "dark";
  };
  const currentMode=()=>localStorage.getItem(KEY)||"auto";
  const effectiveTheme=mode=>mode==="auto"?autoTheme():mode;
  const updateMeta=theme=>{const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",theme==="light"?"#f5f8fb":"#07111d")};
  function apply(mode=currentMode()){
    const theme=effectiveTheme(mode);
    root.dataset.theme=theme;
    root.dataset.themeMode=mode;
    updateMeta(theme);
    const b=document.getElementById("themeSwitch");
    const l=document.getElementById("themeModeLabel");
    if(b){b.innerHTML=mode==="light"?sun:mode==="dark"?moon:auto;b.title=mode==="auto"?`Automatic theme • ${theme}`:`${mode[0].toUpperCase()+mode.slice(1)} theme`;b.setAttribute("aria-label",b.title)}
    if(l)l.textContent=mode==="auto"?`Auto • ${theme}`:mode;
  }
  function cycle(){const order=["auto","light","dark"];const next=order[(order.indexOf(currentMode())+1)%order.length];localStorage.setItem(KEY,next);apply(next)}
  function mount(){
    let host=document.querySelector(".theme-switch-wrap");
    if(!host){host=document.createElement("div");host.className="theme-switch-wrap";const btn=document.createElement("button");btn.type="button";btn.id="themeSwitch";btn.className="theme-switch";const label=document.createElement("span");label.id="themeModeLabel";label.className="theme-mode-label";host.append(btn,label);
      const target=document.querySelector(".topbar .account-access")||document.querySelector(".auth-card")||document.body;
      if(target?.parentNode&&target!==document.body)target.parentNode.insertBefore(host,target);else document.body.appendChild(host);
    }
    document.getElementById("themeSwitch")?.addEventListener("click",cycle);
    apply();
  }
  apply();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
  setInterval(()=>{if(currentMode()==="auto")apply("auto")},60000);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change",()=>{if(currentMode()==="auto")apply("auto")});
})();