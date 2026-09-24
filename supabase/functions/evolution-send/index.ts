import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"https://bia.dunihub.online",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const adminClient=createClient(url,service);

  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:"unauthorized"},401);

  const {data:profile}=await userClient.from("portal_profiles").select("role,active").eq("user_id",user.id).maybeSingle();
  const isAdmin=user.app_metadata?.role==="admin";
  const isRep=profile?.active===true&&profile?.role==="representante";
  if(!isAdmin&&!isRep)return json({error:"forbidden"},403);

  const body=await req.json().catch(()=>({}));
  const outboxId=String(body?.outbox_id||"");
  if(!outboxId)return json({error:"outbox_id_required"},400);

  const {data:row,error:rowError}=await adminClient.from("whatsapp_outbox")
    .select("*,customers(id,phone1,phone2,whatsapp_marketing_allowed,whatsapp_opt_out_at)")
    .eq("id",outboxId).maybeSingle();
  if(rowError||!row)return json({error:"draft_not_found"},404);
  if(!isAdmin&&row.created_by!==user.id)return json({error:"not_owner"},403);
  if(!["draft","approved","error"].includes(row.status))return json({error:"invalid_status",status:row.status},409);

  const customer=(row as any).customers;
  if(customer?.whatsapp_opt_out_at)return json({error:"customer_opted_out"},409);
  if(row.campaign_id&&customer&&!customer.whatsapp_marketing_allowed)return json({error:"marketing_consent_required"},409);

  const base=(Deno.env.get("EVOLUTION_API_URL")||"").replace(/\/$/,"");
  const apiKey=Deno.env.get("EVOLUTION_API_KEY")||"";
  const instance=Deno.env.get("EVOLUTION_INSTANCE")||"";
  if(!base||!apiKey||!instance)return json({error:"evolution_not_configured",required:["EVOLUTION_API_URL","EVOLUTION_API_KEY","EVOLUTION_INSTANCE"]},503);

  let number=String(row.recipient||customer?.phone1||customer?.phone2||"").replace(/\D/g,"");
  if(number.length>=10&&number.length<=11)number="55"+number;
  if(number.length<12)return json({error:"invalid_recipient"},400);

  await adminClient.from("whatsapp_outbox").update({status:"sending",approved_at:new Date().toISOString(),error_message:null}).eq("id",row.id);
  const endpoint=base+"/message/sendText/"+encodeURIComponent(instance);
  const send=(payload:unknown)=>fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":apiKey},body:JSON.stringify(payload)});

  let response=await send({number,text:row.message,delay:1200,linkPreview:false});
  let raw=await response.text();let parsed:any={};try{parsed=JSON.parse(raw)}catch{parsed={raw:raw.slice(0,4000)}}
  if(!response.ok&&/textMessage/i.test(raw)){
    response=await send({number,options:{delay:1200,presence:"composing"},textMessage:{text:row.message}});
    raw=await response.text();try{parsed=JSON.parse(raw)}catch{parsed={raw:raw.slice(0,4000)}}
  }
  if(!response.ok){
    await adminClient.from("whatsapp_outbox").update({status:"error",provider_response:parsed,error_message:"HTTP "+response.status}).eq("id",row.id);
    return json({error:"evolution_send_failed",status:response.status,response:parsed},502);
  }
  const providerId=parsed?.key?.id||parsed?.response?.key?.id||null;
  await adminClient.from("whatsapp_outbox").update({status:"sent",provider_message_id:providerId,provider_response:parsed,sent_at:new Date().toISOString(),error_message:null}).eq("id",row.id);
  return json({ok:true,id:row.id,provider_message_id:providerId,response:parsed});
});