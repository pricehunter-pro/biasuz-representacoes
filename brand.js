const cfg=window.BIASUZ_CONFIG||{};
const sb=(cfg.supabaseUrl&&cfg.supabasePublishableKey)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
const slug=new URLSearchParams(location.search).get("slug");let products=[];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>v==null?"A cadastrar":"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2});
function wa(name){const n=(cfg.whatsappNumber||"5575992268989").replace(/\D/g,"");const msg=encodeURIComponent("Olá, tenho interesse comercial nos produtos "+name+" através da Biasuz Representações.");return "https://wa.me/"+n+"?text="+msg}
function render(){const q=document.getElementById("productSearch").value.toLowerCase();const rows=products.filter(p=>!q||[p.name,p.category,p.subcategory,p.sku].join(" ").toLowerCase().includes(q));document.getElementById("productGrid").innerHTML=rows.length?rows.map(p=>'<article class="product-card">'+(p.image_url?'<img loading="lazy" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'')+'<div class="pc"><h3>'+esc(p.name)+'</h3><p>'+esc([p.category,p.subcategory,p.sku].filter(Boolean).join(" • "))+'</p>'+(p.product_url?'<a class="btn btn-small" target="_blank" rel="noopener" href="'+esc(p.product_url)+'">Ver produto</a>':'')+'</div></article>').join(""):'<div class="empty">Catálogo em sincronização. Fale com a Biasuz para receber a linha completa desta representada.</div>'}
function renderPolicy(p){document.getElementById("policyGrid").innerHTML='<div class="condition"><span>Pedido mínimo</span><strong>'+money(p?.min_order_value)+'</strong></div><div class="condition"><span>Prazo de pagamento</span><strong>'+esc(p?.payment_terms||"A cadastrar")+'</strong></div><div class="condition"><span>Frete</span><strong>'+esc(p?.freight_policy||"A cadastrar")+'</strong></div><div class="condition"><span>Entrega estimada</span><strong>'+(p?.delivery_estimate_days?esc(p.delivery_estimate_days+" dias"):"A cadastrar")+'</strong></div>';document.getElementById("policyNotes").textContent=p?.notes||"As condições comerciais desta indústria são tratadas separadamente dos demais fornecedores."}
async function boot(){if(!sb||!slug){document.getElementById("brandName").textContent="Representada não encontrada";return}
 const {data:brand,error}=await sb.from("representadas").select("*").eq("slug",slug).eq("active",true).maybeSingle();
 if(error||!brand){document.getElementById("brandName").textContent="Representada não encontrada";return}
 document.title=brand.name+" • Biasuz";document.getElementById("brandName").textContent=brand.name;document.getElementById("brandDesc").textContent=brand.description||("Conheça a linha "+brand.name+" representada pela Biasuz no Nordeste.");document.getElementById("officialLink").href=brand.official_url;document.getElementById("whatsLink").href=wa(brand.name);
 if(brand.logo_url){const img=document.getElementById("brandLogo");img.src=brand.logo_url;img.alt="Logomarca "+brand.name;img.hidden=false}
 const [{data:policy},{data:promos},{data:items}]=await Promise.all([
  sb.from("commercial_policies").select("*").eq("representada_id",brand.id).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle(),
  sb.from("promotions").select("*").eq("representada_id",brand.id).eq("active",true).order("starts_at",{ascending:false}),
  sb.from("products").select("*").eq("representada_id",brand.id).eq("active",true).order("name")
 ]);
 renderPolicy(policy);
 if(promos?.length){document.getElementById("promotionsWrap").hidden=false;document.getElementById("promotions").innerHTML=promos.map(p=>'<article class="promo"><strong>'+esc(p.title)+'</strong><p>'+esc(p.description||"")+'</p></article>').join("")}
 products=items||[];document.getElementById("catalogTitle").textContent=products.length?products.length+" produtos":"Produtos";render()
}
document.getElementById("productSearch").addEventListener("input",render);boot();