
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const clean=(s:string)=>String(s||"").replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").trim();
const money=(s:string)=>{const n=Number(String(s).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",","."));return Number.isFinite(n)?n:null};
function key(x:any){return [x.sku||"",x.external_code||"",x.detected_name||"",x.page_number||""].join("|").toLowerCase()}
function parsePage(text:string,page:number,brand:string){
  const out:any[]=[]; const t=clean(text);
  const push=(x:any)=>{if(x.detected_name&&String(x.detected_name).trim().length>2)out.push({...x,page_number:page})};
  if(brand==="jambo-pet"){
    const re=/(\d{4,6})\s*-\s*(JB[A-Z0-9-]+)\s+([A-ZÁÉÍÓÚÃÕÇ0-9][A-ZÁÉÍÓÚÃÕÇ0-9 \-\/&.,+]{5,180}?)(?=\s+(?:Tam\.?:|TAMANHO:|Mat\.?:|MATERIAL:|Emb\.?:|EMBALAGEM:|Código|$))/g;
    for(const m of t.matchAll(re)){const tail=t.slice(m.index!+m[0].length,m.index!+m[0].length+500);push({external_code:m[1],sku:m[2],detected_name:m[3].trim(),dimensions:(tail.match(/(?:Tam\.?|TAMANHO)\s*:?\s*([0-9., xXcmCM]+)/i)||[])[1]||null,package_info:(tail.match(/(?:Emb\.?|EMBALAGEM)\s*:?\s*([^\n]{2,100})/i)||[])[1]||null,confidence:.96})}
  }
  if(brand==="german-hart"){
    const re=/([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 \-\/&+]{2,55}?)\s+SKU\s+([A-Z]?\d{3,6})\b/gi;
    for(const m of t.matchAll(re)){let name=m[1].replace(/\b(PORTA\s*PETISCOS|AROMA|COM LED|FLUTUAÇÃO)\b/gi,"").trim();if(name.length>2)push({sku:m[2],detected_name:name,confidence:.93})}
  }
  if(brand==="dentalight"){
    const re=/(?:Código|CODIGO)\s*:?\s*(\d{3,8})/gi;for(const m of t.matchAll(re)){const before=t.slice(Math.max(0,m.index!-200),m.index!).split("\n").filter(Boolean).slice(-4).join(" ");const after=t.slice(m.index!+m[0].length,m.index!+m[0].length+350);const name=(before.match(/([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ0-9 \-\/&+]{5,120})$/)||[])[1]||before;push({sku:m[1],external_code:m[1],detected_name:name.trim().slice(0,150),weight:(after.match(/(?:Peso|PESO)\s*:?\s*([0-9.,]+\s*(?:g|kg))/i)||[])[1]||null,detected_price:money((after.match(/R\$\s*([\d.]+,\d{2})/i)||[])[1]||""),confidence:.88})}
  }
  if(brand==="raw-raw"){
    const ps=[...t.matchAll(/R\$\s*([\d.]+,\d{2})/g)];for(const m of ps){const before=t.slice(Math.max(0,m.index!-220),m.index!).split("\n").filter(x=>x.trim().length>2).slice(-5).reverse();const name=(before.find(x=>!/preço|validade|pack|desconto|pedido|frete|pix|boleto|shelf|life/i.test(x))||"").trim();if(name.length>3)push({detected_name:name.slice(0,150),detected_price:money(m[1]),confidence:.7})}
  }
  return [...new Map(out.map((x:any)=>[key(x),x])).values()];
}
async function integrate(db:any,catalog:any,cands:any[]){
  let matched=0,created=0,review=0;
  for(const c of cands){
    let prod:any=null;
    if(c.sku){const {data}=await db.from("products").select("id").eq("representada_id",catalog.representada_id).eq("sku",c.sku).limit(1).maybeSingle();prod=data}
    if(!prod&&c.ean){const {data}=await db.from("products").select("id").eq("representada_id",catalog.representada_id).eq("ean",c.ean).limit(1).maybeSingle();prod=data}
    if(prod){await db.from("catalog_product_candidates").update({matched_product_id:prod.id,status:"matched"}).eq("id",c.id);await db.from("catalog_products").upsert({catalog_id:catalog.id,product_id:prod.id,page_number:c.page_number,source_candidate_id:c.id},{onConflict:"catalog_id,product_id"});matched++;continue}
    if(c.confidence>=.96&&c.detected_name&&(c.sku||c.external_code)){
      const externalKey="pdf:"+catalog.id+":"+(c.sku||c.external_code);
      const {data:p,error}=await db.from("products").upsert({representada_id:catalog.representada_id,external_key:externalKey,name:c.detected_name,sku:c.sku,ean:c.ean,package_info:c.package_info,attributes:{pdf_catalog_id:catalog.id,pdf_page:c.page_number,weight:c.weight,dimensions:c.dimensions,external_code:c.external_code},active:true,source_url:catalog.drive_url,source_checked_at:new Date().toISOString(),source_platform:"pdf_ocr",source_price:c.detected_price,source_currency:c.detected_price!=null?"BRL":null,source_last_seen_at:new Date().toISOString(),source_metadata:{catalog_id:catalog.id,page:c.page_number,confidence:c.confidence}},{onConflict:"representada_id,external_key"}).select("id").single();if(error)throw error;
      await db.from("catalog_product_candidates").update({matched_product_id:p.id,status:"created"}).eq("id",c.id);await db.from("catalog_products").upsert({catalog_id:catalog.id,product_id:p.id,page_number:c.page_number,source_candidate_id:c.id},{onConflict:"catalog_id,product_id"});created++;
    }else review++;
  }
  return {matched,created,review};
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{
    const supaUrl=Deno.env.get("SUPABASE_URL")!,sj=Deno.env.get("SUPABASE_SECRET_KEYS"),service=sj?JSON.parse(sj)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!service)throw new Error("Service key unavailable");
    const db=createClient(supaUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const h=req.headers.get("authorization")||"",jwt=h.toLowerCase().startsWith("bearer ")?h.slice(7):"";
    const {data:{user},error:ae}=await db.auth.getUser(jwt);if(ae||!user||user.app_metadata?.role!=="admin")return Response.json({ok:false,error:"Unauthorized"},{status:401});
    const body=await req.json();const {data:catalog,error:ce}=await db.from("catalogs").select("*,representadas!inner(slug)").eq("id",body.catalog_id).single();if(ce)throw ce;
    const pages=Array.isArray(body.pages)?body.pages:[];let all:any[]=[];
    for(const p of pages){
      const text=clean(p.text||"");const cands=parsePage(text,Number(p.page_number),catalog.representadas.slug);all.push(...cands);
      await db.from("catalog_pages").upsert({catalog_id:catalog.id,page_number:Number(p.page_number),ocr_text:text,ocr_used:true,preview_storage_path:p.preview_storage_path||null,metadata:{ocr_required:false,ocr_length:text.length,ocr_candidate_count:cands.length}},{onConflict:"catalog_id,page_number"});
      await db.from("catalog_product_candidates").delete().eq("catalog_id",catalog.id).eq("page_number",Number(p.page_number));
    }
    all=[...new Map(all.map((x:any)=>[key(x),x])).values()];
    if(all.length){const ins=all.map((x:any)=>({...x,catalog_id:catalog.id,representada_id:catalog.representada_id,status:x.confidence>=.9?"pending":"review"}));const {error:e}=await db.from("catalog_product_candidates").insert(ins);if(e)throw e}
    const {data:cands}=await db.from("catalog_product_candidates").select("*").eq("catalog_id",catalog.id).in("page_number",pages.map((p:any)=>Number(p.page_number)));
    const stats=await integrate(db,catalog,cands||[]);
    const {data:pending}=await db.from("catalog_pages").select("page_number,metadata").eq("catalog_id",catalog.id);
    const ocrRequired=(pending||[]).filter((x:any)=>x.metadata?.ocr_required===true).map((x:any)=>x.page_number);
    await db.from("catalogs").update({status:"review",extraction_summary:{...(catalog.extraction_summary||{}),ocr_required_pages:ocrRequired,ocr_last_applied_at:new Date().toISOString()}}).eq("id",catalog.id);
    return Response.json({ok:true,pages:pages.length,candidates:all.length,...stats,ocr_required_pages:ocrRequired});
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
