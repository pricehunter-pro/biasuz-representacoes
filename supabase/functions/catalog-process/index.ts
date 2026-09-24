
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as pdfjsLib from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const clean=(s:any)=>String(s??"").replace(/\s+/g," ").trim();
const money=(s:string)=>{
  const x=String(s||"").replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(x);return Number.isFinite(n)?n:null;
};
const norm=(s:any)=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();

function pageText(items:any[]){
  const rows=items.map((x:any)=>({str:String(x.str||""),x:Number(x.transform?.[4]||0),y:Number(x.transform?.[5]||0)})).filter(x=>x.str.trim());
  rows.sort((a,b)=>Math.abs(b.y-a.y)>2?b.y-a.y:a.x-b.x);
  let out="",lastY:any=null;
  for(const r of rows){
    if(lastY===null||Math.abs(lastY-r.y)>2){out+=(out?"\n":"")+r.str.trim();lastY=r.y}
    else out+=" "+r.str.trim();
  }
  return out;
}

function genericCandidates(text:string,page:number){
  const lines=text.split(/\n+/).map(clean).filter(Boolean);
  const out:any[]=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    let sku=null,name=null,price=null,code=null;
    const skuM=l.match(/\bSKU\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
    const codeM=l.match(/\b(?:COD(?:IGO)?|CÓDIGO)\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
    const jamboM=l.match(/\b(\d{3,6})\s*-\s*([A-Za-z]{1,5}\d{3,8}[A-Za-z]?)\b/);
    if(jamboM){ code=jamboM[1]; sku=jamboM[2]; name=lines[i+1]||null; }
    else if(skuM){ sku=skuM[1]; name=(lines[i-1]&&!/SKU/i.test(lines[i-1]))?lines[i-1]:lines[i+1]||null; }
    else if(codeM){ code=codeM[1]; name=(lines[i-1]&&!/COD/i.test(lines[i-1]))?lines[i-1]:lines[i+1]||null; }
    if(!sku&&!code) continue;

    for(let j=i;j<Math.min(lines.length,i+8);j++){
      const pm=lines[j].match(/R\$\s*([\d.]+,\d{2})/i);
      if(pm){price=money(pm[1]);break}
    }
    const dim=(lines.slice(i,Math.min(lines.length,i+8)).find(x=>/Tam\.|TAMANHO|x\s*\d+\s*cm/i.test(x))||"").replace(/^Tam\.?\s*:/i,"").trim()||null;
    const weight=(lines.slice(i,Math.min(lines.length,i+8)).find(x=>/\b(?:Peso|Capacidade)\b/i.test(x))||"").replace(/^.*?:/,"").trim()||null;
    const pkg=(lines.slice(i,Math.min(lines.length,i+10)).find(x=>/\bEmb\.|Embalagem\b/i.test(x))||"").replace(/^.*?:/,"").trim()||null;
    if(name && name.length>2 && name.length<220){
      out.push({page_number:page,detected_name:name,sku,external_code:code,detected_price:price,dimensions:dim,weight,package_info:pkg,confidence:sku&&name?0.84:0.7,raw_data:{anchor:l}});
    }
  }
  return out;
}

function rawRawCandidates(text:string,page:number){
  const lines=text.split(/\n+/).map(clean).filter(Boolean);
  const names:any[]=[];const codes:any[]=[];const prices:any[]=[];
  lines.forEach((l,i)=>{
    if(/\b(?:cod|cód)\s*:\s*([A-Za-z0-9._/-]+)/i.test(l)){const m=l.match(/\b(?:cod|cód)\s*:\s*([A-Za-z0-9._/-]+)/i);codes.push({i,code:m?.[1]})}
    if(/^R\$\s*[\d.]+,\d{2}$/.test(l)){prices.push({i,price:money(l)})}
    if(/\|\s*(?:\d+\s*(?:g|kg)|\d+\s*unidades|unitária|unitaria|bag)/i.test(l)&&!/^R\$/.test(l)){names.push({i,name:l})}
  });
  const out:any[]=[];
  for(const c of codes){
    const n=names.filter(x=>Math.abs(x.i-c.i)<=10).sort((a,b)=>Math.abs(a.i-c.i)-Math.abs(b.i-c.i))[0];
    if(!n)continue;
    const p=prices.filter(x=>Math.abs(x.i-n.i)<=8).sort((a,b)=>Math.abs(a.i-n.i)-Math.abs(b.i-n.i))[0];
    out.push({page_number:page,detected_name:n.name,sku:String(c.code),external_code:String(c.code),detected_price:p?.price??null,confidence:p?0.9:0.82,raw_data:{source:"raw_raw"}});
  }
  return out;
}

function dentalightCandidates(text:string,page:number){
  const lines=text.split(/\n+/).map(clean).filter(Boolean);const out:any[]=[];
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^(?:SKU|Código|Codigo)\s*[:#-]?\s*(\d{3,8})/i);if(!m)continue;
    const sku=m[1];
    let name=null,price=null,weight=null,pkg=null;
    for(let j=Math.max(0,i-8);j<Math.min(lines.length,i+12);j++){
      const l=lines[j];
      if(!name && j!==i && l.length>5 && l.length<120 && !/^(Peso|Qtd|SKU|Código|Codigo|R\$|Linha|Valor|FARDO|VENDA|Validade|Sabor|Tamanho|Textura|Composição)/i.test(l)) name=l;
      const pm=l.match(/R\$\s*([\d.]+,\d{2})/);if(pm&&!price)price=money(pm[1]);
      if(/Peso\s*:/i.test(l))weight=l.replace(/^.*Peso\s*:/i,"").trim();
      if(/FARDO C\/|DISPLAY C\/|Qtd\s*:/i.test(l))pkg=(pkg?pkg+" | ":"")+l;
    }
    if(name)out.push({page_number:page,detected_name:name,sku,external_code:sku,detected_price:price,weight,package_info:pkg,confidence:0.86,raw_data:{source:"dentalight"}});
  }
  return out;
}

function evoCandidates(text:string,page:number){
  const lines=text.split(/\n+/).map(clean).filter(Boolean);const out:any[]=[];
  for(const l of lines){
    if(/^(Vaso|Floreira|Cachepot)\s+/i.test(l)&&l.length<100){
      out.push({page_number:page,detected_name:l,category:"Garden",subcategory:"Vasos",confidence:0.72,raw_data:{source:"evo_campaign"}});
    }
  }
  return out;
}

async function processCatalog(db:any,catalog:any){
  const {data:job,error:je}=await db.from("catalog_import_jobs").insert({catalog_id:catalog.id,status:"processing",parser_version:"pdfjs-heuristics-v1",started_at:new Date().toISOString()}).select("*").single();
  if(je)throw je;
  try{
    const {data:file,error:de}=await db.storage.from("catalogs").download(catalog.storage_path);if(de)throw de;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjsLib.getDocument({data:bytes,disableFontFace:true,useSystemFonts:false,isEvalSupported:false}).promise;
    const candidates:any[]=[];let ocrNeeded=0;
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p);const tc=await page.getTextContent();const text=pageText(tc.items as any[]);
      const needsOcr=text.replace(/\s+/g,"").length<30;
      if(needsOcr)ocrNeeded++;
      await db.from("catalog_pages").upsert({catalog_id:catalog.id,page_number:p,extracted_text:text||null,ocr_used:false,metadata:{needs_ocr:needsOcr,text_chars:text.length}},{onConflict:"catalog_id,page_number"});
      let cs=genericCandidates(text,p);
      if(catalog.slug.startsWith("raw-raw")) cs=[...cs,...rawRawCandidates(text,p)];
      if(catalog.slug.startsWith("dentalight")) cs=[...cs,...dentalightCandidates(text,p)];
      if(catalog.slug.startsWith("evo-")) cs=[...cs,...evoCandidates(text,p)];
      candidates.push(...cs);
    }
    const dedup=[...new Map(candidates.map((x:any)=>[(x.sku||x.external_code||x.detected_name)+"|"+x.page_number,x])).values()];
    let matched=0,created=0,review=0;
    await db.from("catalog_product_candidates").delete().eq("catalog_id",catalog.id);
    for(let i=0;i<dedup.length;i+=100){
      const batch=dedup.slice(i,i+100).map((x:any)=>({...x,catalog_id:catalog.id,representada_id:catalog.representada_id,status:"pending"}));
      const {data:ins,error:ie}=await db.from("catalog_product_candidates").insert(batch).select("*");if(ie)throw ie;
      for(const c of ins||[]){
        let product:any=null;
        if(c.sku){const r=await db.from("products").select("id,name,sku").eq("representada_id",catalog.representada_id).ilike("sku",c.sku).limit(1);product=r.data?.[0]}
        if(!product&&c.detected_name){
          const r=await db.from("products").select("id,name,sku").eq("representada_id",catalog.representada_id).ilike("name",c.detected_name).limit(1);product=r.data?.[0]
        }
        if(product){
          matched++;
          await db.from("catalog_product_candidates").update({matched_product_id:product.id,status:"matched"}).eq("id",c.id);
          await db.from("catalog_products").upsert({catalog_id:catalog.id,product_id:product.id,page_number:c.page_number,source_candidate_id:c.id},{onConflict:"catalog_id,product_id"});
          if(c.detected_price!=null){
            let {data:pt}=await db.from("price_tables").select("id").eq("catalog_id",catalog.id).eq("status","draft").limit(1).maybeSingle();
            if(!pt){
              const r=await db.from("price_tables").insert({representada_id:catalog.representada_id,catalog_id:catalog.id,name:"Importado de "+catalog.title,status:"draft",notes:"Preços extraídos automaticamente do PDF; revisar antes de publicar."}).select("id").single();pt=r.data;
            }
            if(pt) await db.from("price_table_items").upsert({price_table_id:pt.id,product_id:product.id,price:c.detected_price,min_quantity:1,source_page:c.page_number,source_text:c.detected_name,confidence:c.confidence},{onConflict:"price_table_id,product_id"});
          }
        }else{
          review++;
          await db.from("catalog_product_candidates").update({status:"review"}).eq("id",c.id);
        }
      }
      await db.from("catalog_import_jobs").update({pages_processed:pdf.numPages,candidates_count:dedup.length,matched_count:matched,created_count:created,review_count:review}).eq("id",job.id);
    }
    await db.from("catalogs").update({page_count:pdf.numPages,status:"review",extraction_summary:{pages:pdf.numPages,candidates:dedup.length,matched,created,review,ocr_needed_pages:ocrNeeded,parser:"pdfjs-heuristics-v1"}}).eq("id",catalog.id);
    await db.from("catalog_import_jobs").update({status:"review",pages_total:pdf.numPages,pages_processed:pdf.numPages,candidates_count:dedup.length,matched_count:matched,created_count:created,review_count:review,warnings:ocrNeeded?[{type:"ocr_needed",pages:ocrNeeded}]:[],completed_at:new Date().toISOString()}).eq("id",job.id);
    return {catalog_id:catalog.id,pages:pdf.numPages,candidates:dedup.length,matched,review,ocr_needed_pages:ocrNeeded};
  }catch(e:any){
    await db.from("catalog_import_jobs").update({status:"failed",errors:[{message:e?.message||String(e)}],completed_at:new Date().toISOString()}).eq("id",job.id);
    await db.from("catalogs").update({status:"error"}).eq("id",catalog.id);
    throw e;
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{
    const body=await req.json().catch(()=>({}));
    const supaUrl=Deno.env.get("SUPABASE_URL")!;
    const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
    const serviceKey=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!serviceKey)throw new Error("Service key unavailable");
    const db=createClient(supaUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

    const auth=req.headers.get("authorization")||"";const token=auth.toLowerCase().startsWith("bearer ")?auth.slice(7):"";
    if(!token)return Response.json({ok:false,error:"Unauthorized"},{status:401});
    const {data:{user},error:authError}=await db.auth.getUser(token);
    if(authError||!user||user.app_metadata?.role!=="admin")return Response.json({ok:false,error:"Admin role required"},{status:403});

    let q=db.from("catalogs").select("*").not("storage_path","is",null).in("status",["uploaded","review","error"]);
    if(body.catalog_id)q=q.eq("id",body.catalog_id);
    if(body.slug)q=q.eq("slug",body.slug);
    const {data:catalogs,error}=await q;if(error)throw error;
    const results:any[]=[];
    for(const c of catalogs||[]){
      await db.from("catalogs").update({status:"processing"}).eq("id",c.id);
      try{results.push(await processCatalog(db,c))}
      catch(e:any){results.push({catalog_id:c.id,error:e?.message||String(e)})}
    }
    return Response.json({ok:true,results});
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
