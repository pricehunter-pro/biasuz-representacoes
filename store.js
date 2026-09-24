const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const slug=new URLSearchParams(location.search).get("slug");
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let profile=null,brand=null,policy=null,products=[],prices=new Map(),cart=new Map();

function effectivePrice(p){
 const pr=prices.get(p.id);if(!pr)return 0;
 const now=Date.now(),from=pr.valid_from?Date.parse(pr.valid_from):null,to=pr.valid_until?Date.parse(pr.valid_until):null;
 const promoValid=pr.promo_price!=null&&(!from||now>=from)&&(!to||now<=to);
 return promoValid?Number(pr.promo_price):Number(pr.price||0)
}
function regularPrice(p){return Number(prices.get(p.id)?.price||0)}
function cartKey(){return brand?"biasuz_cart_"+brand.id:null}
function loadCartLocal(){try{const raw=localStorage.getItem(cartKey());const obj=raw?JSON.parse(raw):{};cart=new Map(Object.entries(obj).map(([k,v])=>[k,Number(v)]))}catch{cart=new Map()}}
function saveCart(){localStorage.setItem(cartKey(),JSON.stringify(Object.fromEntries(cart)))}

async function auth(){
 const {data:{session}}=await sb.auth.getSession();if(!session){location.href="./portal.html?role=cliente";return false}
 const {data:{user}}=await sb.auth.getUser();
 const {data}=await sb.from("portal_profiles").select("*").eq("user_id",user.id).maybeSingle();
 profile=data;
 if(!profile||profile.role!=="cliente"||!profile.customer_id){location.href="./portal.html?role=cliente";return false}
 return true
}
async function load(){
 if(!slug||!await auth())return;
 const {data:b,error}=await sb.from("representadas").select("*").eq("slug",slug).eq("active",true).maybeSingle();
 if(error||!b){document.getElementById("storeName").textContent="Loja não encontrada";return}
 brand=b;document.title=brand.name+" • Loja Biasuz";document.getElementById("storeName").textContent=brand.name;document.getElementById("storeDesc").textContent=brand.description||("Catálogo comercial "+brand.name+" para clientes Biasuz.");
 if(brand.logo_url){const img=document.getElementById("storeLogo");img.src=brand.logo_url;img.alt="Logomarca "+brand.name;img.hidden=false;document.getElementById("storeLogoFallback").hidden=true}
 const initials=brand.name.split(/\s+/).slice(0,3).map(x=>x[0]).join("");document.getElementById("storeLogoFallback").textContent=initials;

 const [pol,prom,prod,prc]=await Promise.all([
  sb.from("commercial_policies").select("*").eq("representada_id",brand.id).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle(),
  sb.from("promotions").select("*").eq("representada_id",brand.id).eq("active",true).order("starts_at",{ascending:false}),
  sb.from("products").select("*").eq("representada_id",brand.id).eq("active",true).order("sort_order").order("name"),
  sb.from("product_prices").select("*").eq("representada_id",brand.id).eq("active",true)
 ]);
 policy=pol.data||null;products=prod.data||[];(prc.data||[]).forEach(x=>prices.set(x.product_id,x));
 renderPolicy(prom.data||[]);buildFilters();loadCartLocal();renderProducts();renderCart();
}
function renderPolicy(promos){
 document.getElementById("policyStrip").innerHTML=[
  ["Pedido mínimo",policy?.min_order_value!=null?money(policy.min_order_value):"A confirmar"],
  ["Pagamento",policy?.payment_terms||"A confirmar"],
  ["Frete",policy?.freight_policy||"A confirmar"],
  ["Entrega",policy?.delivery_estimate_days?policy.delivery_estimate_days+" dias":"A confirmar"]
 ].map(x=>'<div class="policy-item"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("");
 document.getElementById("promoStrip").innerHTML=promos.map(p=>'<article class="promo-chip"><strong>'+esc(p.title)+'</strong><div>'+esc(p.description||"Consulte as regras da promoção.")+'</div></article>').join("");
}
function buildFilters(){
 const groups=[...new Set(products.map(p=>p.group_name).filter(Boolean))].sort(),cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort();
 document.getElementById("groupFilter").innerHTML='<option value="">Todos os grupos</option>'+groups.map(x=>'<option>'+esc(x)+'</option>').join("");
 document.getElementById("categoryFilter").innerHTML='<option value="">Todas as categorias</option>'+cats.map(x=>'<option>'+esc(x)+'</option>').join("");
}
function renderProducts(){
 const q=document.getElementById("searchProduct").value.toLowerCase(),g=document.getElementById("groupFilter").value,c=document.getElementById("categoryFilter").value;
 const rows=products.filter(p=>(!q||[p.name,p.sku,p.description,p.group_name,p.category].join(" ").toLowerCase().includes(q))&&(!g||p.group_name===g)&&(!c||p.category===c));
 const box=document.getElementById("products");
 if(!rows.length){box.innerHTML='<div class="empty-store">Nenhum produto disponível neste filtro. O catálogo desta representada pode ainda estar em sincronização.</div>';return}
 box.innerHTML=rows.map(p=>{const rp=regularPrice(p),ep=effectivePrice(p),hasPromo=ep>0&&rp>ep,min=Number(prices.get(p.id)?.min_quantity||1);return '<article class="product"><div class="product-image">'+(p.image_url?'<img loading="lazy" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'<span>'+esc(p.name)+'</span>')+'</div><div class="product-body"><h3>'+esc(p.name)+'</h3><div class="product-meta">'+esc([p.group_name,p.category,p.package_info,p.sku].filter(Boolean).join(" • "))+'</div><div class="price">'+(hasPromo?'<s>'+money(rp)+'</s>':'')+'<strong class="'+(hasPromo?"promo-price":"")+'">'+(ep?money(ep):"Preço a consultar")+'</strong></div><div class="add-row"><input data-qty="'+p.id+'" type="number" min="'+min+'" step="'+min+'" value="'+min+'"><button data-add="'+p.id+'" '+(!ep?"disabled":"")+'>Adicionar</button></div></div></article>'}).join("");
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add,inp=document.querySelector('[data-qty="'+id+'"]'),qty=Number(inp.value||1);cart.set(id,(cart.get(id)||0)+qty);saveCart();renderCart()});
}
function renderCart(){
 const rows=[...cart.entries()].map(([id,qty])=>({p:products.find(x=>x.id===id),qty})).filter(x=>x.p);
 const total=rows.reduce((s,x)=>s+effectivePrice(x.p)*x.qty,0);
 document.getElementById("cartTitle").textContent=brand?("Pedido "+brand.name):"Carrinho";
 document.getElementById("cartList").innerHTML=rows.length?rows.map(x=>'<div class="cart-item"><div class="cart-item-head"><strong>'+esc(x.p.name)+'</strong><strong>'+money(effectivePrice(x.p)*x.qty)+'</strong></div><small>'+x.qty+' × '+money(effectivePrice(x.p))+'</small><div class="cart-item-actions"><span>'+esc(x.p.unit_label||"un.")+'</span><button data-remove="'+x.p.id+'">Remover</button></div></div>').join(""):'<p class="muted">Seu carrinho está vazio.</p>';
 document.getElementById("cartTotal").textContent=money(total);
 document.getElementById("checkoutNote").textContent=(policy?.min_order_value!=null?"Pedido mínimo: "+money(policy.min_order_value)+". ":"")+"Este pedido será separado de todas as outras representadas.";
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart.delete(b.dataset.remove);saveCart();renderCart()});
}
async function checkout(){
 const st=document.getElementById("checkoutStatus");st.className="status";st.textContent="Validando pedido...";
 const rows=[...cart.entries()].map(([id,qty])=>({p:products.find(x=>x.id===id),qty})).filter(x=>x.p&&effectivePrice(x.p)>0);
 if(!rows.length){st.className="status err";st.textContent="Adicione produtos com preço disponível.";return}
 const total=rows.reduce((s,x)=>s+effectivePrice(x.p)*x.qty,0);
 if(policy?.min_order_value!=null&&total<Number(policy.min_order_value)){st.className="status err";st.textContent="O pedido mínimo desta representada é "+money(policy.min_order_value)+".";return}
 try{
  const {data:o,error:e1}=await sb.from("orders").insert({customer_id:profile.customer_id,representada_id:brand.id,status:"rascunho",notes:"Pedido realizado no Portal do Cliente"}).select("id,order_number").single();if(e1)throw e1;
  const items=rows.map(x=>{const rp=regularPrice(x.p),ep=effectivePrice(x.p);return {order_id:o.id,product_id:x.p.id,quantity:x.qty,unit_price:ep,discount:Math.max(0,(rp-ep)*x.qty),line_total:ep*x.qty}});
  const {error:e2}=await sb.from("order_items").insert(items);if(e2)throw e2;
  const {data:done,error:e3}=await sb.from("orders").update({status:"enviado"}).eq("id",o.id).select("order_number,total").single();if(e3)throw e3;
  cart.clear();saveCart();renderCart();st.className="status ok";st.innerHTML='Pedido <strong>#'+esc(done.order_number)+'</strong> enviado com sucesso. O representante responsável foi notificado para dar sequência.';
  const msg=encodeURIComponent("Olá, finalizei o pedido #"+done.order_number+" da "+brand.name+" pelo Portal Biasuz. Total: "+money(done.total)+".");
  setTimeout(()=>window.open("https://wa.me/"+(cfg.whatsappNumber||"5575992268989")+"?text="+msg,"_blank"),500);
 }catch(e){st.className="status err";st.textContent=e.message||"Não foi possível finalizar o pedido."}
}
document.getElementById("checkoutButton").onclick=checkout;
["searchProduct","groupFilter","categoryFilter"].forEach(id=>document.getElementById(id).addEventListener(id==="searchProduct"?"input":"change",renderProducts));
load();