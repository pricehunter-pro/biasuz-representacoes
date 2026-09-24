
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const enc=new TextEncoder();
async function sha256(s:string){const b=await crypto.subtle.digest("SHA-256",enc.encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
Deno.serve(async(req:Request)=>{
  try{
    const url=new URL(req.url);
    const supaUrl=Deno.env.get("SUPABASE_URL")!;
    const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
    const key=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!key)throw new Error("Service credentials unavailable");
    const db=createClient(supaUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
    if(req.method==="POST"){
      const h=req.headers.get("authorization")||"";const jwt=h.toLowerCase().startsWith("bearer ")?h.slice(7):"";
      const {data:{user},error}=await db.auth.getUser(jwt);
      if(error||!user||!["admin","representante"].includes(user.app_metadata?.role))return Response.json({ok:false,error:"Unauthorized"},{status:401});
      const body=await req.json();const raw=token(),hash=await sha256(raw);
      const {data:cat,error:ce}=await db.from("catalogs").select("id,title,storage_path").eq("id",body.catalog_id).single();if(ce)throw ce;
      const expires=body.expires_hours?new Date(Date.now()+Number(body.expires_hours)*3600000).toISOString():new Date(Date.now()+30*86400000).toISOString();
      const {data:row,error:ie}=await db.from("catalog_share_links").insert({catalog_id:cat.id,token_hash:hash,recipient_customer_id:body.customer_id||null,recipient_email:body.email||null,recipient_phone:body.phone||null,channel:body.channel||"link",expires_at:expires,created_by:user.id}).select("id").single();if(ie)throw ie;
      return Response.json({ok:true,id:row.id,url:"https://bia.dunihub.online/catalogo.html?t="+raw,expires_at:expires});
    }
    if(req.method==="GET"){
      const raw=url.searchParams.get("token")||"";if(!raw)return Response.json({ok:false,error:"Token required"},{status:400});
      const hash=await sha256(raw);
      const {data:link,error:le}=await db.from("catalog_share_links").select("*,catalogs!inner(id,title,description,file_name,storage_path,page_count,representadas!inner(name,slug,logo_url))").eq("token_hash",hash).maybeSingle();
      if(le||!link)return Response.json({ok:false,error:"Link inválido"},{status:404});
      if(link.revoked_at|| (link.expires_at&&new Date(link.expires_at).getTime()<Date.now()))return Response.json({ok:false,error:"Link expirado"},{status:410});
      const {data:signed,error:se}=await db.storage.from("catalogs").createSignedUrl(link.catalogs.storage_path,3600);if(se)throw se;
      if(url.searchParams.get("mode")==="download"){
        await db.from("catalog_share_links").update({download_count:Number(link.download_count||0)+1,last_download_at:new Date().toISOString()}).eq("id",link.id);
        return Response.redirect(signed.signedUrl,302);
      }
      return Response.json({ok:true,title:link.catalogs.title,description:link.catalogs.description,file_name:link.catalogs.file_name,page_count:link.catalogs.page_count,brand:link.catalogs.representadas.name,logo_url:link.catalogs.representadas.logo_url,download_url:url.origin+url.pathname+"?token="+encodeURIComponent(raw)+"&mode=download",expires_at:link.expires_at});
    }
    return new Response("Method not allowed",{status:405});
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
