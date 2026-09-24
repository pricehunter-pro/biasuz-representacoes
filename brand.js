const cfg=window.BIASUZ_CONFIG||{};
const sb=(cfg.supabaseUrl&&cfg.supabasePublishableKey)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
const slug=new URLSearchParams(location.search).get("slug");let products=[];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function wa(name){const n=(cfg.whatsappNumber||"").replace(/\D/g,"");const msg=encodeURIComponent("Olá, tenho interesse comercial nos produtos "+name+" através da Biasuz Representações.");return n?"https://wa.me/"+n+"?text="+msg:"./index.html#contato"}
function render(){const q=document.getElementById("productSearch").value.toLowerCase();const rows=products.filter(p=>!q||[p.name,p.category,p.subcategory,p.sku].join(" ").toLowerCase().includes(q));document.getElementById("productGrid").innerHTML=rows.length?rows.map(p=>'<article class="product-card">'+(p.image_url?'<img loading="lazy" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'')+'<div class="pc"><h3>'+esc(p.name)+'</h3><p>'+esc([p.category,p.subcategory,p.sku].filter(Boolean).join(" • "))+'</p>'+(p.product_url?'<a class="btn btn-small" target="_blank" rel="noopener" href="'+esc(p.product_url)+'">Ver produto</a>':'')+'</div></article>').join(""):'<div class="empty">Catálogo em sincronização. Enquanto isso, fale com a Biasuz para receber a linha completa desta representada.</div>'}
async function boot(){if(!sb||!slug){document.getElementById("brandName").textContent="Representada não encontrada";return}
 const {data:brand,error}=await sb.from("representadas").select("*").eq("slug",slug).eq("active",true).maybeSingle();
 if(error||!brand){document.getElementById("brandName").textContent="Representada não encontrada";return}
 document.title=brand.name+" • Biasuz";document.getElementById("brandName").textContent=brand.name;document.getElementById("brandDesc").textContent=brand.description||("Conheça a linha "+brand.name+" representada pela Biasuz no Nordeste.");document.getElementById("officialLink").href=brand.official_url;document.getElementById("whatsLink").href=wa(brand.name);
 const {data}=await sb.from("products").select("*").eq("representada_id",brand.id).eq("active",true).order("name");
 products=data||[];document.getElementById("catalogTitle").textContent=products.length?products.length+" produtos":"Produtos";render()
}
document.getElementById("productSearch").addEventListener("input",render);boot();