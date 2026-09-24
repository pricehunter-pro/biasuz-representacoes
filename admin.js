const cfg=window.BIASUZ_CONFIG||{}, statusEl=document.getElementById("loginStatus");
const sb=(cfg.supabaseUrl&&cfg.supabasePublishableKey)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
let leads=[],customerPage=0,catalogBrands=[],catalogLibrary=[];const pageSize=100;
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const digits=v=>String(v??"").replace(/\D/g,"");
function showApp(on){document.getElementById("loginView").classList.toggle("hidden",on);document.getElementById("appView").classList.toggle("hidden",!on)}
async function boot(){if(!sb){statusEl.textContent="Supabase não configurado.";return}const {data:{session}}=await sb.auth.getSession();if(session){showApp(true);await refreshAll()}else showApp(false)}
document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));statusEl.textContent="Entrando...";const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(error){statusEl.textContent=error.message;statusEl.className="form-status err";return}showApp(true);await refreshAll()});
document.getElementById("logout").onclick=async()=>{await sb.auth.signOut();showApp(false)};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tabview").forEach(x=>x.classList.add("hidden"));document.getElementById("tab-"+b.dataset.tab).classList.remove("hidden")});

async function counts(){
 const [a,b,c,d]=await Promise.all([
  sb.from("leads").select("*",{count:"exact",head:true}),
  sb.from("customers").select("*",{count:"exact",head:true}),
  sb.from("representadas").select("*",{count:"exact",head:true}),
  sb.from("products").select("*",{count:"exact",head:true})
 ]);
 document.getElementById("kLeads").textContent=a.count||0;document.getElementById("kCustomers").textContent=b.count||0;document.getElementById("kBrands").textContent=c.count||0;document.getElementById("kProducts").textContent=d.count||0;
}
async function loadLeads(){
 const {data,error}=await sb.from("leads").select("*").order("created_at",{ascending:false}).limit(500);if(error){document.getElementById("leadRows").innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}leads=data||[];renderLeads()
}
function renderLeads(){const q=document.getElementById("leadSearch").value.toLowerCase(),uf=document.getElementById("leadState").value,seg=document.getElementById("leadSegment").value;const rows=leads.filter(x=>(!q||[x.name,x.company,x.phone,x.brand].join(" ").toLowerCase().includes(q))&&(!uf||x.state===uf)&&(!seg||x.segment===seg));document.getElementById("leadRows").innerHTML=rows.length?rows.map(x=>'<div class="row"><div><strong>'+esc(x.company)+'</strong><br><small>'+esc(x.name)+'</small></div><div>'+esc(x.phone)+'<br><small>'+esc(x.email||"")+'</small></div><div><strong>'+esc(x.state)+'</strong><br><small>'+esc(x.segment)+'</small></div><div>'+esc(x.brand||"—")+'</div><select data-lead-stage="'+x.id+'">'+["novo","contatado","qualificado","proposta","pedido","ganho","perdido"].map(s=>'<option '+(x.stage===s?"selected":"")+'>'+s+'</option>').join("")+'</select><button class="btn btn-small" data-lead-wa="'+x.id+'">WhatsApp</button></div>').join(""):'<p class="muted">Nenhum lead encontrado.</p>';document.querySelectorAll("[data-lead-stage]").forEach(el=>el.onchange=async()=>{await sb.from("leads").update({stage:el.value}).eq("id",el.dataset.leadStage);const x=leads.find(v=>v.id===el.dataset.leadStage);if(x)x.stage=el.value});document.querySelectorAll("[data-lead-wa]").forEach(el=>el.onclick=()=>{const x=leads.find(v=>v.id===el.dataset.leadWa);if(x)openWA(x.phone,"Olá "+x.name+", aqui é o Junior da Biasuz Representações. Estou entrando em contato sobre seu interesse em "+(x.brand||x.segment)+".")})}
function openWA(phone,msg){let n=digits(phone);if(!n)return;if(n.length<=11)n="55"+n;window.open("https://wa.me/"+n+"?text="+encodeURIComponent(msg),"_blank")}

