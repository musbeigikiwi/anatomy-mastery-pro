"use strict";
/* ORA New Zealand — study-day rollover guard.
   Keeps Study Today tied to Pacific/Auckland while preserving Total Study. */
(()=>{
  const NZ_TZ="Pacific/Auckland";
  const nzDayKey=()=>{
    const parts=new Intl.DateTimeFormat("en-CA",{
      timeZone:NZ_TZ,year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||"";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };

  async function rolloverIfNeeded(){
    try{
      if(typeof state==="undefined"||!state)return;
      const key=nzDayKey();
      if(state.todayKey===key)return;

      // Preserve lifetime total; only today's counter belongs to the old NZ day.
      state.todayKey=key;
      state.todaySec=0;
      if(typeof save==="function")save();
      if(typeof renderStats==="function")renderStats();

      // Push the new NZ day immediately so the backend cannot keep showing yesterday.
      try{await window.AMPRO_CLOUD_STATE?.syncNow?.()}catch(e){
        console.warn("NZ day rollover cloud sync unavailable",e?.message||e);
      }
      window.dispatchEvent(new CustomEvent("ora:study-day-rollover",{detail:{todayKey:key}}));
    }catch(e){console.warn("NZ day rollover check unavailable",e?.message||e)}
  }

  // Correct device-timezone differences immediately, then watch across midnight.
  rolloverIfNeeded();
  setInterval(rolloverIfNeeded,1000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)rolloverIfNeeded()});
  window.addEventListener("focus",rolloverIfNeeded);
  window.ORA_STUDY_DAY={nzDayKey,rolloverIfNeeded,timeZone:NZ_TZ};
})();
