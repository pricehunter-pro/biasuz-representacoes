const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const wanted=(new URLSearchParams(location.search).get("role")||"cliente").toLowerCase();
const roleNames={cliente:"Painel do Cliente",representada:"Painel da Representada",representante:"Painel do Representante",admin:"Painel do Administrador"};
document.getElementById("loginTitle").textContent=roleNames[wanted]||"Acesso ao portal";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
function loginError(message){const m=String(message||"");if(/invalid login credentials/i.test(m))return "E-mail ou senha não conferem. Use “Esqueci minha senha” para criar uma nova senha.";if(/email not confirmed/i.test(m))return "Seu e-mail ainda precisa ser confirmado.";return m||"Não foi possível entrar."}
let profile=null,contextCustomerId=null,contextRepresentadaId=null,storeRows=[],showAllStores=false;
const effectiveRole=()=>profile?.role==="admin"&&["cliente","representada","representante"].includes(wanted)?wanted:profile?.role;

function showPortal(on){document.getElementById("loginView").classList.toggle("hidden",on);document.getElementById("portalView").classList.toggle("hidden",!on)}
async function getProfile(){const {data:{user}}=await sb.auth.getUser();if(!user)return null;const {data}=await sb.from("portal_profiles").select("*").eq("user_id",user.id).maybeSingle();return data}
async function resolveMasterContext(){
 const role=effectiveRole();contextCustomerId=profile?.customer_id||null;contextRepresentadaId=profile?.representada_id||null;
 if(profile?.role!=="admin")return;
 if(role==="cliente"&&!contextCustomerId){const {data}=await sb.from("customers").select("id").order("legal_name").limit(1).maybeSingle();contextCustomerId=data?.id||null}
 if(role==="representada"&&!contextRepresentadaId){const {data}=await sb.from("representadas").select("id").eq("active",true).order("name").limit(1).maybeSingle();contextRepresentadaId=data?.id||null}
}
async function boot(){
 const {data:{session}}=await sb.auth.getSession();if(!session){showPortal(false);return}
 const {data:{user:authUser}}=await sb.auth.getUser();
 if(authUser?.user_metadata?.must_change_password){location.href="./reset-password.html?mode=change";return}
 profile=await getProfile();
 if(!profile){await sb.auth.signOut();document.getElementById("loginStatus").textContent="Este usuário ainda não possui perfil liberado pela Biasuz.";showPortal(false);return}
 if(wanted==="admin"&&profile.role==="admin"){location.href="./admin.html";return}
 if(profile.role!==wanted&&profile.role!=="admin"){document.getElementById("loginStatus").textContent="Seu usuário não possui acesso a este painel.";await sb.auth.signOut();showPortal(false);return}
 await resolveMasterContext();showPortal(true);await loadPortal();
}
document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("loginStatus");st.textContent="Entrando...";const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(error){st.textContent=loginError(error.message);st.className="form-status err";return}await boot()});
document.getElementById("logout").onclick=async()=>{await sb.auth.signOut();location.reload()};

async function loadPortal(){
 const role=effectiveRole();
 document.getElementById("portalTitle").textContent=roleNames[role]||"Portal";
 document.getElementById("profileName").textContent=profile.display_name||"Usuário Biasuz";
 document.getElementById("profileRole").textContent=profile.role==="admin"&&role!=="admin"?"Acesso master · visualizando "+(roleNames[role]||role):(roleNames[role]||role);
 const form=document.getElementById("requestForm");
 if(profile.role==="admin"&&role!=="admin"){form.querySelectorAll("input,select,textarea,button").forEach(el=>el.disabled=true);document.getElementById("requestStatus").textContent="Modo master de visualização: demandas ficam somente para consulta."}
 await Promise.all([loadContext(),loadOrders(),loadRequests(),loadStores(),loadNotifications(),loadRepresentativeCatalogs(),loadRepresentativeWorkspace(),loadRepresentadaWorkspace(),loadPromotions()]);
}

