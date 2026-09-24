const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
let brand=null,policy=null;

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
 await Promise.all([loadPolicy(),loadProducts(),loadPromos(),loadOrders()]);
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
async function loadProducts(){
 const [{data:ps},{data:prs}]=await Promise.all([sb.from("products").select("*").eq("representada_id",brand.id).eq("active",true).order("name"),sb.from("product_prices").select("*").eq("representada_id",brand.id).eq("active",true)]);
 const map=new Map((prs||[]).map(x=>[x.product_id,x]));
 document.getElementById("productRows").innerHTML=(ps||[]).length?(ps||[]).map(p=>{const pr=map.get(p.id);return '<div class="item"><div><strong>'+esc(p.name)+'</strong><br><small>'+esc([p.group_name,p.category,p.sku].filter(Boolean).join(" • "))+'</small></div><div>'+money(pr?.price||0)+'</div><div>'+(pr?.promo_price!=null?'<strong>'+money(pr.promo_price)+'</strong>':'—')+'</div><div>mín. '+esc(pr?.min_quantity||1)+'</div><button class="btn btn-small btn-outline" data-disable="'+p.id+'">Desativar</button></div>'}).join(""):'<p class="muted">Nenhum produto cadastrado.</p>';
 document.querySelectorAll("[data-disable]").forEach(b=>b.onclick=async()=>{await sb.from("products").update({active:false}).eq("id",b.dataset.disable);await loadProducts()})
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
document.getElementById("reloadProducts").onclick=loadProducts;
document.getElementById("reloadOrders").onclick=loadOrders;
init();