async function loadCustomers(reset=false){
 if(reset)customerPage=0;const q=document.getElementById("customerSearch").value.trim(),uf=document.getElementById("customerState").value,stage=document.getElementById("customerStage").value;
 let req=sb.from("customers").select("*").order("legal_name").range(customerPage*pageSize,customerPage*pageSize+pageSize-1);
 if(uf)req=req.eq("state",uf);if(stage)req=req.eq("lifecycle_stage",stage);if(q)req=req.or("cnpj.ilike.%"+q+"%,legal_name.ilike.%"+q+"%,trade_name.ilike.%"+q+"%,city.ilike.%"+q+"%,phone1.ilike.%"+digits(q)+"%");
 const {data,error}=await req;if(error){document.getElementById("customerRows").innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 const rows=data||[];document.getElementById("customerPage").textContent=String(customerPage+1);document.getElementById("customerRows").innerHTML=rows.length?rows.map(x=>'<div class="row"><div><strong>'+esc(x.trade_name||x.legal_name)+'</strong><br><small>'+esc(x.legal_name)+'</small></div><div>'+esc(x.phone1||"—")+'<br><small>'+esc(x.email||"")+'</small></div><div>'+esc(x.city||"—")+'<br><small>'+esc(x.state||"")+'</small></div><div><span class="badge">'+esc(x.company_size||"porte n/i")+'</span></div><select data-customer-stage="'+x.id+'"><option '+(x.lifecycle_stage==="prospect"?"selected":"")+'>prospect</option><option '+(x.lifecycle_stage==="cliente"?"selected":"")+'>cliente</option><option '+(x.lifecycle_stage==="inativo"?"selected":"")+'>inativo</option><option '+(x.lifecycle_stage==="descartado"?"selected":"")+'>descartado</option></select><button class="btn btn-small" data-customer-wa="'+x.id+'">WhatsApp</button></div>').join(""):'<p class="muted">Nenhum registro nesta página.</p>';
 document.querySelectorAll("[data-customer-stage]").forEach(el=>el.onchange=async()=>sb.from("customers").update({lifecycle_stage:el.value}).eq("id",el.dataset.customerStage));
 document.querySelectorAll("[data-customer-wa]").forEach(el=>el.onclick=()=>{const x=rows.find(v=>v.id===el.dataset.customerWa);if(x)openWA(x.phone1,"Olá, aqui é o Junior da Biasuz Representações. Posso apresentar nosso portfólio de marcas e condições comerciais para sua empresa?")});
}
async function loadCatalog(){
 const {data,error}=await sb.from("representadas").select("id,name,slug,segments,catalog_status,products_count,official_url").order("name");if(error)return;
 document.getElementById("brandRows").innerHTML=(data||[]).map(b=>'<div class="row catalog-row"><div><strong>'+esc(b.name)+'</strong><br><small>'+esc((b.segments||[]).join(" • "))+'</small></div><div><span class="badge">'+esc(b.catalog_status)+'</span></div><div>'+esc(b.products_count||0)+' produtos</div><div><a target="_blank" rel="noopener" href="'+esc(b.official_url)+'">Site oficial</a></div><a class="btn btn-small" target="_blank" href="./brand.html?slug='+encodeURIComponent(b.slug)+'">Catálogo</a></div>').join("");
}
async function refreshAll(){await Promise.all([counts(),loadLeads(),loadCustomers(true),loadCatalog(),loadCatalogLibrary()])}


const slugify=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function loadCatalogLibrary(){
 const [{data:brands},{data:cats,error}]=await Promise.all([
  sb.from("representadas").select("id,name,slug").eq("active",true).order("name"),
  sb.from("catalogs").select("*,representadas(name,slug)").order("created_at",{ascending:false})
 ]);
 catalogBrands=brands||[];catalogLibrary=cats||[];
 const sel=document.getElementById("catalogBrand");const current=sel.value;sel.innerHTML='<option value="">Selecione</option>'+catalogBrands.map(b=>'<option value="'+b.id+'" data-slug="'+esc(b.slug)+'">'+esc(b.name)+'</option>').join("");if(current)sel.value=current;
 const box=document.getElementById("catalogLibraryRows");if(error){box.innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 if(!catalogLibrary.length){box.innerHTML='<p class="muted">Nenhum catálogo armazenado.</p>';return}
 const ids=catalogLibrary.map(c=>c.id);
 const [linksRes,prodRes,candRes]=await Promise.all([
  sb.from("catalog_share_links").select("catalog_id").in("catalog_id",ids),
  sb.from("catalog_products").select("catalog_id").in("catalog_id",ids),
  sb.from("catalog_product_candidates").select("catalog_id,status").in("catalog_id",ids)
 ]);
 const linkCount={},prodCount={},reviewCount={};for(const x of linksRes.data||[])linkCount[x.catalog_id]=(linkCount[x.catalog_id]||0)+1;for(const x of prodRes.data||[])prodCount[x.catalog_id]=(prodCount[x.catalog_id]||0)+1;for(const x of candRes.data||[])if(["pending","review"].includes(x.status))reviewCount[x.catalog_id]=(reviewCount[x.catalog_id]||0)+1;
 box.innerHTML=catalogLibrary.map(c=>'<div class="catalog-library-row"><div><strong>'+esc(c.title)+'</strong><br><small>'+esc(c.representadas?.name||"")+' • '+esc(c.file_name||"PDF")+'</small><div class="catalog-stats">'+Number(c.page_count||0)+' páginas • '+Number(prodCount[c.id]||0)+' produtos vinculados • '+Number(reviewCount[c.id]||0)+' para revisão • '+Number(linkCount[c.id]||0)+' compartilhamentos</div></div><div><span class="badge">'+esc(c.status)+'</span><br><small>'+(c.published?'Publicado':'Interno')+'</small></div><div><small>'+esc(c.catalog_type)+'</small><br>'+esc(c.year||"")+'</div><div class="catalog-actions"><button class="btn btn-small" data-cat-download="'+c.id+'">Baixar</button><button class="btn btn-small btn-outline" data-cat-copy="'+c.id+'">Copiar link</button><button class="btn btn-small btn-outline" data-cat-wa="'+c.id+'">WhatsApp</button><button class="btn btn-small btn-outline" data-cat-email="'+c.id+'">E-mail</button><button class="btn btn-small btn-outline" data-cat-publish="'+c.id+'">'+(c.published?'Ocultar':'Publicar')+'</button><button class="btn btn-small btn-outline" data-cat-reprocess="'+c.id+'">Reler PDF</button></div></div>').join("");
 document.querySelectorAll("[data-cat-download]").forEach(b=>b.onclick=()=>downloadCatalog(b.dataset.catDownload));
 document.querySelectorAll("[data-cat-copy]").forEach(b=>b.onclick=()=>shareCatalog(b.dataset.catCopy,"link","copy"));
 document.querySelectorAll("[data-cat-wa]").forEach(b=>b.onclick=()=>shareCatalog(b.dataset.catWa,"whatsapp","wa"));
 document.querySelectorAll("[data-cat-email]").forEach(b=>b.onclick=()=>shareCatalog(b.dataset.catEmail,"email","email"));
 document.querySelectorAll("[data-cat-publish]").forEach(b=>b.onclick=async()=>{const c=catalogLibrary.find(x=>x.id===b.dataset.catPublish);await sb.from("catalogs").update({published:!c.published,status:!c.published?"published":"review"}).eq("id",c.id);await loadCatalogLibrary()});
 document.querySelectorAll("[data-cat-reprocess]").forEach(b=>b.onclick=async()=>{const c=catalogLibrary.find(x=>x.id===b.dataset.catReprocess),st=document.getElementById("catalogUploadStatus");st.textContent="Relendo "+c.title+"...";const {data,error}=await sb.functions.invoke("catalog-pdf-extract",{body:{catalog_id:c.id}});st.className="form-status "+(error?"err":"ok");st.textContent=error?error.message:"Leitura concluída: "+Number(data?.candidates||0)+" candidatos. Páginas para OCR: "+Number(data?.ocr_required_pages?.length||0);await loadCatalogLibrary()});
}
async function downloadCatalog(id){const c=catalogLibrary.find(x=>x.id===id);if(!c?.storage_path)return;const {data,error}=await sb.storage.from("catalogs").createSignedUrl(c.storage_path,3600);if(error){alert(error.message);return}window.open(data.signedUrl,"_blank")}
async function shareCatalog(id,channel,mode){
 const c=catalogLibrary.find(x=>x.id===id);const {data,error}=await sb.functions.invoke("catalog-share",{body:{catalog_id:id,channel,expires_days:30}});if(error||!data?.path){alert(error?.message||"Não foi possível gerar o link.");return}
 const url=(cfg.siteUrl||location.origin)+data.path;
 const msg="Olá! Segue o catálogo "+c.title+" da "+(c.representadas?.name||"Biasuz Representações")+": "+url;
 if(mode==="copy"){await navigator.clipboard.writeText(url);alert("Link copiado. Validade: 30 dias.");return}
 if(mode==="wa"){window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");return}
 if(mode==="email"){location.href="mailto:?subject="+encodeURIComponent(c.title)+"&body="+encodeURIComponent(msg)}
}
function tusUpload(file,path,onProgress){
 return new Promise(async(resolve,reject)=>{
  const {data:{session}}=await sb.auth.getSession();if(!session)return reject(new Error("Sessão expirada."));
  const upload=new tus.Upload(file,{endpoint:cfg.supabaseUrl+"/storage/v1/upload/resumable",retryDelays:[0,1000,3000,5000],headers:{authorization:"Bearer "+session.access_token,"x-upsert":"true"},metadata:{bucketName:"catalogs",objectName:path,contentType:file.type||"application/pdf",cacheControl:"3600"},removeFingerprintOnSuccess:true,onError:reject,onProgress:(sent,total)=>onProgress?.(Math.round(sent/total*100)),onSuccess:()=>resolve(true)});
  upload.findPreviousUploads().then(prev=>{if(prev.length)upload.resumeFromPreviousUpload(prev[0]);upload.start()}).catch(()=>upload.start());
 })
}
async function ocrFallback(file,catalogId,pages,status,bar){
 if(!pages?.length||!window.pdfjsLib||!window.Tesseract)return;
 pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 let worker=null;try{worker=await Tesseract.createWorker("por")}catch{worker=await Tesseract.createWorker("eng")}
 let batch=[];for(let i=0;i<pages.length;i++){const n=Number(pages[i]);status.textContent="OCR inteligente: página "+n+" ("+(i+1)+"/"+pages.length+")";const page=await pdf.getPage(n),vp=page.getViewport({scale:1.6}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);await page.render({canvasContext:ctx,viewport:vp}).promise;const r=await worker.recognize(canvas);const previewPath="previews/"+catalogId+"/page-"+String(n).padStart(3,"0")+".jpg";const blob=await new Promise(ok=>canvas.toBlob(ok,"image/jpeg",.82));if(blob)await sb.storage.from("catalogs").upload(previewPath,blob,{contentType:"image/jpeg",upsert:true});batch.push({page_number:n,text:r.data.text||"",preview_storage_path:previewPath});bar.style.width=(80+Math.round((i+1)/pages.length*20))+"%";if(batch.length===3||i===pages.length-1){const {error}=await sb.functions.invoke("catalog-ocr-apply",{body:{catalog_id:catalogId,pages:batch}});if(error)throw error;batch=[]}}
 await worker.terminate();
}
document.getElementById("catalogUploadForm").onsubmit=async e=>{
 e.preventDefault();const file=document.getElementById("catalogPdf").files[0],brandId=document.getElementById("catalogBrand").value,title=document.getElementById("catalogTitle").value.trim(),type=document.getElementById("catalogType").value,year=Number(document.getElementById("catalogYear").value)||null,st=document.getElementById("catalogUploadStatus"),bar=document.getElementById("catalogProgressBar");if(!file||!brandId||!title)return;
 const brand=catalogBrands.find(x=>x.id===brandId),stamp=Date.now(),slug=slugify(title)+"-"+String(stamp).slice(-6),path=brand.slug+"/"+year+"/"+stamp+"-"+slugify(file.name.replace(/\.pdf$/i,""))+".pdf";st.className="form-status";st.textContent="Preparando catálogo...";bar.style.width="2%";
 const {data:cat,error:ce}=await sb.from("catalogs").insert({representada_id:brandId,title,slug,catalog_type:type,year,source_type:"upload",file_name:file.name,mime_type:file.type||"application/pdf",size_bytes:file.size,storage_bucket:"catalogs",storage_path:path,status:"uploading",published:false}).select("*").single();if(ce){st.className="form-status err";st.textContent=ce.message;return}
 try{await tusUpload(file,path,p=>{bar.style.width=Math.max(3,Math.round(p*.65))+"%";st.textContent="Enviando PDF: "+p+"%"});await sb.from("catalogs").update({status:"uploaded"}).eq("id",cat.id);bar.style.width="70%";st.textContent="Lendo texto, produtos e códigos...";
 const {data,error}=await sb.functions.invoke("catalog-pdf-extract",{body:{catalog_id:cat.id}});if(error)throw error;bar.style.width="80%";if(data?.ocr_required_pages?.length){st.textContent="Texto extraído. Iniciando OCR em "+data.ocr_required_pages.length+" páginas...";await ocrFallback(file,cat.id,data.ocr_required_pages,st,bar)}
 bar.style.width="100%";st.className="form-status ok";st.textContent="Catálogo processado. "+Number(data?.candidates||0)+" itens detectados na primeira leitura. Revise apenas as exceções.";e.currentTarget.reset();await Promise.all([loadCatalogLibrary(),counts()]);
 }catch(err){await sb.from("catalogs").update({status:"error",extraction_summary:{error:String(err?.message||err)}}).eq("id",cat.id);st.className="form-status err";st.textContent="Falha no processamento: "+(err?.message||err)}
};
document.getElementById("reloadCatalogs").onclick=loadCatalogLibrary;

function dateValue(v){if(v===null||v===undefined||v==="")return null;const s=String(v).trim();if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const[d,m,y]=s.split("/");return y+"-"+m+"-"+d}if(/^\d{8}$/.test(s))return s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6,8);return null}
function clean(v){const s=String(v??"").trim();return !s||s==="0"?null:s}
function mapRow(r){const cnpj=digits(r["CNPJ"]).padStart(14,"0");if(cnpj.length!==14)return null;return {source:"lista_petshop_bahia_julho_2026",source_id:clean(r["ID"]),cnpj,branch_type:clean(r["MATRIZ/FILIAL"]),legal_name:clean(r["RAZAO SOCIAL"])||"SEM RAZAO SOCIAL",trade_name:clean(r["NOME FANTASIA"]),registration_status:clean(r["SIT CADASTRAL"]),registration_status_date:dateValue(r["DATA SIT CADASTRAL"]),start_date:dateValue(r["DATA INICIO ATIVIDADE"]),cnae_code:clean(r["CNAE CODIGO"]),cnae_description:clean(r["CNAE FISCAL"]),street_type:clean(r["DESC TIPO LOGRADOURO"]),street:clean(r["LOGRADOURO"]),number:clean(r["NUMERO"]),complement:clean(r["COMPLEMENTO"]),district:clean(r["BAIRRO"]),zip_code:digits(r["CEP"]).padStart(8,"0")||null,state:clean(r["UF"]),city_code:clean(r["COD MUNICIPIO"]),city:clean(r["MUNICIPIO"]),phone1:digits(r["DDD TELEFONE 1"])||null,phone1_is_mobile:["1","S","SIM","TRUE"].includes(String(r["TELEFONE1_CELULAR?"]??"").toUpperCase()),phone2:digits(r["DDD TELEFONE 2"])||null,phone2_is_mobile:["1","S","SIM","TRUE"].includes(String(r["TELEFONE2_CELULAR?"]??"").toUpperCase()),email:clean(r["CORREIO ELETRONICO"]),responsible_qualification:clean(r["QUALIF RESPONSAVEL"]),share_capital:Number(String(r["CAPITAL SOCIAL EMPRESA"]??"0").replace(",", "."))||null,company_size:clean(r["PORTE EMPRESA"]),simples_option:clean(r["OPCAO SIMPLES"]),mei_option:clean(r["OPCAO MEI"]),partners:clean(r["SOCIOS"]),secondary_cnaes:clean(r["CNAES SECUNDARIOS"]),segment:"Pet",lifecycle_stage:"prospect",commercial_owner:"Junior"}}
document.getElementById("newCustomerForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("newCustomerStatus");
 const cnpj=String(d.cnpj||"").replace(/\D/g,"");if(cnpj.length!==14){st.className="form-status err";st.textContent="Informe um CNPJ com 14 dígitos.";return}
 st.className="form-status";st.textContent="Cadastrando...";
 const row={source:"manual_admin",cnpj,legal_name:d.legal_name.trim(),trade_name:d.trade_name||null,state:d.state,city:d.city||null,phone1:String(d.phone1||"").replace(/\D/g,"")||null,email:d.email||null,segment:d.segment||"Pet",lifecycle_stage:"prospect",commercial_owner:"Junior"};
 const {error}=await sb.from("customers").insert(row);
 if(error){st.className="form-status err";st.textContent=error.message;return}
 st.className="form-status ok";st.textContent="Cliente/prospect cadastrado.";e.currentTarget.reset();await counts();await loadCustomers(true);
};
document.getElementById("importCsv").onclick=()=>{const file=document.getElementById("csvFile").files[0],status=document.getElementById("importStatus"),bar=document.getElementById("importBar");if(!file){status.textContent="Selecione o arquivo CSV.";return}status.textContent="Lendo arquivo...";Papa.parse(file,{header:true,skipEmptyLines:true,complete:async res=>{try{const rows=res.data.map(mapRow).filter(Boolean);let done=0;for(let i=0;i<rows.length;i+=250){const batch=rows.slice(i,i+250);const {error}=await sb.from("customers").upsert(batch,{onConflict:"cnpj"});if(error)throw error;done+=batch.length;bar.style.width=Math.round(done/rows.length*100)+"%";status.textContent=done+" / "+rows.length+" registros importados"}status.className="form-status ok";status.textContent="Importação concluída: "+done+" registros.";await counts();await loadCustomers(true)}catch(e){status.className="form-status err";status.textContent="Erro na importação: "+e.message}}})};

["leadSearch","leadState","leadSegment"].forEach(id=>document.getElementById(id).addEventListener(id==="leadSearch"?"input":"change",renderLeads));
document.getElementById("reloadLeads").onclick=loadLeads;document.getElementById("reloadCustomers").onclick=()=>loadCustomers(true);document.getElementById("prevCustomers").onclick=()=>{if(customerPage>0){customerPage--;loadCustomers()}};document.getElementById("nextCustomers").onclick=()=>{customerPage++;loadCustomers()};boot();