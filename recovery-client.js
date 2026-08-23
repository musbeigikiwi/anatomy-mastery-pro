"use strict";
(async()=>{
 const q=new URLSearchParams(location.search);
 if(!q.has("code")&&!q.has("recovery"))return;
 const cfg=window.AMPRO_CONFIG||{};
 if(!window.supabase){return}
 const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{flowType:"pkce",persistSession:true,detectSessionInUrl:true}});
 try{
   if(q.get("code")){const {error}=await client.auth.exchangeCodeForSession(q.get("code"));if(error)throw error}
   const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("This recovery link has expired. Request a fresh email.");
   const form=document.getElementById("recoveryForm"),notice=document.getElementById("notice");
   Object.values({login:document.getElementById("loginForm"),register:document.getElementById("registerForm")}).forEach(f=>f?.classList.remove("active"));
   form.classList.add("active");
   document.querySelector(".tabs").style.display="none";
   form.innerHTML='<header><p>SECURE RECOVERY</p><h2>Choose a new password</h2><span>Use a unique password you have never used before.</span></header><label>New password<div class="input-wrap"><input id="finalNewPassword" type="password" autocomplete="new-password" placeholder="At least 12 characters" minlength="12" required><button class="reveal" id="finalReveal" type="button">Show</button></div></label><button class="primary-btn" type="submit">Update password securely <span>→</span></button>';
   document.getElementById("finalReveal").onclick=()=>{const i=document.getElementById("finalNewPassword");i.type=i.type==="password"?"text":"password";document.getElementById("finalReveal").textContent=i.type==="password"?"Show":"Hide"};
   form.onsubmit=async e=>{e.preventDefault();const p=document.getElementById("finalNewPassword").value;if(p.length<12||!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p)||!/[^A-Za-z0-9]/.test(p)){notice.textContent="Use 12+ characters, mixed case, a number and a symbol.";notice.className="notice show error";return}const {error}=await client.auth.updateUser({password:p});if(error){notice.textContent=error.message;notice.className="notice show error";return}await client.auth.signOut();history.replaceState({},document.title,"auth.html?v=6");notice.textContent="Password updated successfully. Sign in with your new password.";notice.className="notice show success";setTimeout(()=>location.replace("auth.html?v=6"),1400)};
 }catch(e){const n=document.getElementById("notice");n.textContent=e.message||"Recovery link could not be verified.";n.className="notice show error"}
})();
