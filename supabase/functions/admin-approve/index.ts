import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async req=>{
 const origin=Deno.env.get("ALLOWED_ORIGIN")||"https://musbeigikiwi.github.io";const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Content-Type":"application/json","Cache-Control":"no-store"};
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 try{
  const bearer=req.headers.get("Authorization");if(!bearer)throw new Error("Unauthorized");
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const jwt=bearer.replace("Bearer ","");const {data:{user}}=await admin.auth.getUser(jwt);if(!user)throw new Error("Unauthorized");
  const {data:actor}=await admin.from("profiles").select("role,status").eq("id",user.id).single();if(actor?.role!=="admin"||actor?.status!=="active")throw new Error("Forbidden");
  const aal=(JSON.parse(atob(jwt.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).aal||"aal1");if(aal!=="aal2")throw new Error("MFA required");
  const {userId,role="student",reason=""}=await req.json();if(!userId)throw new Error("Missing user");
  const {error}=await admin.rpc("approve_member",{target:userId,new_role:role});if(error)throw error;
  await admin.from("admin_actions").insert({actor_id:user.id,target_user_id:userId,action:"approve_member_edge",reason});
  return new Response(JSON.stringify({ok:true}),{headers});
 }catch(e){const status=e.message==="Unauthorized"?401:e.message==="Forbidden"||e.message==="MFA required"?403:400;return new Response(JSON.stringify({error:e.message}),{status,headers})}
});
