"use strict";
(async()=>{
 const q=new URLSearchParams(location.search);
 const h=new URLSearchParams(location.hash.replace(/^#/,""));
 const isRecovery=q.has("code")||q.has("recovery")||h.get("type")==="recovery"||h.has("access_token");
 if(!isRecovery)return;
 const cfg=window.AMPRO_CONFIG||{};
 if(!window.supabase)return;
 const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{flowType:"pkce",persistSession:true,detectSessionInUrl:true}});
 const notice=document.getElementById("notice"),form=document.getElementById("recoveryForm");
 function showRecoveryForm(){
   document.getElementById("loginForm")?.classList.remove("active");
   document.getElementById("registerForm")?.classList.remove("active");
   form?.classList.add("active");
   const tabs=document.querySelector(".tabs");if(tabs)tabs.style.display="none";
 }
 function showFreshRequest(message){
   showRecoveryForm();
   notice.textContent=message||"This recovery link has expired. Request a fresh email.";
   notice.className="notice show error";
   form.innerHTML='<header><p>ACCOUNT RECOVERY</p><h2>Request a fresh recovery link</h2><span>Enter your registered email and we will send a new short-lived link.</span></header><label>Registered email<input id="freshRecoveryEmail" type="email" autocomplete="email" placeholder="name@example.com" required></label><button class="primary-btn" type="submit">Send fresh recovery email <span>→</span></button><button id="freshBackLogin" class="secondary-btn" type="button">Back to sign in</button>';
   document.getElementById("freshBackLogin").onclick=()=>location.replace("auth.html?v=12");
   form.onsubmit=async e=>{e.preventDefault();const email=document.getElementById("freshRecoveryEmail").value.trim();const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:(cfg.authUrl||location.origin+location.pathname)+"?recovery=1"});if(error){notice.textContent=error.message;notice.className="notice show error";return}notice.textContent="A fresh recovery email has been sent. Open the newest email only.";notice.className="notice show success";};
 }
 try{
   if(q.get("code")){
     const {error}=await client.auth.exchangeCodeForSession(q.get("code"));
     if(error)throw error;
   } else if(h.get("access_token")&&h.get("refresh_token")) {
     const {error}=await client.auth.setSession({access_token:h.get("access_token"),refresh_token:h.get("refresh_token")});
     if(error)throw error;
   }
   const {data:{session}}=await client.auth.getSession();
   if(!session)return showFreshRequest();
   showRecoveryForm();
   form.innerHTML='<header><p>SECURE RECOVERY</p><h2>Choose a new password</h2><span>Use a unique password you have never used before.</span></header><label>New password<div class="input-wrap"><input id="finalNewPassword" type="password" autocomplete="new-password" placeholder="At least 12 characters" minlength="12" required><button class="reveal" id="finalReveal" type="button">Show</button></div></label><button class="primary-btn" type="submit">Update password securely <span>→</span></button>';
   document.getElementById("finalReveal").onclick=()=>{const i=document.getElementById("finalNewPassword");i.type=i.type==="password"?"text":"password";document.getElementById("finalReveal").textContent=i.type==="password"?"Show":"Hide"};
   form.onsubmit=async e=>{e.preventDefault();const p=document.getElementById("finalNewPassword").value;if(p.length<12||!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p)||!/[^A-Za-z0-9]/.test(p)){notice.textContent="Use 12+ characters, mixed case, a number and a symbol.";notice.className="notice show error";return}const {error}=await client.auth.updateUser({password:p});if(error){notice.textContent=error.message;notice.className="notice show error";return}await client.auth.signOut();history.replaceState({},document.title,"auth.html?v=12");notice.textContent="Password updated successfully. Sign in with your new password.";notice.className="notice show success";setTimeout(()=>location.replace("auth.html?v=12"),1200)};
 }catch(e){showFreshRequest(e.message||"Recovery link could not be verified.")}
})();
