import express from "express";
import { createClient } from "@supabase/supabase-js";

const required=["SUPABASE_URL","SUPABASE_SERVICE_KEY","EVOLUTION_API_URL","EVOLUTION_API_KEY","EVOLUTION_INSTANCE","INTERNAL_API_KEY","EVOLUTION_WEBHOOK_SECRET"];
for(const k of required) if(!process.env[k]) throw new Error(k+" is required");

const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const app=express();app.use(express.json({limit:"1mb"}));
const port=Number(process.env.PORT||8080);
const norm=n=>{let s=String(n||"").replace(/\D/g,"");if(s.startsWith("55")&&s.length>=12)s=s.slice(2);return s};
const authInternal=(req,res,next)=>req.get("x-internal-key")===process.env.INTERNAL_API_KEY?next():res.status(401).json({error:"unauthorized"});

async function findContact(phone){
 const p=norm(phone);
 let {data:lead}=await db.from("leads").select("id,name,company,phone").eq("phone",p).maybeSingle();
 if(!lead){const r=await db.from("leads").select("id,name,company,phone").ilike("phone","%"+p.slice(-8)+"%").limit(1);lead=r.data?.[0]}
 if(lead)return {type:"lead",record:lead};
 let {data:customer}=await db.from("customers").select("id,legal_name,trade_name,phone1,phone2,whatsapp_opt_out_at").or("phone1.eq."+p+",phone2.eq."+p).limit(1).maybeSingle();
 if(!customer){const r=await db.from("customers").select("id,legal_name,trade_name,phone1,phone2,whatsapp_opt_out_at").or("phone1.ilike.%"+p.slice(-8)+"%,phone2.ilike.%"+p.slice(-8)+"%").limit(1);customer=r.data?.[0]}
 if(customer)return {type:"customer",record:customer};return null;
}
async function logInteraction(contact,direction,summary,external_id){
 if(!contact)return;
 const row={channel:"whatsapp",direction,summary:String(summary||"").slice(0,4000),external_id:external_id||null};
 if(contact.type==="lead")row.lead_id=contact.record.id;else row.customer_id=contact.record.id;
 const {error}=await db.from("interactions").insert(row);if(error)console.error("interaction",error.message);
}
async function evolution(path,body){
 const base=process.env.EVOLUTION_API_URL.replace(/\/$/,"");
 const r=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json","apikey":process.env.EVOLUTION_API_KEY},body:JSON.stringify(body)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}};if(!r.ok)throw new Error("Evolution "+r.status+" "+text);return data;
}
app.get("/health",(_req,res)=>res.json({ok:true,service:"biasuz-evolution-bridge"}));

app.post("/send",authInternal,async(req,res)=>{
 try{
  const {phone,text,contact_type,contact_id}=req.body||{};if(!phone||!text)return res.status(400).json({error:"phone and text required"});
  if(contact_type==="customer"&&contact_id){
   const {data:c}=await db.from("customers").select("whatsapp_opt_out_at").eq("id",contact_id).maybeSingle();
   if(c?.whatsapp_opt_out_at)return res.status(409).json({error:"contact opted out"});
  }
  const number="55"+norm(phone);
  const data=await evolution("/message/sendText/"+encodeURIComponent(process.env.EVOLUTION_INSTANCE),{number,text});
  const contact=contact_id?{type:contact_type,record:{id:contact_id}}:await findContact(phone);
  await logInteraction(contact,"outbound",text,data?.key?.id||data?.id||null);
  res.json({ok:true,data});
 }catch(e){res.status(500).json({ok:false,error:e.message})}
});

app.post("/webhooks/evolution",async(req,res)=>{
 if(req.query.token!==process.env.EVOLUTION_WEBHOOK_SECRET&&req.get("x-webhook-secret")!==process.env.EVOLUTION_WEBHOOK_SECRET)return res.status(401).json({error:"unauthorized"});
 try{
  const body=req.body||{};const event=body.event||body.type||"";
  const data=body.data||body;
  const key=data.key||{};const remote=key.remoteJid||data.remoteJid||data.sender||data.from||"";
  const phone=String(remote).split("@")[0];const msg=data.message||{};
  const text=msg.conversation||msg.extendedTextMessage?.text||data.text||data.body||"";
  const fromMe=key.fromMe===true||data.fromMe===true;
  if(phone&&text){
   const contact=await findContact(phone);
   await logInteraction(contact,fromMe?"outbound":"inbound",text,key.id||data.id||null);
   const lower=String(text).trim().toLowerCase();
   if(contact?.type==="customer"&&!fromMe&&["sair","parar","stop","cancelar","remover"].includes(lower)){
    await db.from("customers").update({whatsapp_opt_out_at:new Date().toISOString(),whatsapp_marketing_allowed:false}).eq("id",contact.record.id);
   }
   if(contact?.type==="lead"&&!fromMe&&["sair","parar","stop","cancelar","remover"].includes(lower)){
    await db.from("leads").update({opt_out_at:new Date().toISOString()}).eq("id",contact.record.id);
   }
  }
  res.json({ok:true,event});
 }catch(e){res.status(500).json({ok:false,error:e.message})}
});
app.listen(port,()=>console.log("Biasuz Evolution bridge on",port));
