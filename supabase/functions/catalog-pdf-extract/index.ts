
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as pdfjsLib from "npm:pdfjs-dist@4.8.69/legacy/build/pdf.mjs";

const clean=(s:string)=>String(s||"").replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").trim();
const money=(s:string)=>{const n=Number(String(s).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",","."));return Number.isFinite(n)?n:null};
function candidateKey(x:any){return [x.sku||"",x.external_code||"",x.detected_name||"",x.page_number||""].join("|").toLowerCase()}
function parsePage(text:string,page:number,brand:string){
  const out:any[]=[]; const t=clean(text);
  const push=(x:any)=>{if(x.detected_name&&String(x.detected_name).trim().length>2)out.push({...x,page_number:page})};

  if(brand==="jambo-pet"){
    const re=/(\d{4,6})\s*-\s*(JB[A-Z0-9-]+)\s+([A-ZÁÉÍÓÚÃÕÇ0-9][A-ZÁÉÍÓÚÃÕÇ0-9 \-\/&.,+]{5,180}?)(?=\s+(?:Tam\.?:|TAMANHO:|Mat\.?:|MATERIAL:|Emb\.?:|EMBALAGEM:|Código|$))/g;
    for(const m of t.matchAll(re)){
      const tail=t.slice(m.index!+m[0].length,m.index!+m[0].length+500);
      const dims=(tail.match(/(?:Tam\.?|TAMANHO)\s*:?\s*([0-9., xXcmCM]+)/i)||[])[1]||null;
      const mat=(tail.match(/(?:Mat\.?|MATERIAL)\s*:?\s*([^\n]{2,90}?)(?=\s+(?:Emb\.?|EMBALAGEM|Peso|PESO|$))/i)||[])[1]||null;
      const emb=(tail.match(/(?:Emb\.?|EMBALAGEM)\s*:?\s*([^\n]{2,100})/i)||[])[1]||null;
      const ean=(tail.match(/\b(789\d{10}|790\d{10})\b/)||[])[1]||null;
      push({external_code:m[1],sku:m[2],ean,detected_name:m[3].trim(),dimensions:dims,package_info:emb,description:mat?("Material: "+mat):null,confidence:.98,raw_data:{material:mat}});
    }
  }

  if(brand==="german-hart"){
    const re=/([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 \-\/&+]{2,55}?)\s+SKU\s+([A-Z]?\d{3,6})\b/gi;
    for(const m of t.matchAll(re)){
      let name=m[1].replace(/\b(PORTA\s*PETISCOS|AROMA|COM LED|FLUTUAÇÃO)\b/gi,"").trim();
      if(name.length>2) push({sku:m[2],detected_name:name,confidence:.94});
    }
  }

  if(brand==="dentalight"){
    const codes=[...t.matchAll(/(?:Código|CODIGO)\s*:?\s*(\d{3,8})/gi)];
    for(const cm of codes){
      const before=t.slice(Math.max(0,cm.index!-180),cm.index!).split("\n").filter(Boolean).slice(-4).join(" ");
      const after=t.slice(cm.index!+cm[0].length,cm.index!+cm[0].length+350);
      const nm=(before.match(/([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ0-9 \-\/&+]{5,100})$/)||[])[1]||before;
      const wt=(after.match(/(?:Peso|PESO)\s*:?\s*([0-9.,]+\s*(?:g|kg))/i)||[])[1]||null;
      const pm=(after.match(/R\$\s*([\d.]+,\d{2})/i)||[])[1]||null;
      push({external_code:cm[1],sku:cm[1],detected_name:nm.trim().slice(0,150),weight:wt,detected_price:pm?money(pm):null,confidence:.9});
    }
  }

  if(brand==="raw-raw"){
    const prices=[...t.matchAll(/R\$\s*([\d.]+,\d{2})/g)];
    for(const pm of prices){
      const before=t.slice(Math.max(0,pm.index!-220),pm.index!).split("\n").filter(x=>x.trim().length>2).slice(-5);
      const name=(before.reverse().find(x=>!/preço|validade|pack|desconto|pedido|frete|pix|boleto|shelf|life/i.test(x))||"").trim();
      if(name.length>3)push({detected_name:name.slice(0,150),detected_price:money(pm[1]),confidence:.72});
    }
  }

  const uniq=new Map<string,any>();for(const x of out)uniq.set(candidateKey(x),x);return [...uniq.values()];
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{
    const body=await req.json().catch(()=>({}));
    const supaUrl=Deno.env.get("SUPABASE_URL")!;
    const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
    const serviceKey=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!serviceKey)throw new Error("Service credentials unavailable");
    const db=createClient(supaUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

    const h=req.headers.get("authorization")||"";const token=h.toLowerCase().startsWith("bearer ")?h.slice(7):"";
    const {data:{user},error:authError}=await db.auth.getUser(token);
    if(authError||!user||user.app_metadata?.role!=="admin")return Response.json({ok:false,error:"Unauthorized"},{status:401});

    const {data:catalog,error:ce}=await db.from("catalogs").select("*,representadas!inner(slug,name)").eq("id",body.catalog_id).single();
    if(ce)throw ce;
    const {data:job,error:je}=await db.from("catalog_import_jobs").insert({catalog_id:catalog.id,status:"processing",parser_version:"pdfjs-4.8.69+biasuz-1",started_at:new Date().toISOString()}).select("*").single();
    if(je)throw je;
    await db.from("catalogs").update({status:"processing"}).eq("id",catalog.id);

    try{
      const dl=await fetch(supaUrl+"/storage/v1/object/authenticated/catalogs/"+catalog.storage_path,{headers:{Authorization:"Bearer "+serviceKey,apikey:serviceKey}});
      if(!dl.ok)throw new Error("Storage download failed "+dl.status+" "+await dl.text());
      const bytes=new Uint8Array(await dl.arrayBuffer());
      const pdf=await pdfjsLib.getDocument({data:bytes,disableWorker:true,isEvalSupported:false,useWorkerFetch:false}).promise;
      const total=pdf.numPages;let processed=0;let all:any[]=[];let lowTextPages:number[]=[];
      for(let p=1;p<=total;p++){
        const page=await pdf.getPage(p);const tc=await page.getTextContent({includeMarkedContent:false});
        let txt="";for(const it of tc.items as any[]){if(typeof it.str==="string")txt+=it.str+(it.hasEOL?"\n":" ")}
        txt=clean(txt);if(txt.length<45)lowTextPages.push(p);
        const parsed=parsePage(txt,p,catalog.representadas.slug);
        all.push(...parsed);
        await db.from("catalog_pages").upsert({catalog_id:catalog.id,page_number:p,extracted_text:txt,ocr_used:false,metadata:{text_length:txt.length,ocr_required:txt.length<45,candidate_count:parsed.length}},{onConflict:"catalog_id,page_number"});
        processed++;
      }
      all=[...new Map(all.map((x:any)=>[candidateKey(x),x])).values()];
      await db.from("catalog_product_candidates").delete().eq("catalog_id",catalog.id);
      if(all.length){
        for(let i=0;i<all.length;i+=200){
          const batch=all.slice(i,i+200).map((x:any)=>({...x,catalog_id:catalog.id,representada_id:catalog.representada_id,status:x.confidence>=.9?"pending":"review"}));
          const {error:e}=await db.from("catalog_product_candidates").insert(batch);if(e)throw e;
        }
      }
      // Exact product matching by SKU/EAN only; no risky price publication.
      const {data:cands}=await db.from("catalog_product_candidates").select("*").eq("catalog_id",catalog.id);
      let matched=0,created=0,review=0;
      for(const c of cands||[]){
        let prod:any=null;
        if(c.sku){const {data}=await db.from("products").select("id,name,sku,ean").eq("representada_id",catalog.representada_id).eq("sku",c.sku).limit(1).maybeSingle();prod=data}
        if(!prod&&c.ean){const {data}=await db.from("products").select("id,name,sku,ean").eq("representada_id",catalog.representada_id).eq("ean",c.ean).limit(1).maybeSingle();prod=data}
        if(prod){
          await db.from("catalog_product_candidates").update({matched_product_id:prod.id,status:"matched"}).eq("id",c.id);
          await db.from("catalog_products").upsert({catalog_id:catalog.id,product_id:prod.id,page_number:c.page_number,source_candidate_id:c.id},{onConflict:"catalog_id,product_id"});
          matched++;continue;
        }
        if(c.confidence>=.96&&c.detected_name&&(c.sku||c.external_code)){
          const externalKey="pdf:"+catalog.id+":"+(c.sku||c.external_code);
          const row={representada_id:catalog.representada_id,external_key:externalKey,name:c.detected_name,category:c.category,subcategory:c.subcategory,description:c.description,sku:c.sku,ean:c.ean,package_info:c.package_info,unit_label:c.unit_label,attributes:{pdf_catalog_id:catalog.id,pdf_page:c.page_number,weight:c.weight,dimensions:c.dimensions,external_code:c.external_code},active:true,source_url:catalog.drive_url,source_checked_at:new Date().toISOString(),source_platform:"pdf_catalog",source_price:c.detected_price,source_currency:c.detected_price!=null?"BRL":null,source_availability:null,source_last_seen_at:new Date().toISOString(),source_metadata:{catalog_id:catalog.id,page:c.page_number,confidence:c.confidence}};
          const {data:p,error:e}=await db.from("products").upsert(row,{onConflict:"representada_id,external_key"}).select("id").single();if(e)throw e;
          await db.from("catalog_product_candidates").update({matched_product_id:p.id,status:"created"}).eq("id",c.id);
          await db.from("catalog_products").upsert({catalog_id:catalog.id,product_id:p.id,page_number:c.page_number,source_candidate_id:c.id},{onConflict:"catalog_id,product_id"});
          created++;
        }else review++;
      }
      await db.from("catalog_import_jobs").update({status:"review",pages_total:total,pages_processed:processed,candidates_count:all.length,matched_count:matched,created_count:created,review_count:review,warnings:lowTextPages.length?[{type:"ocr_required",pages:lowTextPages}]:[],completed_at:new Date().toISOString()}).eq("id",job.id);
      await db.from("catalogs").update({status:"review",page_count:total,extraction_summary:{pages:total,candidates:all.length,matched,created,review,ocr_required_pages:lowTextPages}}).eq("id",catalog.id);
      return Response.json({ok:true,catalog_id:catalog.id,pages:total,candidates:all.length,matched,created,review,ocr_required_pages:lowTextPages});
    }catch(e:any){
      await db.from("catalog_import_jobs").update({status:"failed",errors:[{message:e?.message||String(e)}],completed_at:new Date().toISOString()}).eq("id",job.id);
      await db.from("catalogs").update({status:"error"}).eq("id",catalog.id);
      throw e;
    }
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});