async function loadRepresentativeWorkspace(){
 const role=effectiveRole(),section=document.getElementById("representativeWorkspace");if(role!=="representante"){section.classList.add("hidden");return}
 section.classList.remove("hidden");const {data:{user}}=await sb.auth.getUser();let seller=null,se=null;
 if(profile.role==="admin"){const r=await sb.from("salespeople").select("*").eq("active",true).order("name").limit(1).maybeSingle();seller=r.data;se=r.error}
 else {const r=await sb.from("salespeople").select("*").eq("user_id",user.id).eq("active",true).maybeSingle();seller=r.data;se=r.error}
 if(se||!seller){document.getElementById("repGoalList").innerHTML='<p class="muted">Seu acesso ainda não foi vinculado a um cadastro de vendedor. O administrador pode fazer o vínculo em Gestão Comercial.</p>';return}
 const now=new Date(),monthKey=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
 const [cc,perf,goals,comm]=await Promise.all([
  sb.from("customers").select("*",{count:"exact",head:true}).eq("salesperson_id",seller.id),
  sb.from("sales_performance_monthly").select("*").eq("salesperson_id",seller.id).eq("month_start",monthKey).maybeSingle(),
  sb.from("sales_goals").select("*,representadas(name)").eq("salesperson_id",seller.id).lte("period_start",now.toISOString().slice(0,10)).gte("period_end",now.toISOString().slice(0,10)).order("period_start",{ascending:false}),
  sb.from("commissions").select("expected_amount,status").eq("salesperson_id",seller.id).in("status",["prevista","aprovada"])
 ]);
 const sales=Number(perf.data?.sales_total||0),expected=(comm.data||[]).reduce((a,x)=>a+Number(x.expected_amount||0),0),goalRows=goals.data||[],overall=goalRows.find(g=>!g.representada_id)||goalRows[0],target=Number(overall?.target_value||0),pct=target?Math.min(100,Math.round(sales/target*100)):0;
 document.getElementById("repCustomerCount").textContent=(cc.count||0).toLocaleString("pt-BR");
 document.getElementById("repSalesMonth").textContent=money(sales);document.getElementById("repGoalMonth").textContent=money(target);document.getElementById("repGoalProgress").textContent=target?pct+"% atingido":"Nenhuma meta definida.";document.getElementById("repCommission").textContent=money(expected);
 document.getElementById("repGoalList").innerHTML=goalRows.length?goalRows.map(g=>'<div class="list-item"><strong>'+esc(g.representadas?.name||"Meta geral")+'</strong><small>'+new Date(g.period_start+"T12:00:00").toLocaleDateString("pt-BR")+' a '+new Date(g.period_end+"T12:00:00").toLocaleDateString("pt-BR")+'</small><p>Meta: '+money(g.target_value)+' · '+Number(g.target_orders||0)+' pedidos</p></div>').join(""):'<p class="muted">Nenhuma meta vigente cadastrada.</p>';
}

