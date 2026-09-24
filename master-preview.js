const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])),money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
let role="cliente";
const fallbackLogo=url=>"https://www.google.com/s2/favicons?domain_url="+encodeURIComponent(url||"https://bia.dunihub.online")+"&sz=256";
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
const card=(a,b,c="")=>'<div class="card"><small>'+esc(a)+'</small><strong>'+esc(b)+'</strong>'+(c?'<small>'+esc(c)+'</small>':'')+'</div>';
async function render(){
 if(role==="cliente")return renderClient();
 if(role==="representada")return renderBrand();
 return renderRep();
}
async function renderClient(){
 const [c,o,b]=await Promise.all([sb.from("customers").select("*",{count:"exact",head:true}),sb.from("orders").select("*",{count:"exact",head:true}),sb.from("representadas").select("name,official_url,logo_url,products_count").eq("active",true).order("name")]);
 document.getElementById("summary").innerHTML=card("Carteira",String(c.count||0),"clientes/prospects")+card("Pedidos",String(o.count||0),"registrados")+card("Lojas",(b.data||[]).length,"representadas ativas")+card("Modo","Master","somente leitura");
 document.getElementById("content").innerHTML='<span class="eyebrow">Painel do Cliente</span><h2>Lojas disponíveis</h2><p class="muted">Prévia do ambiente de compra. A conta master visualiza a estrutura sem assumir a identidade de um cliente.</p><div class="grid">'+(b.data||[]).map(x=>'<div class="card"><div class="logo"><img src="'+esc(x.logo_url||fallbackLogo(x.official_url))+'" alt="Logomarca '+esc(x.name)+'"></div><strong>'+esc(x.name)+'</strong><small>'+Number(x.products_count||0)+' produtos cadastrados</small></div>').join("")+'</div>';
}
async function renderBrand(){
 const [b,o,cats]=await Promise.all([sb.from("representadas").select("id,name,official_url,logo_url,products_count").eq("active",true).order("name"),sb.from("orders").select("*",{count:"exact",head:true}),sb.from("catalogs").select("*",{count:"exact",head:true}).eq("published",true)]);
 document.getElementById("summary").innerHTML=card("Representadas",(b.data||[]).length,"ativas")+card("Pedidos",String(o.count||0),"operação global")+card("Catálogos",String(cats.count||0),"publicados")+card("Modo","Master","somente leitura");
 document.getElementById("content").innerHTML='<span class="eyebrow">Painel da Representada</span><h2>Operações por indústria</h2><p class="muted">Prévia master da área destinada às indústrias representadas.</p><div class="grid">'+(b.data||[]).map(x=>'<div class="card"><div class="logo"><img src="'+esc(x.logo_url||fallbackLogo(x.official_url))+'" alt="Logomarca '+esc(x.name)+'"></div><strong>'+esc(x.name)+'</strong><small>'+Number(x.products_count||0)+' produtos cadastrados</small></div>').join("")+'</div>';
}
async function renderRep(){
 const {data:sellers}=await sb.from("salespeople").select("*").eq("active",true).order("name");const rows=[];
 for(const s of sellers||[]){const [c,p,g,cm]=await Promise.all([sb.from("customers").select("*",{count:"exact",head:true}).eq("salesperson_id",s.id),sb.from("sales_performance_monthly").select("*").eq("salesperson_id",s.id).order("month_start",{ascending:false}).limit(1).maybeSingle(),sb.from("sales_goals").select("*",{count:"exact",head:true}).eq("salesperson_id",s.id),sb.from("commissions").select("expected_amount").eq("salesperson_id",s.id).in("status",["prevista","aprovada"])]);rows.push({s,customers:c.count||0,perf:p.data,goals:g.count||0,commission:(cm.data||[]).reduce((a,x)=>a+Number(x.expected_amount||0),0)})}
 document.getElementById("summary").innerHTML=card("Vendedores",String(rows.length),"ativos")+card("Carteira",rows.reduce((a,x)=>a+x.customers,0).toLocaleString("pt-BR"),"clientes atribuídos")+card("Metas",String(rows.reduce((a,x)=>a+x.goals,0)),"cadastradas")+card("Modo","Master","somente leitura");
 document.getElementById("content").innerHTML='<span class="eyebrow">Painel do Representante</span><h2>Carteira, metas e performance</h2><div class="list">'+(rows.length?rows.map(x=>'<div class="item"><strong>'+esc(x.s.name)+'</strong><small>'+x.customers.toLocaleString("pt-BR")+' clientes · '+Number(x.goals)+' metas</small><p>Vendas recentes: '+money(x.perf?.sales_total||0)+' · Comissão prevista/aprovada: '+money(x.commission)+'</p></div>').join(""):'<p class="muted">Nenhum vendedor cadastrado.</p>')+'</div>';
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{role=b.dataset.role;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));render()});
auth().then(ok=>ok&&render());