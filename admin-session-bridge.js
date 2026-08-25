"use strict";
(()=>{
  // Admin must continue the same authenticated visit created at sign-in.
  // Reusing the shared session id prevents page refreshes from creating duplicate visits.
  const shared=sessionStorage.getItem("ampro_session_id");
  if(shared) sessionStorage.setItem("ampro_admin_session",shared);
})();
