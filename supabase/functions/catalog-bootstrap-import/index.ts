
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const safePath=(p:string)=>p.split("/").map(x=>encodeURIComponent(x)).join("/");
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 try{
  const body=await req.json();
  const supaUrl=Deno.env.get("SUPABASE_URL")!;
  const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
  const serviceKey=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!serviceKey)throw new Error("Service key unavailable");
  const db=createClient(supaUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=req.headers.get("authorization")||"",token=auth.toLowerCase().startsWith("bearer ")?auth.slice(7):"";
  if(!token)return Response.json({ok:false,error:"Unauthorized"},{status:401});
  const {data:{user},error:ue}=await db.auth.getUser(token);
  if(ue||!user||user.app_metadata?.role!=="admin")return Response.json({ok:false,error:"Admin role required"},{status:403});
  if(!body.remote_url||!body.brand_slug||!body.title) return Response.json({ok:false,error:"Missing required fields"},{status:400});
  const {data:brand,error:be}=await db.from("representadas").select("id,name,slug").eq("slug",body.brand_slug).single();if(be)throw be;
  const remote=await fetch(body.remote_url);if(!remote.ok||!remote.body)throw new Error("Remote download failed: "+remote.status);
  const storagePath=String(body.storage_path||brand.slug+"/"+crypto.randomUUID()+".pdf");
  const put=await fetch(supaUrl+"/storage/v1/object/catalogs/"+safePath(storagePath),{method:"POST",headers:{"Authorization":"Bearer "+serviceKey,"apikey":serviceKey,"Content-Type":body.mime_type||"application/pdf","x-upsert":"true"},body:remote.body});
  if(!put.ok)throw new Error("Storage upload failed: "+put.status+" "+await put.text());
  const row={representada_id:brand.id,title:body.title,slug:body.catalog_slug||String(body.title).toLowerCase().replace(/[^a-z0-9]+/g,"-"),description:body.description||null,catalog_type:body.catalog_type||"general",year:body.year||null,source_type:"drive",file_name:body.file_name||body.title+".pdf",mime_type:body.mime_type||"application/pdf",size_bytes:body.size_bytes||null,storage_bucket:"catalogs",storage_path:storagePath,drive_file_id:body.drive_file_id||null,drive_url:body.drive_url||null,page_count:body.page_count||null,status:"uploaded",published:false,created_by:user.id,extraction_summary:{imported_from_remote:true,imported_at:new Date().toISOString()}};
  const {data:catalog,error:ce}=await db.from("catalogs").upsert(row,{onConflict:"representada_id,slug"}).select("*").single();if(ce)throw ce;
  return Response.json({ok:true,catalog_id:catalog.id,storage_path:storagePath});
 }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
