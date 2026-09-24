const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
let brand=null,policy=null,productPage=0;const productPageSize=100;

async function auth(){
 const {data:{user}}=await sb.auth.getUser();
 if(!user){location.href="./admin.html";return false}
 if(user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}
 return true
}
async function init(){
 if(!await auth())return;
 const {data}=await sb.from("representadas").select("*").eq("active",true).order("name");
 const sel=document.getElementById("brandSelect");
 sel.innerHTML='<option value="">Selecione uma representada</option>'+(data||[]).map(b=>'<option value="'+b.id+'" data-slug="'+esc(b.slug)+'">'+esc(b.name)+'</option>').join("");
 sel.onchange=()=>selectBrand(data||[]);
}
async function selectBrand(all){
 const id=document.getElementById("brandSelect").value;brand=all.find(x=>x.id===id)||null;
 document.getElementById("workspace").classList.toggle("hidden",!brand);
 if(!brand)return;
 document.getElementById("openStore").href="./store.html?slug="+encodeURIComponent(brand.slug);
 productPage=0;await Promise.all([loadPolicy(),loadProducts(),loadPromos(),loadOrders(),loadSyncInfo()]);
}
async function loadPolicy(){
 const {data}=await sb.from("commercial_policies").select("*").eq("representada_id",brand.id).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle();
 policy=data||null;const f=document.getElementById("policyForm");
 ["min_order_value","min_order_units","delivery_estimate_days","payment_terms","freight_policy","notes"].forEach(k=>f.elements[k].value=policy?.[k]??"");
}
document.getElementById("policyForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("policyStatus");st.textContent="Salvando...";
 const row={representada_id:brand.id,name:"Política comercial - "+brand.name,min_order_value:d.min_order_value?Number(d.min_order_value):null,min_order_units:d.min_order_units?Number(d.min_order_units):null,delivery_estimate_days:d.delivery_estimate_days?Number(d.delivery_estimate_days):null,payment_terms:d.payment_terms||null,freight_policy:d.freight_policy||null,notes:d.notes||null,active:true};
 let error;if(policy?.id){({error}=await sb.from("commercial_policies").update(row).eq("id",policy.id))}else{({error}=await sb.from("commercial_policies").insert(row))}
 st.className="status "+(error?"err":"ok");st.textContent=error?error.message:"Política atualizada.";if(!error)await loadPolicy()
};
document.getElementById("productForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("productStatus");st.textContent="Cadastrando...";
 const prod={representada_id:brand.id,name:d.name,sku:d.sku||null,group_name:d.group_name||null,category:d.category||null,subcategory:d.subcategory||null,package_info:d.package_info||null,unit_label:d.unit_label||null,image_url:d.image_url||null,product_url:d.product_url||null,description:d.description||null,active:true};
 const {data:p,error:e1}=await sb.from("products").insert(prod).select("id").single();if(e1){st.className="status err";st.textContent=e1.message;return}
 const price={product_id:p.id,representada_id:brand.id,price:Number(d.price),promo_price:d.promo_price?Number(d.promo_price):null,min_quantity:Number(d.min_quantity||1),active:true};
 const {error:e2}=await sb.from("product_prices").insert(price);if(e2){st.className="status err";st.textContent=e2.message;return}
 st.className="status ok";st.textContent="Produto cadastrado e publicado na loja.";e.currentTarget.reset();e.currentTarget.elements.min_quantity.value=1;await loadProducts()
};
async function loadSyncInfo(){
 const {data}=await sb.from("catalog_sync_runs").select("status,platform,discovered_count,upserted_count,image_count,error_count,completed_at,started_at").eq("representada_id",brand.id).order("started_at",{ascending:false}).limit(1).maybeSingle();
 const box=document.getElementById("syncInfo");
 if(!data){box.textContent="Catálogo ainda não sincronizado automaticamente.";return}
 box.textContent="Última sincronização: "+(data.completed_at?new Date(data.completed_at).toLocaleString("pt-BR"):"em andamento")+" · "+(data.platform||"detectando")+" · "+Number(data.upserted_count||0)+" produtos processados · "+Number(data.image_count||0)+" imagens";
}
async function loadProducts(){
 const search=document.getElementById("adminProductSearch")?.value.trim()||"",priceFilter=document.getElementById("adminPriceFilter")?.value||"";
 let req=sb.from("products").select("*",{count:"exact"}).eq("representada_id",brand.id).eq("active",true).order("name").range(productPage*productPageSize,productPage*productPageSize+productPageSize-1);
 if(search)req=req.or("name.ilike.%"+search+"%,sku.ilike.%"+search+"%,category.ilike.%"+search+"%,group_name.ilike.%"+search+"%");
 const {data:ps,count,error}=await req;if(error){document.getElementById("productRows").innerHTML='<p class="err">'+esc(error.message)+'</p>';return}
 const ids=(ps||[]).map(x=>x.id);let prs=[];
 if(ids.length){const r=await sb.from("product_prices").select("*").eq("representada_id",brand.id).eq("active",true).in("product_id",ids);prs=r.data||[]}
 const map=new Map(prs.map(x=>[x.product_id,x]));
 let rows=ps||[];if(priceFilter==="without")rows=rows.filter(p=>!map.has(p.id));if(priceFilter==="with")rows=rows.filter(p=>map.has(p.id));
 document.getElementById("productPageInfo").textContent="Página "+(productPage+1)+" · "+Number(count||0)+" produtos ativos";
 document.getElementById("productRows").innerHTML=rows.length?rows.map(p=>{const pr=map.get(p.id),src=p.source_price!=null?money(p.source_price):"—";return '<div class="item"><div><strong>'+esc(p.name)+'</strong><br><small>'+esc([p.group_name,p.category,p.sku].filter(Boolean).join(" • "))+'</small><div class="catalog-meta">'+esc(p.source_platform||"manual")+' · '+esc(p.source_availability||"status n/i")+'</div></div><div><small>Origem</small><br><strong class="source-ref">'+src+'</strong></div><div><small>B2B</small><br><strong>'+(pr?money(pr.price):"não definido")+'</strong></div><div><small>Promo</small><br>'+(pr?.promo_price!=null?'<strong>'+money(pr.promo_price)+'</strong>':'—')+'</div><div>mín. '+esc(pr?.min_quantity||1)+'</div><div class="item-actions"><button class="btn btn-small" data-price="'+p.id+'">Definir preço</button><button class="btn btn-small btn-outline" data-disable="'+p.id+'">Desativar</button></div></div>'}).join(""):'<p class="muted">Nenhum produto neste filtro.</p>';
 document.querySelectorAll("[data-disable]").forEach(b=>b.onclick=async()=>{await sb.from("products").update({active:false}).eq("id",b.dataset.disable);await loadProducts()});
 document.querySelectorAll("[data-price]").forEach(b=>b.onclick=async()=>{const p=rows.find(x=>x.id===b.dataset.price);const current=map.get(p.id);const base=prompt("Preço comercial B2B para "+p.name,current?.price??p.source_price??"");if(base===null||base==="")return;const price=Number(String(base).replace(",","."));if(!Number.isFinite(price)){alert("Preço inválido.");return}const promoRaw=prompt("Preço promocional (opcional)",current?.promo_price??"");const minRaw=prompt("Quantidade mínima",current?.min_quantity??1);const row={product_id:p.id,representada_id:brand.id,price,promo_price:promoRaw?Number(String(promoRaw).replace(",",".")):null,min_quantity:Number(String(minRaw||1).replace(",","."))||1,active:true};const {error}=await sb.from("product_prices").upsert(row,{onConflict:"product_id,representada_id"});if(error)alert(error.message);else await loadProducts()});
}

