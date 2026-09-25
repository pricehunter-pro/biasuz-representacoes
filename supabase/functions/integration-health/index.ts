import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"https://bia.dunihub.online",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

async function getJson(url:string,apiKey:string){
  try{
    const r=await fetch(url,{headers:{apikey:apiKey}});
    const text=await r.text();
    let data:any=null;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}
    return {ok:r.ok,status:r.status,data};
  }catch(e){return {ok:false,status:0,data:{error:String(e)}}}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const auth=req.headers.get("Authorization")||"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const client=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user||user.app_metadata?.role!=="admin")return out({error:"forbidden"},403);

  const base=(Deno.env.get("EVOLUTION_API_URL")||"").replace(/\/$/,"");
  const key=Deno.env.get("EVOLUTION_API_KEY")||"";
  const instance=Deno.env.get("EVOLUTION_INSTANCE")||"";
  const configured=!!(base&&key&&instance);

  let probe:any={ok:false,status:0,route:null,data:null};
  if(configured){
    const routes=[
      "/instance/connectionState/"+encodeURIComponent(instance),
      "/instance/status"
    ];
    for(const route of routes){
      const r=await getJson(base+route,key);
      probe={...r,route};
      if(r.ok)break;
    }
  }

  const d=probe?.data||{};
  const state=d?.instance?.state||d?.state||(d?.data?.loggedIn===true?"connected":d?.data?.connected===true?"connecting":null);

  return out({
    evolution:{
      configured,
      base_url_configured:!!base,
      api_key_configured:!!key,
      instance_configured:!!instance,
      probe_ok:!!probe.ok,
      probe_status:probe.status,
      probe_route:probe.route,
      connection_state:state||null
    }
  });
});