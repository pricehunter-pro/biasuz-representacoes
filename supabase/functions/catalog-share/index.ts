
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const hex=(a:Uint8Array)=>[...a].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha256(s:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))))}
function token(){const a=new Uint8Array(24);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}

Deno.serve(async(req:Request)=>{
  try{
    const url=new URL(req.url);
    const supaUrl=Deno.env.get("SUPABASE_URL")!;
    const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
    const serviceKey=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!serviceKey)throw new Error("Service key unavailable");
    const db=createClient(supaUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

    if(req.method==="GET"){
      const t=url.searchParams.get("token");if(!t)return Response.json({ok:false,error:"Token required"},{status:400});
      const h=await sha256(t);
      const {data:share,error}=await db.from("catalog_share_links").select("*,catalogs(*,representadas(name,slug,logo_url))").eq("token_hash",h).maybeSingle();
      if(error)throw error;if(!share)return Response.json({ok:false,error:"Link inválido"},{status:404});
      if(share.revoked_at)return Response.json({ok:false,error:"Link revogado"},{status:410});
      if(share.expires_at&&Date.parse(share.expires_at)<Date.now())return Response.json({ok:false,error:"Link expirado"},{status:410});
      const cat=share.catalogs;if(!cat?.storage_path)return Response.json({ok:false,error:"Arquivo indisponível"},{status:404});
      const {data:signed,error:se}=await db.storage.from(cat.storage_bucket||"catalogs").createSignedUrl(cat.storage_path,3600);
      if(se)throw se;
      await db.from("catalog_share_links").update({download_count:(share.download_count||0)+1,last_download_at:new Date().toISOString()}).eq("id",share.id);
      return Response.json({ok:true,catalog:{id:cat.id,title:cat.title,description:cat.description,file_name:cat.file_name,catalog_type:cat.catalog_type,year:cat.year,brand:cat.representadas},signed_url:signed.signedUrl});
    }

    if(req.method!=="POST")return new Response("Method not allowed",{status:405});
    const body=await req.json();
    const auth=req.headers.get("authorization")||"",jwt=auth.toLowerCase().startsWith("bearer ")?auth.slice(7):"";
    if(!jwt)return Response.json({ok:false,error:"Unauthorized"},{status:401});
    const {data:{user},error:ue}=await db.auth.getUser(jwt);
    if(ue||!user)return Response.json({ok:false,error:"Unauthorized"},{status:401});
    const {data:cat,error:ce}=await db.from("catalogs").select("id,title,published,storage_bucket,storage_path").eq("id",body.catalog_id).single();if(ce)throw ce;
    if(body.action==="access"){
      if(!cat.published)return Response.json({ok:false,error:"Catalog not published"},{status:403});
      if(!user)return Response.json({ok:false,error:"Unauthorized"},{status:401});
      const {data:signed,error:se}=await db.storage.from(cat.storage_bucket||"catalogs").createSignedUrl(cat.storage_path,3600);
      if(se)throw se;
      return Response.json({ok:true,signed_url:signed.signedUrl});
    }
    if(!["admin","representante"].includes(user.app_metadata?.role))return Response.json({ok:false,error:"Forbidden"},{status:403});
    const raw=token(),hash=await sha256(raw),days=Math.max(1,Math.min(Number(body.expires_days||30),365));
    const {data:share,error:ie}=await db.from("catalog_share_links").insert({
      catalog_id:cat.id,token_hash:hash,recipient_customer_id:body.customer_id||null,
      recipient_email:body.email||null,recipient_phone:body.phone||null,channel:body.channel||"link",
      expires_at:new Date(Date.now()+days*86400000).toISOString(),created_by:user.id
    }).select("id,expires_at").single();
    if(ie)throw ie;
    return Response.json({ok:true,id:share.id,token:raw,expires_at:share.expires_at,path:"/catalog-share.html?t="+encodeURIComponent(raw)});
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