document.getElementById("promoForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("promoStatus");
 const row={representada_id:brand.id,title:d.title,description:d.description||null,starts_at:d.starts_at?new Date(d.starts_at).toISOString():null,ends_at:d.ends_at?new Date(d.ends_at).toISOString():null,active:true};
 const {error}=await sb.from("promotions").insert(row);st.className="status "+(error?"err":"ok");st.textContent=error?error.message:"Promoção publicada.";if(!error){e.currentTarget.reset();await loadPromos()}
};
async function loadPromos(){
 const {data}=await sb.from("promotions").select("*").eq("representada_id",brand.id).eq("active",true).order("created_at",{ascending:false});
 document.getElementById("promoRows").innerHTML=(data||[]).map(p=>'<div class="item promo"><div><strong>'+esc(p.title)+'</strong></div><div>'+esc(p.description||"")+'</div><div><small>'+(p.ends_at?"até "+new Date(p.ends_at).toLocaleDateString("pt-BR"):"sem prazo")+'</small></div><button class="btn btn-small btn-outline" data-promo="'+p.id+'">Encerrar</button></div>').join("")||'<p class="muted">Nenhuma promoção ativa.</p>';
 document.querySelectorAll("[data-promo]").forEach(b=>b.onclick=async()=>{await sb.from("promotions").update({active:false}).eq("id",b.dataset.promo);await loadPromos()})
}
async function loadOrders(){
 const {data}=await sb.from("orders").select("id,order_number,status,total,created_at,customer_id").eq("representada_id",brand.id).order("created_at",{ascending:false}).limit(100);
 document.getElementById("orderRows").innerHTML=(data||[]).map(o=>'<div class="item"><div><strong>Pedido #'+esc(o.order_number)+'</strong><br><small>'+new Date(o.created_at).toLocaleString("pt-BR")+'</small></div><div>'+money(o.total)+'</div><div>'+esc(o.status)+'</div><div></div><select data-order="'+o.id+'"><option value="enviado">enviado</option><option value="em_analise">em_analise</option><option value="aprovado">aprovado</option><option value="faturado">faturado</option><option value="expedido">expedido</option><option value="entregue">entregue</option><option value="cancelado">cancelado</option></select></div>').join("")||'<p class="muted">Nenhum pedido desta representada.</p>';
 document.querySelectorAll("[data-order]").forEach(s=>{s.value=(data||[]).find(x=>x.id===s.dataset.order)?.status||"enviado";s.onchange=async()=>{await sb.from("orders").update({status:s.value}).eq("id",s.dataset.order)}})
}
document.getElementById("reloadProducts").onclick=()=>{productPage=0;loadProducts();loadSyncInfo()};
document.getElementById("adminProductSearch").addEventListener("input",()=>{productPage=0;loadProducts()});
document.getElementById("adminPriceFilter").addEventListener("change",()=>{productPage=0;loadProducts()});
document.getElementById("prevProductPage").onclick=()=>{if(productPage>0){productPage--;loadProducts()}};
document.getElementById("nextProductPage").onclick=()=>{productPage++;loadProducts()};
document.getElementById("reloadOrders").onclick=loadOrders;
init();