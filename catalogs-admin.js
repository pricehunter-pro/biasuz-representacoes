const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
let brands=[],catalogs=[];
const ocrCount=s=>{const v=s?.ocr_required_pages??s?.ocr_needed_pages??s?.ocr_required_remaining??0;return Array.isArray(v)?v.length:Number(v||0)};
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
async function boot(){if(!await auth())return;const {data}=await sb.from("representadas").select("id,name,slug").eq("active",true).order("name");brands=data||[];document.getElementById("brandSelect").innerHTML='<option value="">Selecione</option>'+brands.map(b=>'<option value="'+b.id+'">'+esc(b.name)+'</option>').join("");await loadCatalogs()}
async function loadCatalogs(){
 const {data,error}=await sb.from("catalogs").select("*,representadas(name,slug)").order("created_at",{ascending:false});
 const box=document.getElementById("catalogList");if(error){box.innerHTML='<p class="err">'+esc(error.message)+'</p>';return}catalogs=data||[];
 box.innerHTML=catalogs.length?catalogs.map(c=>{const s=c.extraction_summary||{},cls=c.published?"published":c.status;return '<article class="catalog"><div><strong>'+esc(c.title)+'</strong><small>'+esc(c.representadas?.name||"")+' · '+esc(c.file_name||"")+'</small></div><div><span class="badge '+cls+'">'+esc(c.published?"publicado":c.status)+'</span><small>'+(c.page_count?c.page_count+" págs.":"")+'</small></div><div><strong>'+Number(s.unique_skus??s.candidates??0)+'</strong><small>itens detectados</small></div><div><strong>'+ocrCount(s)+'</strong><small>págs. OCR</small></div><div class="actions"><button class="btn btn-small" data-candidates="'+c.id+'">Itens</button><button class="btn btn-small btn-outline" data-prices="'+c.id+'">Preços</button>'+(ocrCount(s)?'<button class="btn btn-small btn-outline" data-ocr="'+c.id+'">OCR ('+ocrCount(s)+')</button>':'')+'<button class="btn btn-small btn-outline" data-process="'+c.id+'">Processar</button><button class="btn btn-small btn-outline" data-download="'+c.id+'">Baixar</button><button class="btn btn-small btn-outline" data-share="'+c.id+'">Compartilhar</button><button class="btn btn-small '+(c.published?"btn-outline":"")+'" data-publish="'+c.id+'">'+(c.published?"Despublicar":"Publicar")+'</button></div></article>'}).join(""):'<p class="muted">Nenhum catálogo cadastrado.</p>';
 document.querySelectorAll("[data-process]").forEach(b=>b.onclick=()=>processCatalog(b.dataset.process,b));
 document.querySelectorAll("[data-prices]").forEach(b=>b.onclick=()=>showPrices(b.dataset.prices));
 document.querySelectorAll("[data-ocr]").forEach(b=>b.onclick=()=>runBrowserOcr(b.dataset.ocr,b));
 document.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>downloadCatalog(b.dataset.download));
 document.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>shareCatalog(b.dataset.share));
 document.querySelectorAll("[data-publish]").forEach(b=>b.onclick=()=>togglePublish(b.dataset.publish));
 document.querySelectorAll("[data-candidates]").forEach(b=>b.onclick=()=>showCandidates(b.dataset.candidates));
}
document.getElementById("uploadForm").onsubmit=async e=>{
 e.preventDefault();const st=document.getElementById("uploadStatus"),bar=document.getElementById("uploadBar"),d=Object.fromEntries(new FormData(e.currentTarget)),file=document.getElementById("pdfFile").files[0];
 if(!file)return;const brand=brands.find(x=>x.id===d.representada_id);if(!brand)return;
 st.className="status";st.textContent="Enviando PDF para a biblioteca privada...";bar.style.width="20%";
 const catSlug=slug(d.title)+"-"+Date.now().toString(36),path=brand.slug+"/"+catSlug+".pdf";
 const {error:ue}=await sb.storage.from("catalogs").upload(path,file,{contentType:"application/pdf",upsert:false});if(ue){st.className="status err";st.textContent=ue.message;return}
 bar.style.width="55%";
 const {data:cat,error:ce}=await sb.from("catalogs").insert({representada_id:brand.id,title:d.title,slug:catSlug,description:d.description||null,catalog_type:d.catalog_type,year:d.year?Number(d.year):null,source_type:"upload",file_name:file.name,mime_type:file.type||"application/pdf",size_bytes:file.size,storage_bucket:"catalogs",storage_path:path,status:"uploaded"}).select("*").single();
 if(ce){st.className="status err";st.textContent=ce.message;return}
 bar.style.width="70%";st.textContent="PDF armazenado. Iniciando leitura...";
 const {data,error}=await sb.functions.invoke("catalog-pdf-extract",{body:{catalog_id:cat.id}});
 bar.style.width="100%";st.className="status "+(error?"err":"ok");st.textContent=error?"Arquivo salvo; processamento ficará pendente: "+error.message:"Catálogo salvo e processado. Revise os itens detectados.";
 e.currentTarget.reset();setTimeout(()=>bar.style.width="0",1000);await loadCatalogs()
};
async function runBrowserOcr(id,btn){
 const c=catalogs.find(x=>x.id===id);if(!c)return;
 const old=btn.textContent;btn.disabled=true;btn.textContent="Preparando OCR...";
 try{
  const {data:pending,error:pe}=await sb.from("catalog_pages").select("page_number,metadata").eq("catalog_id",id).contains("metadata",{ocr_required:true}).order("page_number").limit(15);
  if(pe)throw pe;if(!pending?.length){alert("Não há páginas pendentes de OCR.");await loadCatalogs();return}
  const {data:signed,error:se}=await sb.storage.from(c.storage_bucket||"catalogs").createSignedUrl(c.storage_path,3600);if(se)throw se;
  const fr=await fetch(signed.signedUrl);if(!fr.ok)throw new Error("Não foi possível carregar o PDF.");
  const bytes=new Uint8Array(await fr.arrayBuffer());
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  const resultPages=[];
  for(let i=0;i<pending.length;i++){
    const pn=Number(pending[i].page_number);btn.textContent="OCR "+(i+1)+"/"+pending.length+" · pág. "+pn;
    const page=await pdf.getPage(pn),viewport=page.getViewport({scale:1.65}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:ctx,viewport}).promise;
    const result=await window.Tesseract.recognize(canvas,"por+eng",{logger:m=>{if(m.status==="recognizing text")btn.textContent="OCR "+(i+1)+"/"+pending.length+" · "+Math.round((m.progress||0)*100)+"%"}});
    resultPages.push({page_number:pn,text:result.data?.text||""});
  }
  btn.textContent="Aplicando leitura...";
  const {data:applied,error:ae}=await sb.functions.invoke("catalog-ocr-apply",{body:{catalog_id:id,pages:resultPages}});if(ae)throw ae;
  alert("OCR concluído em "+resultPages.length+" páginas. "+Number(applied?.ocr_required_pages?.length||0)+" páginas permanecem pendentes.");
  await loadCatalogs();
 }catch(e){alert("OCR: "+(e.message||e))}
 finally{btn.disabled=false;btn.textContent=old}
}
async function processCatalog(id,btn){const old=btn.textContent;btn.disabled=true;btn.textContent="Lendo...";const {error}=await sb.functions.invoke("catalog-pdf-extract",{body:{catalog_id:id}});btn.disabled=false;btn.textContent=old;if(error)alert(error.message);await loadCatalogs()}
async function downloadCatalog(id){const c=catalogs.find(x=>x.id===id);if(!c?.storage_path)return;const {data,error}=await sb.storage.from(c.storage_bucket||"catalogs").createSignedUrl(c.storage_path,3600);if(error)return alert(error.message);window.open(data.signedUrl,"_blank")}
async function makeShare(id,channel="link"){const {data,error}=await sb.functions.invoke("catalog-share",{body:{catalog_id:id,channel,expires_days:30}});if(error)throw error;const url=(cfg.siteUrl||location.origin)+data.path;return url}
async function shareCatalog(id){try{const c=catalogs.find(x=>x.id===id),url=await makeShare(id,"link");const choice=prompt("Link criado por 30 dias.\n1 = WhatsApp\n2 = E-mail\nQualquer outro valor = copiar link","1");if(choice==="1"){window.open("https://wa.me/?text="+encodeURIComponent("Catálogo "+c.title+" — Biasuz Representações\n"+url),"_blank")}else if(choice==="2"){location.href="mailto:?subject="+encodeURIComponent("Catálogo "+c.title+" — Biasuz")+"&body="+encodeURIComponent("Olá, segue o catálogo comercial:\n\n"+url)}else{await navigator.clipboard.writeText(url);alert("Link copiado.")}}catch(e){alert(e.message)}}
async function togglePublish(id){const c=catalogs.find(x=>x.id===id),next=!c.published;const {error}=await sb.from("catalogs").update({published:next,status:next?"published":"review"}).eq("id",id);if(error)alert(error.message);await loadCatalogs()}
async function showCandidates(id){const c=catalogs.find(x=>x.id===id);document.getElementById("candidatePanel").hidden=false;document.getElementById("candidateTitle").textContent="Itens detectados · "+c.title;const {data,error}=await sb.from("catalog_product_candidates").select("*").eq("catalog_id",id).order("page_number").limit(500);const box=document.getElementById("candidateList");box.innerHTML=error?'<p class="err">'+esc(error.message)+'</p>':(data||[]).length?(data||[]).map(x=>'<div class="candidate"><div><strong>'+esc(x.detected_name||"Sem nome")+'</strong><small>Página '+esc(x.page_number||"—")+' · '+esc(x.status)+'</small></div><div>'+esc(x.sku||x.external_code||"—")+'</div><div>'+(x.detected_price!=null?"R$ "+Number(x.detected_price).toLocaleString("pt-BR",{minimumFractionDigits:2}):"—")+'</div><div>'+Math.round(Number(x.confidence||0)*100)+'%</div></div>').join(""):'<p class="muted">Nenhum item detectado ainda.</p>';document.getElementById("candidatePanel").scrollIntoView({behavior:"smooth"})}
let activePriceTable=null,activePriceItems=[];
async function showPrices(catalogId){
 const c=catalogs.find(x=>x.id===catalogId),panel=document.getElementById("pricePanel"),list=document.getElementById("priceList"),meta=document.getElementById("priceTableMeta"),btn=document.getElementById("activatePriceTable"),st=document.getElementById("priceStatus");
 panel.hidden=false;st.textContent="";document.getElementById("priceTitle").textContent="Preços · "+c.title;list.innerHTML='<p class="muted">Carregando tabela...</p>';
 const {data:tables,error:te}=await sb.from("price_tables").select("*").eq("catalog_id",catalogId).order("created_at",{ascending:false});
 if(te||!tables?.length){activePriceTable=null;activePriceItems=[];meta.textContent="Nenhuma tabela de preço extraída deste catálogo.";list.innerHTML='<p class="muted">Nenhum valor em rascunho.</p>';btn.hidden=true;panel.scrollIntoView({behavior:"smooth"});return}
 activePriceTable=tables[0];
 const {data:items,error:ie}=await sb.from("price_table_items").select("*,products(name,sku)").eq("price_table_id",activePriceTable.id).order("source_page").limit(1000);
 activePriceItems=items||[];meta.textContent=(activePriceTable.status==="published"?"ATIVA":"RASCUNHO")+" · "+activePriceItems.length+" produtos · "+(activePriceTable.notes||"");
 list.innerHTML=ie?'<p class="err">'+esc(ie.message)+'</p>':activePriceItems.length?activePriceItems.map(x=>'<div class="candidate"><div><strong>'+esc(x.products?.name||x.source_text||"Produto")+'</strong><small>'+esc(x.products?.sku||"Sem SKU")+' · página '+esc(x.source_page||"—")+'</small></div><div>R$ '+Number(x.price).toLocaleString("pt-BR",{minimumFractionDigits:2})+'</div><div>'+Math.round(Number(x.confidence||0)*100)+'%</div><div><button class="btn btn-small btn-outline" data-edit-price="'+x.id+'">Editar</button></div></div>').join(""):'<p class="muted">Nenhum valor em rascunho.</p>';
 btn.hidden=!activePriceItems.length||activePriceTable.status==="published";
 document.querySelectorAll("[data-edit-price]").forEach(b=>b.onclick=async()=>{const it=activePriceItems.find(x=>x.id===b.dataset.editPrice),raw=prompt("Preço revisado para "+(it.products?.name||"produto"),String(it.price).replace(".",","));if(raw===null)return;const n=Number(String(raw).replace(".","").replace(",","."));if(!Number.isFinite(n)||n<0)return alert("Preço inválido.");const {error}=await sb.from("price_table_items").update({price:n,confidence:1}).eq("id",it.id);if(error)alert(error.message);else showPrices(catalogId)});
 panel.scrollIntoView({behavior:"smooth"});
}
document.getElementById("activatePriceTable").onclick=async()=>{
 if(!activePriceTable||!activePriceItems.length)return;
 if(activePriceTable.scope_type!=="default")return alert("Somente tabela padrão pode alimentar diretamente o checkout atual.");
 if(!confirm("Confirmar a ativação desta tabela? Os preços aprovados passarão a ser usados nos pedidos B2B desta representada."))return;
 const st=document.getElementById("priceStatus");st.className="status";st.textContent="Ativando preços comerciais...";
 try{
  for(let i=0;i<activePriceItems.length;i+=100){
   const batch=activePriceItems.slice(i,i+100).map(x=>({product_id:x.product_id,representada_id:activePriceTable.representada_id,price:Number(x.price),promo_price:x.promo_price==null?null:Number(x.promo_price),min_quantity:Number(x.min_quantity||1),valid_from:activePriceTable.valid_from||null,valid_until:activePriceTable.valid_until||null,active:true}));
   const {error}=await sb.from("product_prices").upsert(batch,{onConflict:"product_id,representada_id"});if(error)throw error;
  }
  await sb.from("price_tables").update({status:"archived"}).eq("representada_id",activePriceTable.representada_id).eq("scope_type","default").eq("status","published").neq("id",activePriceTable.id);
  const {error}=await sb.from("price_tables").update({status:"published"}).eq("id",activePriceTable.id);if(error)throw error;
  st.className="status ok";st.textContent="Tabela aprovada e ativada no B2B.";await showPrices(activePriceTable.catalog_id);
 }catch(e){st.className="status err";st.textContent=e.message||"Falha ao ativar tabela."}
};
document.getElementById("closePrices").onclick=()=>document.getElementById("pricePanel").hidden=true;
document.getElementById("closeCandidates").onclick=()=>document.getElementById("candidatePanel").hidden=true;
document.getElementById("reload").onclick=loadCatalogs;boot();