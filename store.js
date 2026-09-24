const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const slug=new URLSearchParams(location.search).get("slug");
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let profile=null,brand=null,policy=null,products=[],prices=new Map(),productCache=new Map(),cart=new Map();
let productPage=0,totalProducts=0;const productPageSize=60;

function effectivePrice(p){const pr=prices.get(p.id);if(!pr)return 0;const now=Date.now(),from=pr.valid_from?Date.parse(pr.valid_from):null,to=pr.valid_until?Date.parse(pr.valid_until):null;const promo=pr.promo_price!=null&&(!from||now>=from)&&(!to||now<=to);return promo?Number(pr.promo_price):Number(pr.price||0)}
function regularPrice(p){return Number(prices.get(p.id)?.price||0)}
function cartKey(){return brand?"biasuz_cart_"+brand.id:null}
function loadCartLocal(){try{const raw=localStorage.getItem(cartKey()),obj=raw?JSON.parse(raw):{};cart=new Map(Object.entries(obj).map(([k,v])=>[k,Number(v)]))}catch{cart=new Map()}}
function saveCart(){localStorage.setItem(cartKey(),JSON.stringify(Object.fromEntries(cart)))}

async function auth(){
 const {data:{session}}=await sb.auth.getSession();if(!session){location.href="./portal.html?role=cliente";return false}
 const {data:{user}}=await sb.auth.getUser();const {data}=await sb.from("portal_profiles").select("*").eq("user_id",user.id).maybeSingle();profile=data;
 if(!profile||profile.role!=="cliente"||!profile.customer_id){location.href="./portal.html?role=cliente";return false}return true
}
async function fetchPrices(ids){
 if(!ids.length)return;for(let i=0;i<ids.length;i+=200){const {data}=await sb.from("product_prices").select("*").eq("representada_id",brand.id).eq("active",true).in("product_id",ids.slice(i,i+200));(data||[]).forEach(x=>prices.set(x.product_id,x))}
}
async function loadFilterOptions(){
 const groups=new Set(),cats=new Set();let start=0;
 while(true){const {data}=await sb.from("products").select("group_name,category").eq("representada_id",brand.id).eq("active",true).range(start,start+999);const rows=data||[];rows.forEach(p=>{if(p.group_name)groups.add(p.group_name);if(p.category)cats.add(p.category)});if(rows.length<1000)break;start+=1000}
 document.getElementById("groupFilter").innerHTML='<option value="">Todos os grupos</option>'+[...groups].sort().map(x=>'<option>'+esc(x)+'</option>').join("");
 document.getElementById("categoryFilter").innerHTML='<option value="">Todas as categorias</option>'+[...cats].sort().map(x=>'<option>'+esc(x)+'</option>').join("");
}
async function loadCartProducts(){
 const ids=[...cart.keys()];if(!ids.length)return;
 for(let i=0;i<ids.length;i+=200){const {data}=await sb.from("products").select("*").eq("representada_id",brand.id).in("id",ids.slice(i,i+200));(data||[]).forEach(p=>productCache.set(p.id,p))}
 await fetchPrices(ids);renderCart()
}
async function load(){
 if(!slug||!await auth())return;
 const {data:b,error}=await sb.from("representadas").select("*").eq("slug",slug).eq("active",true).maybeSingle();if(error||!b){document.getElementById("storeName").textContent="Loja não encontrada";return}
 brand=b;document.title=brand.name+" • Loja Biasuz";document.getElementById("storeName").textContent=brand.name;document.getElementById("storeDesc").textContent=brand.description||("Catálogo comercial "+brand.name+" para clientes Biasuz.");
 if(brand.logo_url){const img=document.getElementById("storeLogo");img.src=brand.logo_url;img.alt="Logomarca "+brand.name;img.hidden=false;document.getElementById("storeLogoFallback").hidden=true}
 document.getElementById("storeLogoFallback").textContent=brand.name.split(/\s+/).slice(0,3).map(x=>x[0]).join("");
 const [pol,prom]=await Promise.all([
  sb.from("commercial_policies").select("*").eq("representada_id",brand.id).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle(),
  sb.from("promotions").select("*").eq("representada_id",brand.id).eq("active",true).order("starts_at",{ascending:false})
 ]);
 policy=pol.data||null;renderPolicy(prom.data||[]);loadCartLocal();
 await Promise.all([loadFilterOptions(),loadCatalogMaterials(),loadProductsPage(true),loadCartProducts()]);
}
function renderPolicy(promos){
 document.getElementById("policyStrip").innerHTML=[
  ["Pedido mínimo",policy?.min_order_value!=null?money(policy.min_order_value):"A confirmar"],
  ["Pagamento",policy?.payment_terms||"A confirmar"],["Frete",policy?.freight_policy||"A confirmar"],
  ["Entrega",policy?.delivery_estimate_days?policy.delivery_estimate_days+" dias":"A confirmar"]
 ].map(x=>'<div class="policy-item"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("");
 document.getElementById("promoStrip").innerHTML=promos.map(p=>'<article class="promo-chip"><strong>'+esc(p.title)+'</strong><div>'+esc(p.description||"Consulte as regras da promoção.")+'</div></article>').join("");
}
async function loadCatalogMaterials(){
 const section=document.getElementById("materialsSection"),box=document.getElementById("catalogMaterials");
 const {data,error}=await sb.from("catalogs").select("id,title,description,catalog_type,year,page_count").eq("representada_id",brand.id).eq("published",true).order("year",{ascending:false}).order("created_at",{ascending:false});
 if(error||!data?.length){section.hidden=true;return}section.hidden=false;
 const labels={general:"Catálogo",campaign:"Campanha",price_list:"Tabela comercial",launches:"Lançamentos",technical:"Material técnico",material:"Material comercial"};
 box.innerHTML=data.map(c=>'<article class="material-card"><span class="material-type">'+esc(labels[c.catalog_type]||"Catálogo")+'</span><h3>'+esc(c.title)+'</h3><p>'+esc([c.year,c.page_count?c.page_count+" páginas":null,c.description].filter(Boolean).join(" · "))+'</p><div class="material-actions"><button class="btn btn-small" data-open-catalog="'+c.id+'">Abrir PDF</button></div></article>').join("");
 document.querySelectorAll("[data-open-catalog]").forEach(b=>b.onclick=async()=>{const old=b.textContent;b.disabled=true;b.textContent="Abrindo...";try{const {data:r,error:e}=await sb.functions.invoke("catalog-share",{body:{action:"access",catalog_id:b.dataset.openCatalog}});if(e)throw e;if(!r?.signed_url)throw new Error("Link indisponível");window.open(r.signed_url,"_blank")}catch(e){alert(e.message||"Não foi possível abrir o catálogo.")}finally{b.disabled=false;b.textContent=old}});
}
async function loadProductsPage(reset=false){
 if(reset)productPage=0;
 const q=document.getElementById("searchProduct").value.trim(),g=document.getElementById("groupFilter").value,c=document.getElementById("categoryFilter").value;
 let req=sb.from("products").select("*",{count:"exact"}).eq("representada_id",brand.id).eq("active",true).order("sort_order").order("name").range(productPage*productPageSize,productPage*productPageSize+productPageSize-1);
 if(g)req=req.eq("group_name",g);if(c)req=req.eq("category",c);
 if(q){const safe=q.replace(/[,()]/g," ");req=req.or("name.ilike.%"+safe+"%,sku.ilike.%"+safe+"%,description.ilike.%"+safe+"%")}
 const {data,count,error}=await req;if(error){document.getElementById("products").innerHTML='<div class="empty-store">'+esc(error.message)+'</div>';return}
 products=data||[];totalProducts=count||0;products.forEach(p=>productCache.set(p.id,p));await fetchPrices(products.map(p=>p.id));renderProducts();
 const pages=Math.max(1,Math.ceil(totalProducts/productPageSize));document.getElementById("productPageInfo").textContent=(totalProducts?("Página "+(productPage+1)+" de "+pages+" · "+totalProducts+" produtos"):"0 produtos");document.getElementById("prevProducts").disabled=productPage<=0;document.getElementById("nextProducts").disabled=productPage+1>=pages;
}
function renderProducts(){
 const box=document.getElementById("products");if(!products.length){box.innerHTML='<div class="empty-store">Nenhum produto disponível neste filtro.</div>';return}
 box.innerHTML=products.map(p=>{const rp=regularPrice(p),ep=effectivePrice(p),hasPromo=ep>0&&rp>ep,min=Number(prices.get(p.id)?.min_quantity||1);return '<article class="product"><div class="product-image">'+(p.image_url?'<img loading="lazy" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'<span>'+esc(p.name)+'</span>')+'</div><div class="product-body"><h3>'+esc(p.name)+'</h3><div class="product-meta">'+esc([p.group_name,p.category,p.package_info,p.sku].filter(Boolean).join(" • "))+'</div><div class="price">'+(hasPromo?'<s>'+money(rp)+'</s>':'')+'<strong class="'+(hasPromo?"promo-price":"")+'">'+(ep?money(ep):"Preço a consultar")+'</strong></div><div class="add-row"><input data-qty="'+p.id+'" type="number" min="'+min+'" step="'+min+'" value="'+min+'"><button data-add="'+p.id+'" '+(!ep?"disabled":"")+'>Adicionar</button></div></div></article>'}).join("");
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add,inp=document.querySelector('[data-qty="'+id+'"]'),qty=Number(inp.value||1);cart.set(id,(cart.get(id)||0)+qty);saveCart();renderCart()});
}
function renderCart(){
 const rows=[...cart.entries()].map(([id,qty])=>({p:productCache.get(id),qty})).filter(x=>x.p);const total=rows.reduce((s,x)=>s+effectivePrice(x.p)*x.qty,0);
 document.getElementById("cartTitle").textContent=brand?("Pedido "+brand.name):"Carrinho";
 document.getElementById("cartList").innerHTML=rows.length?rows.map(x=>'<div class="cart-item"><div class="cart-item-head"><strong>'+esc(x.p.name)+'</strong><strong>'+money(effectivePrice(x.p)*x.qty)+'</strong></div><small>'+x.qty+' × '+money(effectivePrice(x.p))+'</small><div class="cart-item-actions"><span>'+esc(x.p.unit_label||"un.")+'</span><button data-remove="'+x.p.id+'">Remover</button></div></div>').join(""):'<p class="muted">Seu carrinho está vazio.</p>';
 document.getElementById("cartTotal").textContent=money(total);document.getElementById("checkoutNote").textContent=(policy?.min_order_value!=null?"Pedido mínimo: "+money(policy.min_order_value)+". ":"")+"Este pedido será separado de todas as outras representadas.";
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart.delete(b.dataset.remove);saveCart();renderCart()});
}
async function checkout(){
 const st=document.getElementById("checkoutStatus");st.className="status";st.textContent="Validando pedido...";
 const rows=[...cart.entries()].map(([id,qty])=>({p:productCache.get(id),qty})).filter(x=>x.p&&effectivePrice(x.p)>0);if(!rows.length){st.className="status err";st.textContent="Adicione produtos com preço disponível.";return}
 const total=rows.reduce((s,x)=>s+effectivePrice(x.p)*x.qty,0);if(policy?.min_order_value!=null&&total<Number(policy.min_order_value)){st.className="status err";st.textContent="O pedido mínimo desta representada é "+money(policy.min_order_value)+".";return}
 try{
  const {data:o,error:e1}=await sb.from("orders").insert({customer_id:profile.customer_id,representada_id:brand.id,status:"rascunho",notes:"Pedido realizado no Portal do Cliente"}).select("id,order_number").single();if(e1)throw e1;
  const items=rows.map(x=>{const rp=regularPrice(x.p),ep=effectivePrice(x.p);return {order_id:o.id,product_id:x.p.id,quantity:x.qty,unit_price:ep,discount:Math.max(0,(rp-ep)*x.qty),line_total:ep*x.qty}});
  const {error:e2}=await sb.from("order_items").insert(items);if(e2)throw e2;const {data:done,error:e3}=await sb.from("orders").update({status:"enviado"}).eq("id",o.id).select("order_number,total").single();if(e3)throw e3;
  cart.clear();saveCart();renderCart();st.className="status ok";st.innerHTML='Pedido <strong>#'+esc(done.order_number)+'</strong> enviado com sucesso. O representante responsável foi notificado para dar sequência.';
  const msg=encodeURIComponent("Olá, finalizei o pedido #"+done.order_number+" da "+brand.name+" pelo Portal Biasuz. Total: "+money(done.total)+".");setTimeout(()=>window.open("https://wa.me/"+(cfg.whatsappNumber||"5575992268989")+"?text="+msg,"_blank"),500);
 }catch(e){st.className="status err";st.textContent=e.message||"Não foi possível finalizar o pedido."}
}
document.getElementById("checkoutButton").onclick=checkout;
document.getElementById("prevProducts").onclick=()=>{if(productPage>0){productPage--;loadProductsPage();document.querySelector(".catalog-panel").scrollIntoView({behavior:"smooth"})}};
document.getElementById("nextProducts").onclick=()=>{productPage++;loadProductsPage();document.querySelector(".catalog-panel").scrollIntoView({behavior:"smooth"})};
document.getElementById("searchProduct").addEventListener("input",()=>{clearTimeout(window.__biasuzSearch);window.__biasuzSearch=setTimeout(()=>loadProductsPage(true),300)});
["groupFilter","categoryFilter"].forEach(id=>document.getElementById(id).addEventListener("change",()=>loadProductsPage(true)));
load();