function renderStores(){
 const grid=document.getElementById("storeGrid"),q=(document.getElementById("storeSearch")?.value||"").trim().toLowerCase(),fallback=url=>"https://www.google.com/s2/favicons?domain_url="+encodeURIComponent(url||"https://bia.dunihub.online")+"&sz=256";
 let rows=storeRows.filter(r=>!q||[r.name,(r.segments||[]).join(" ")].join(" ").toLowerCase().includes(q));
 const total=rows.length;if(!showAllStores&&!q)rows=rows.slice(0,8);
 grid.innerHTML=rows.length?rows.map(r=>'<article class="store-card"><div class="store-logo"><img src="'+esc(r.logo_url||fallback(r.official_url))+'" alt="Logomarca '+esc(r.name)+'" loading="lazy"></div><div class="store-card-body"><h3>'+esc(r.name)+'</h3><p>'+esc((r.segments||[]).join(" • "))+' · '+Number(r.products_count||0)+' produtos</p><a class="btn btn-small" href="./store.html?slug='+encodeURIComponent(r.slug)+'">Entrar na loja</a></div></article>').join(""):'<p class="muted">Nenhuma representada encontrada.</p>';
 const btn=document.getElementById("toggleStores");if(btn){btn.classList.toggle("hidden",total<=8||!!q);btn.textContent=showAllStores?"Mostrar menos":"Ver todas ("+total+")"}
}
async function loadStores(){
 const role=effectiveRole(),section=document.getElementById("storesSection");if(role!=="cliente"){section.classList.add("hidden");return}
 section.classList.remove("hidden");const {data,error}=await sb.from("representadas").select("id,name,slug,segments,logo_url,official_url,products_count").eq("active",true).order("name");
 if(error){document.getElementById("storeGrid").innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 storeRows=data||[];renderStores();
}
document.getElementById("storeSearch")?.addEventListener("input",renderStores);
document.getElementById("toggleStores")?.addEventListener("click",()=>{showAllStores=!showAllStores;renderStores()});

async function loadRepresentadaWorkspace(){
 const role=effectiveRole(),section=document.getElementById("representadaWorkspace"),manager=document.getElementById("representadaPromoManager");
 if(role!=="representada"){section.classList.add("hidden");manager.classList.add("hidden");return}
 section.classList.remove("hidden");
 if(profile.role==="representada")manager.classList.remove("hidden");else manager.classList.add("hidden");
 const id=contextRepresentadaId||profile.representada_id;if(!id)return;
 const {data,error}=await sb.rpc("representada_dashboard_metrics",{p_representada_id:id});
 if(error){document.getElementById("brandRecentOrders").innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 document.getElementById("brandOrdersMonth").textContent=Number(data?.orders_month_count||0).toLocaleString("pt-BR");
 document.getElementById("brandSalesMonth").textContent=money(data?.sales_month_total);
 document.getElementById("brandPositiveMonth").textContent=Number(data?.positive_customers_month||0).toLocaleString("pt-BR");
 document.getElementById("brandTicketMonth").textContent=money(data?.average_ticket_month);
 const statuses=data?.status_breakdown||[],max=Math.max(1,...statuses.map(x=>Number(x.value||0)));
 document.getElementById("brandStatusChart").innerHTML=statuses.length?statuses.map(x=>'<div class="bar-row"><div><strong>'+esc(x.label)+'</strong><span>'+Number(x.value||0)+'</span></div><i><b style="width:'+Math.round(Number(x.value||0)/max*100)+'%"></b></i></div>').join(""):'<p class="muted">Ainda não há pedidos para compor o gráfico.</p>';
 const recent=data?.recent_orders||[];document.getElementById("brandRecentOrders").innerHTML=recent.length?recent.map(o=>'<div class="list-item"><strong>Pedido #'+esc(o.order_number)+' · '+esc(o.customer)+'</strong><small>'+new Date(o.created_at).toLocaleDateString("pt-BR")+' · '+esc(o.status)+'</small><p>'+money(o.total)+'</p></div>').join(""):'<p class="muted">Nenhum pedido registrado.</p>';
}
document.getElementById("representadaPromoForm")?.addEventListener("submit",async e=>{
 e.preventDefault();if(profile?.role!=="representada"||!profile.representada_id)return;
 const d=Object.fromEntries(new FormData(e.currentTarget)),st=document.getElementById("representadaPromoStatus");st.className="form-status";st.textContent="Publicando...";
 const row={representada_id:profile.representada_id,title:d.title,description:d.description||null,starts_at:d.starts_at?new Date(d.starts_at).toISOString():null,ends_at:d.ends_at?new Date(d.ends_at).toISOString():null,rules:{kind:d.kind,link_url:d.link_url||null},active:true};
 const {error}=await sb.from("promotions").insert(row);if(error){st.className="form-status err";st.textContent=error.message;return}
 st.className="form-status ok";st.textContent="Promoção publicada no Painel do Cliente.";e.currentTarget.reset();await loadPromotions();
});

async function loadPromotions(){
 const role=effectiveRole(),section=document.getElementById("promotionsSection");if(role!=="cliente"){section.classList.add("hidden");return}
 section.classList.remove("hidden");const now=new Date().toISOString();
 const {data,error}=await sb.from("promotions").select("id,title,description,starts_at,ends_at,rules,representada_id,representadas(name,slug,logo_url,official_url)").eq("active",true).or("starts_at.is.null,starts_at.lte."+now).order("created_at",{ascending:false}).limit(60);
 const rows=(data||[]).filter(x=>!x.ends_at||new Date(x.ends_at)>=new Date());
 const box=document.getElementById("promotionsGrid");if(error){box.innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 box.innerHTML=rows.length?rows.map(p=>{const r=p.representadas||{},link=p.rules?.link_url||("./store.html?slug="+encodeURIComponent(r.slug||""));return '<article class="promotion-card"><div class="promotion-brand">'+esc(r.name||"Biasuz")+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(p.description||"Condição promocional disponível por período limitado.")+'</p><div class="promotion-meta">'+(p.ends_at?'Até '+new Date(p.ends_at).toLocaleDateString("pt-BR"):'Consulte condições')+'</div><a class="btn btn-small" href="'+esc(link)+'">Aproveitar promoção</a></article>'}).join(""):'<div class="empty-state"><strong>Nenhuma promoção ativa agora.</strong><span>Quando a Biasuz ou uma representada liberar uma campanha, ela aparecerá aqui.</span></div>';
}

async function loadContext(){
 const role=effectiveRole(),box=document.getElementById("contextContent"),title=document.getElementById("contextTitle");
 if(role==="cliente"&&contextCustomerId){const {data:c}=await sb.from("customers").select("*").eq("id",contextCustomerId).maybeSingle();title.textContent=c?.trade_name||c?.legal_name||"Minha empresa";box.innerHTML=c?'<div class="policy-grid"><div class="policy-box"><span>CNPJ</span><strong>'+esc(c.cnpj)+'</strong></div><div class="policy-box"><span>Cidade</span><strong>'+esc((c.city||"")+" / "+(c.state||""))+'</strong></div><div class="policy-box"><span>Telefone</span><strong>'+esc(c.phone1||"—")+'</strong></div><div class="policy-box"><span>Status comercial</span><strong>'+esc(c.lifecycle_stage)+'</strong></div></div>':'<p class="muted">Cadastro não localizado.</p>'}
 else if(role==="representada"&&contextRepresentadaId){const {data:r}=await sb.from("representadas").select("*").eq("id",contextRepresentadaId).maybeSingle();const {data:p}=await sb.from("commercial_policies").select("*").eq("representada_id",contextRepresentadaId).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle();title.textContent=r?.name||"Representada";box.innerHTML='<div class="policy-grid"><div class="policy-box"><span>Pedido mínimo</span><strong>'+(p?.min_order_value!=null?money(p.min_order_value):"A cadastrar")+'</strong></div><div class="policy-box"><span>Prazo de pagamento</span><strong>'+esc(p?.payment_terms||"A cadastrar")+'</strong></div><div class="policy-box"><span>Frete</span><strong>'+esc(p?.freight_policy||"A cadastrar")+'</strong></div><div class="policy-box"><span>Previsão de entrega</span><strong>'+(p?.delivery_estimate_days?esc(p.delivery_estimate_days+" dias"):"A cadastrar")+'</strong></div></div><p class="muted">'+esc(p?.notes||"")+'</p>'}
 else if(role==="representante"){title.textContent="Carteira e pedidos sob sua responsabilidade";box.innerHTML='<p class="muted">Neste painel você acompanha pedidos vinculados ao seu usuário e pode abrir demandas comerciais, financeiras ou cadastrais.</p>'}
 else box.innerHTML='<p class="muted">Acesso administrativo.</p>';
}
async function loadOrders(){
 const role=effectiveRole();let req=sb.from("orders").select("id,order_number,status,total,created_at,representada_id,customer_id").order("created_at",{ascending:false}).limit(100);
 if(profile.role==="admin"&&role==="cliente"&&contextCustomerId)req=req.eq("customer_id",contextCustomerId);
 if(profile.role==="admin"&&role==="representada"&&contextRepresentadaId)req=req.eq("representada_id",contextRepresentadaId);
 const {data,error}=await req,rows=data||[];document.getElementById("orderCount").textContent=rows.length;
 document.getElementById("ordersList").innerHTML=error?'<p class="form-status err">'+esc(error.message)+'</p>':rows.length?rows.map(o=>'<div class="list-item"><strong>Pedido #'+esc(o.order_number)+'</strong><small>'+new Date(o.created_at).toLocaleDateString("pt-BR")+'</small><div class="pill">'+esc(o.status)+'</div><p>Total: '+money(o.total)+'</p></div>').join(""):'<p class="muted">Nenhum pedido disponível para este acesso.</p>';
}
async function loadRepresentativeCatalogs(){
 const role=effectiveRole(),section=document.getElementById("repCatalogsSection"),box=document.getElementById("repCatalogsList"),title=document.getElementById("catalogSectionTitle"),help=document.getElementById("catalogSectionHelp");
 if(!["cliente","representante","representada"].includes(role)){section.classList.add("hidden");return}section.classList.remove("hidden");
 if(role==="representante"){title.textContent="Catálogos para compartilhar";help.textContent="Gere um link temporário e envie ao cliente pelo WhatsApp ou e-mail."}
 else if(role==="cliente"){title.textContent="Catálogos comerciais";help.textContent="Abra os catálogos publicados das representadas diretamente no seu painel."}
 else {title.textContent="Catálogos da sua representada";help.textContent="Materiais comerciais publicados e disponíveis para clientes e força de vendas."}
 let req=sb.from("catalogs").select("id,title,catalog_type,year,representada_id,representadas(name)").eq("published",true).order("created_at",{ascending:false}).limit(100);
 if(role==="representada"&&contextRepresentadaId)req=req.eq("representada_id",contextRepresentadaId);
 const {data,error}=await req;if(error){box.innerHTML='<p class="form-status err">'+esc(error.message)+'</p>';return}
 const rows=data||[];box.innerHTML=rows.length?rows.map(c=>'<div class="list-item"><strong>'+esc(c.title)+'</strong><small>'+esc(c.representadas?.name||"")+' · '+esc(c.year||"")+' · '+esc(c.catalog_type)+'</small><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px">'+(role==="representante"?'<button class="btn btn-small" data-cat-wa="'+c.id+'">WhatsApp</button><button class="btn btn-small btn-outline" data-cat-mail="'+c.id+'">E-mail</button>':'<button class="btn btn-small" data-cat-open="'+c.id+'">Abrir catálogo</button>')+'</div></div>').join(""):'<p class="muted">Nenhum catálogo publicado.</p>';
 async function link(id,channel){const {data:r,error:e}=await sb.functions.invoke("catalog-share",{body:{catalog_id:id,channel,expires_days:30}});if(e)throw e;return (cfg.siteUrl||location.origin)+r.path}
 document.querySelectorAll("[data-cat-wa]").forEach(b=>b.onclick=async()=>{try{const x=rows.find(v=>v.id===b.dataset.catWa),u=await link(x.id,"whatsapp");window.open("https://wa.me/?text="+encodeURIComponent("Catálogo "+x.title+" — Biasuz Representações\n"+u),"_blank")}catch(e){alert(e.message)}});
 document.querySelectorAll("[data-cat-mail]").forEach(b=>b.onclick=async()=>{try{const x=rows.find(v=>v.id===b.dataset.catMail),u=await link(x.id,"email");location.href="mailto:?subject="+encodeURIComponent("Catálogo "+x.title+" — Biasuz")+"&body="+encodeURIComponent("Segue o catálogo comercial:\n\n"+u)}catch(e){alert(e.message)}});
 document.querySelectorAll("[data-cat-open]").forEach(b=>b.onclick=async()=>{try{const {data:r,error:e}=await sb.functions.invoke("catalog-share",{body:{catalog_id:b.dataset.catOpen,action:"access"}});if(e||!r?.signed_url)throw e||new Error("Catálogo indisponível.");window.open(r.signed_url,"_blank")}catch(e){alert(e.message||e)}});
}
async function loadNotifications(){const {data,error}=await sb.from("notifications").select("*").order("created_at",{ascending:false}).limit(50);const rows=data||[];document.getElementById("notificationCount").textContent=rows.filter(x=>!x.read_at).length;const box=document.getElementById("notificationsList");box.innerHTML=error?'<p class="form-status err">'+esc(error.message)+'</p>':rows.length?rows.map(n=>'<div class="list-item"><strong>'+esc(n.title)+'</strong><small>'+new Date(n.created_at).toLocaleString("pt-BR")+'</small><p>'+esc(n.body||"")+'</p>'+(n.read_at?'':'<button class="btn btn-small" data-read="'+n.id+'">Marcar como lida</button>')+'</div>').join(""):'<p class="muted">Nenhuma notificação pendente.</p>';document.querySelectorAll("[data-read]").forEach(b=>b.onclick=async()=>{await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("id",b.dataset.read);await loadNotifications()})}
async function loadRequests(){const {data,error}=await sb.from("portal_requests").select("*").order("created_at",{ascending:false}).limit(100);const rows=data||[];document.getElementById("requestCount").textContent=rows.filter(x=>["aberta","em_analise"].includes(x.status)).length;document.getElementById("requestsList").innerHTML=error?'<p class="form-status err">'+esc(error.message)+'</p>':rows.length?rows.map(r=>'<div class="list-item"><strong>'+esc(r.title)+'</strong><small>'+new Date(r.created_at).toLocaleString("pt-BR")+'</small><div class="pill">'+esc(r.status)+'</div><p>'+esc(r.description)+'</p>'+(r.admin_response?'<p><strong>Resposta Biasuz:</strong> '+esc(r.admin_response)+'</p>':'')+'</div>').join(""):'<p class="muted">Nenhuma demanda aberta.</p>'}
document.getElementById("requestForm").addEventListener("submit",async e=>{e.preventDefault();if(profile.role==="admin"&&effectiveRole()!=="admin")return;const d=Object.fromEntries(new FormData(e.currentTarget)),st=document.getElementById("requestStatus");st.textContent="Enviando...";const {data:{user}}=await sb.auth.getUser();const row={user_id:user.id,role:effectiveRole(),customer_id:profile.customer_id||null,representada_id:profile.representada_id||null,request_type:d.request_type,title:d.title,description:d.description};const {error}=await sb.from("portal_requests").insert(row);if(error){st.className="form-status err";st.textContent=error.message;return}st.className="form-status ok";st.textContent="Demanda enviada.";e.currentTarget.reset();await loadRequests()});
window.BiasuzAuth?.init(sb,{role:wanted,statusId:"loginStatus",redirectPath:"/portal.html?role="+encodeURIComponent(wanted)});boot();