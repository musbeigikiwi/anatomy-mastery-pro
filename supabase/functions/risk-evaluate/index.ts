import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":Deno.env.get("ALLOWED_ORIGIN")||"https://musbeigikiwi.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,"0")).join("");
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization"); if(!auth)throw new Error("Unauthorized");
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const token=auth.replace("Bearer ",""); const {data:{user},error}=await admin.auth.getUser(token); if(error||!user)throw new Error("Unauthorized");
  const body=await req.json(); const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0].trim()||"unknown";
  const ipHash=await hash(forwarded+(Deno.env.get("IP_HASH_SALT")||""));
  let score=0; if(body.newDevice)score+=30;if(body.newCountry)score+=25;if(body.vpn)score+=25;if(body.tor)score+=55;if(body.failedAttempts>3)score+=20;score=Math.min(score,100);
  const decision=score>=75?"block":score>=45?"verify":"allow";
  await admin.from("security_events").insert({user_id:user.id,event_type:"risk_evaluation",risk_score:score,decision,ip_hash:ipHash,country_code:body.countryCode||null,device_hash:body.deviceHash||null,user_agent_summary:(req.headers.get("user-agent")||"").slice(0,220),metadata:{signals:{newDevice:!!body.newDevice,newCountry:!!body.newCountry,vpn:!!body.vpn,tor:!!body.tor}}});
  return Response.json({decision,riskScore:score},{headers:{...cors,"Cache-Control":"no-store"}});
 }catch(e){return Response.json({error:e.message==="Unauthorized"?"Unauthorized":"Request rejected"},{status:e.message==="Unauthorized"?401:400,headers:{...cors,"Cache-Control":"no-store"}})}
});
