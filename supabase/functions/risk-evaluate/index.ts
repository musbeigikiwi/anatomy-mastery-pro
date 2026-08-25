import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin=Deno.env.get("ALLOWED_ORIGIN")||"https://musbeigikiwi.github.io";
const cors={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const clean=(v:unknown,n=120)=>typeof v==="string"?v.slice(0,n):null;

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405,headers:cors});
  try{
    const origin=req.headers.get("origin");if(origin&&origin!==allowedOrigin)throw new Error("Forbidden origin");
    const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))throw new Error("Unauthorized");
    const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const token=auth.slice(7);const {data:{user},error}=await admin.auth.getUser(token);if(error||!user)throw new Error("Unauthorized");
    const {data:profile}=await admin.from("profiles").select("role,status").eq("id",user.id).maybeSingle();
    if(!profile||profile.status!=="active")throw new Error("Unauthorized");
    const isAdmin=profile.role==="admin";

    const body=await req.json().catch(()=>({}));const sessionId=clean(body.sessionId,80);
    const forwarded=(req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"").split(",")[0].trim();const ip=forwarded||"unknown";
    const ipHash=await hash(ip+(Deno.env.get("IP_HASH_SALT")||""));
    let countryCode:string|null=null,city:string|null=null,region:string|null=null,vpn=false,tor=false,proxy=false,hosting=false,privacyKnown=false;
    const ipinfoToken=Deno.env.get("IPINFO_TOKEN");
    if(ipinfoToken&&ip!=="unknown"){
      try{
        const intel=await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(ipinfoToken)}`,{headers:{Accept:"application/json"}});
        if(intel.ok){
          const d=await intel.json();
          countryCode=clean(d.country,8)?.toUpperCase()||null;city=clean(d.city,100);region=clean(d.region,100);
          const p=d.privacy||null;if(p){privacyKnown=true;vpn=!!p.vpn;tor=!!p.tor;proxy=!!p.proxy;hosting=!!p.hosting}
        }
      }catch{}
    }

    const ua=(req.headers.get("user-agent")||"").slice(0,220),secureContext=body.secureContext!==false,legacyBrowser=!!body.legacyBrowser,webdriver=!!body.webdriver;
    const foreignCountry=countryCode!=="NZ";
    const anonymized=vpn||proxy||tor;
    const unknownNetwork=countryCode===null;

    let score=0;
    if(body.newDevice)score+=20;if(body.newCountry)score+=20;if(vpn)score+=60;if(proxy)score+=70;if(hosting)score+=30;if(tor)score+=100;
    if(foreignCountry)score+=100;if(unknownNetwork)score+=100;if(!secureContext)score+=100;if(legacyBrowser)score+=25;if(webdriver)score+=10;
    score=Math.min(score,100);

    // Students are hard-geofenced to New Zealand and blocked on VPN/proxy/Tor.
    // Admins retain emergency access but still generate risk alerts.
    let decision:"allow"|"verify"|"block"="allow";
    let blockReason:string|null=null;
    if(!isAdmin){
      if(unknownNetwork){decision="block";blockReason="network_location_unverified"}
      else if(foreignCountry){decision="block";blockReason="outside_new_zealand"}
      else if(anonymized){decision="block";blockReason=tor?"tor_not_allowed":proxy?"proxy_not_allowed":"vpn_not_allowed"}
      else if(!secureContext){decision="block";blockReason="unsafe_browser_context"}
      else if(score>=45){decision="verify"}
    }else if(score>=75){decision="verify"}

    const metadata={signals:{newDevice:!!body.newDevice,newCountry:!!body.newCountry,vpn,tor,proxy,hosting,privacyKnown,secureContext,legacyBrowser,webdriver,foreignCountry,unknownNetwork},browser:{name:clean(body.browserName,50),version:clean(body.browserVersion,30)},network:{city,region,countryCode},policy:{nzOnly:true,anonymizersBlocked:true,adminBypass:isAdmin,blockReason}};
    await admin.from("security_events").insert({user_id:user.id,event_type:decision==="block"?"access_blocked":"risk_evaluation",risk_score:score,decision,ip_hash:ipHash,country_code:countryCode,device_hash:clean(body.deviceHash,80),user_agent_summary:ua,metadata});
    if(sessionId)await admin.from("session_activity").update({ip_hash:ipHash,country_code:countryCode,city,region,vpn,tor,decision,user_agent_summary:ua}).eq("id",sessionId).eq("user_id",user.id);
    return Response.json({decision,blockReason,riskScore:score,countryCode,city,region,vpn,tor,proxy,hosting,privacyKnown,browserPosture:!secureContext?"unsafe-context":legacyBrowser?"legacy":"modern",policy:{nzOnly:true,anonymizersBlocked:true,adminBypass:isAdmin}},{headers:{...cors,"Cache-Control":"no-store"}});
  }catch(e){const msg=e instanceof Error?e.message:"Request rejected";const status=msg==="Unauthorized"?401:msg==="Forbidden origin"?403:400;return Response.json({error:status===401?"Unauthorized":status===403?"Forbidden":"Request rejected"},{status,headers:{...cors,"Cache-Control":"no-store"}})}
});
