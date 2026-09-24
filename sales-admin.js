const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
let sellers=[],brands=[],regions=[],performance=[],repProfiles=[];
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
function setStatus(id,msg,kind=""){const el=document.getElementById(id);el.className="status "+kind;el.textContent=msg}
function options(rows,value="id",label="name",blank="Selecione"){return '<option value="">'+blank+'</option>'+rows.map(x=>'<option value="'+esc(x[value])+'">'+esc(x[label])+'</option>').join("")}
function activate(name){document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===name));document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));document.getElementById("view-"+name).classList.remove("hidden")}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>activate(b.dataset.view));

async function boot(){
 if(!await auth())return;
 const now=new Date(),m=String(now.getMonth()+1).padStart(2,"0");document.getElementById("perfMonth").value=now.getFullYear()+"-"+m;
 await Promise.all([loadBase(),loadKpis(),loadGoals(),loadRules(),loadCommissions()]);
 await loadPerformance();
}
async function loadBase(){
 const [s,b,r,p]=await Promise.all([
  sb.from("salespeople").select("*").order("name"),
  sb.from("representadas").select("id,name,slug").eq("active",true).order("name"),
  sb.from("sales_regions").select("*").eq("active",true).order("code"),
  sb.from("portal_profiles").select("user_id,display_name,role,active").eq("role","representante").eq("active",true).order("display_name")
 ]);
 if(s.error)throw s.error;if(b.error)throw b.error;if(r.error)throw r.error;if(p.error)throw p.error;
 sellers=s.data||[];brands=b.data||[];regions=r.data||[];repProfiles=p.data||[];
 document.getElementById("goalSeller").innerHTML=options(sellers);
 document.getElementById("goalBrand").innerHTML=options(brands,"id","name","Todas");
 document.getElementById("ruleBrand").innerHTML=options(brands);
 document.getElementById("ruleSeller").innerHTML=options(sellers,"id","name","Todos / regra geral");
 renderSellers();renderRegions();await renderSellerSummary();
}
async function loadKpis(){
 const start=new Date();start.setDate(1);start.setHours(0,0,0,0);
 const [s,c,o,cm]=await Promise.all([
  sb.from("salespeople").select("*",{count:"exact",head:true}).eq("active",true),
  sb.from("customers").select("*",{count:"exact",head:true}).not("salesperson_id","is",null),
  sb.from("orders").select("*",{count:"exact",head:true}).gte("created_at",start.toISOString()),
  sb.from("commissions").select("expected_amount").eq("status","prevista")
 ]);
 document.getElementById("kSellers").textContent=s.count||0;document.getElementById("kAssigned").textContent=(c.count||0).toLocaleString("pt-BR");document.getElementById("kOrders").textContent=o.count||0;document.getElementById("kCommission").textContent=money((cm.data||[]).reduce((a,x)=>a+Number(x.expected_amount||0),0))
}
function renderSellers(){
 const profileOpts=s=>'<option value="">Sem acesso vinculado</option>'+repProfiles.map(p=>'<option value="'+p.user_id+'" '+(s.user_id===p.user_id?"selected":"")+'>'+esc(p.display_name||p.user_id)+'</option>').join("");
 document.getElementById("sellerRows").innerHTML=sellers.length?sellers.map(s=>'<div class="row"><div><strong>'+esc(s.name)+'</strong><br><small>'+esc(s.email||"Sem e-mail")+' · '+esc(s.phone||"Sem telefone")+'</small><div style="margin-top:8px"><select data-seller-profile="'+s.id+'">'+profileOpts(s)+'</select></div></div><div><small>Comissão padrão</small><br><strong>'+Number(s.default_commission_rate||0).toLocaleString("pt-BR")+"%</strong></div><div><span class="badge '+(s.active?"ok":"warn")+'">'+(s.active?"Ativo":"Inativo")+'</span></div><div class="action-row"><button class="btn btn-small btn-outline" data-link-seller="'+s.id+'">Vincular acesso</button><button class="btn btn-small btn-outline" data-toggle-seller="'+s.id+'">'+(s.active?"Desativar":"Ativar")+'</button></div></div>').join(""):'<p class="muted">Nenhum vendedor cadastrado.</p>';
 document.querySelectorAll("[data-toggle-seller]").forEach(b=>b.onclick=async()=>{const s=sellers.find(x=>x.id===b.dataset.toggleSeller);await sb.from("salespeople").update({active:!s.active,updated_at:new Date().toISOString()}).eq("id",s.id);await loadBase();await loadKpis()});
 document.querySelectorAll("[data-link-seller]").forEach(b=>b.onclick=async()=>{const id=b.dataset.linkSeller,sel=document.querySelector('[data-seller-profile="'+id+'"]'),user_id=sel?.value||null;const {error}=await sb.from("salespeople").update({user_id,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message);await loadBase();alert(user_id?"Acesso do representante vinculado.":"Vínculo de acesso removido.");});
}
async function renderSellerSummary(){
 const box=document.getElementById("sellerSummary"),counts=[];
 for(const s of sellers){const {count}=await sb.from("customers").select("*",{count:"exact",head:true}).eq("salesperson_id",s.id);counts.push({name:s.name,count:count||0})}
 box.innerHTML=counts.map(x=>'<div class="row"><div><strong>'+esc(x.name)+'</strong><br><small>Clientes atribuídos</small></div><div><strong>'+x.count.toLocaleString("pt-BR")+'</strong></div><div></div><div></div></div>').join("")
}
function renderRegions(){
 document.getElementById("regionRows").innerHTML=regions.map(r=>'<div class="row"><div><strong>'+esc(r.name)+'</strong><br><small>'+esc(r.description||"")+'</small></div><div><span class="badge">'+esc(r.code)+'</span></div><div><small>UF</small><br><strong>'+esc(r.state||"—")+'</strong></div><div></div></div>').join("");
}
document.getElementById("sellerForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));setStatus("sellerStatus","Salvando...");const {error}=await sb.from("salespeople").insert({name:d.name,email:d.email||null,phone:d.phone||null,default_commission_rate:Number(d.rate||0),notes:d.notes||null,active:true});if(error)return setStatus("sellerStatus",error.message,"err");e.currentTarget.reset();e.currentTarget.elements.rate.value=0;setStatus("sellerStatus","Vendedor cadastrado.","ok");await loadBase();await loadKpis()};

async function loadGoals(){
 const {data,error}=await sb.from("sales_goals").select("*,salespeople(name),representadas(name)").order("period_start",{ascending:false}).limit(100);const box=document.getElementById("goalRows");if(error){box.innerHTML='<p class="status err">'+esc(error.message)+'</p>';return}
 const rows=data||[];box.innerHTML=rows.length?rows.map(g=>{const pct=0;return '<div class="row"><div><strong>'+esc(g.salespeople?.name||"")+'</strong><br><small>'+esc(g.representadas?.name||"Todas as representadas")+' · '+new Date(g.period_start+"T12:00:00").toLocaleDateString("pt-BR")+" a "+new Date(g.period_end+"T12:00:00").toLocaleDateString("pt-BR")+'</small><div class="goal-progress"><i style="width:'+pct+'%"></i></div></div><div><small>Meta vendas</small><br><strong>'+money(g.target_value)+'</strong></div><div><small>Pedidos</small><br><strong>'+Number(g.target_orders||0)+'</strong></div><button class="btn btn-small btn-outline danger" data-del-goal="'+g.id+'">Excluir</button></div>'}).join(""):'<p class="muted">Nenhuma meta cadastrada.</p>';
 document.querySelectorAll("[data-del-goal]").forEach(b=>b.onclick=async()=>{if(!confirm("Excluir esta meta?"))return;await sb.from("sales_goals").delete().eq("id",b.dataset.delGoal);loadGoals()})
}
document.getElementById("goalForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));setStatus("goalStatus","Salvando...");const {error}=await sb.from("sales_goals").insert({salesperson_id:d.salesperson_id,representada_id:d.representada_id||null,period_start:d.period_start,period_end:d.period_end,target_value:Number(d.target_value||0),target_orders:Number(d.target_orders||0),notes:d.notes||null});if(error)return setStatus("goalStatus",error.message,"err");e.currentTarget.reset();setStatus("goalStatus","Meta cadastrada.","ok");loadGoals()};

async function loadRules(){
 const {data,error}=await sb.from("commission_rules").select("*,salespeople(name),representadas(name)").order("created_at",{ascending:false}).limit(100);const box=document.getElementById("ruleRows");if(error){box.innerHTML='<p class="status err">'+esc(error.message)+'</p>';return}
 const rows=data||[];box.innerHTML=rows.length?rows.map(r=>'<div class="row"><div><strong>'+esc(r.representadas?.name||"")+'</strong><br><small>'+esc(r.salespeople?.name||"Todos os vendedores")+' · '+esc([r.valid_from,r.valid_until].filter(Boolean).join(" → ")||"sem vigência definida")+'</small></div><div><strong>'+Number(r.rate).toLocaleString("pt-BR")+"%</strong></div><div><span class="badge '+(r.active?"ok":"warn")+'">'+(r.active?"Ativa":"Inativa")+'</span></div><button class="btn btn-small btn-outline" data-toggle-rule="'+r.id+'">'+(r.active?"Desativar":"Ativar")+'</button></div>').join(""):'<p class="muted">Nenhuma regra cadastrada.</p>';
 document.querySelectorAll("[data-toggle-rule]").forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.toggleRule);await sb.from("commission_rules").update({active:!r.active,updated_at:new Date().toISOString()}).eq("id",r.id);loadRules()})
}
document.getElementById("ruleForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));setStatus("ruleStatus","Salvando...");const {error}=await sb.from("commission_rules").insert({representada_id:d.representada_id,salesperson_id:d.salesperson_id||null,rate:Number(d.rate),valid_from:d.valid_from||null,valid_until:d.valid_until||null,notes:d.notes||null,active:true});if(error)return setStatus("ruleStatus",error.message,"err");e.currentTarget.reset();setStatus("ruleStatus","Regra cadastrada. Novos pedidos válidos passam a calcular a previsão automaticamente.","ok");loadRules()};

async function loadCommissions(){
 let req=sb.from("commissions").select("*,salespeople(name),representadas(name),orders(order_number,status,total,created_at)").order("created_at",{ascending:false}).limit(200);const st=document.getElementById("commissionStatus").value;if(st)req=req.eq("status",st);const {data,error}=await req;const box=document.getElementById("commissionRows");if(error){box.innerHTML='<p class="status err">'+esc(error.message)+'</p>';return}
 const rows=data||[];box.innerHTML=rows.length?rows.map(c=>'<div class="row"><div><strong>Pedido #'+esc(c.orders?.order_number||"")+' · '+esc(c.representadas?.name||"")+'</strong><br><small>'+esc(c.salespeople?.name||"Sem vendedor")+' · base '+money(c.base_amount)+' · '+Number(c.rate).toLocaleString("pt-BR")+'%</small></div><div><small>Prevista</small><br><strong>'+money(c.expected_amount)+'</strong></div><div><span class="badge '+(c.status==="paga"?"ok":"")+'">'+esc(c.status)+'</span></div><div class="action-row">'+(c.status==="prevista"?'<button class="btn btn-small" data-approve-commission="'+c.id+'">Aprovar</button>':'')+(c.status==="aprovada"?'<button class="btn btn-small" data-pay-commission="'+c.id+'">Marcar paga</button>':'')+'</div></div>').join(""):'<p class="muted">Ainda não há comissões geradas. Elas aparecerão quando existirem pedidos válidos e regras aplicáveis.</p>';
 document.querySelectorAll("[data-approve-commission]").forEach(b=>b.onclick=async()=>{const c=rows.find(x=>x.id===b.dataset.approveCommission);await sb.from("commissions").update({status:"aprovada",approved_amount:c.expected_amount,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",c.id);await loadCommissions();await loadKpis()});
 document.querySelectorAll("[data-pay-commission]").forEach(b=>b.onclick=async()=>{const c=rows.find(x=>x.id===b.dataset.payCommission);await sb.from("commissions").update({status:"paga",paid_amount:c.approved_amount??c.expected_amount,paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",c.id);await loadCommissions();await loadKpis()})
}
document.getElementById("commissionStatus").onchange=loadCommissions;

async function loadPerformance(){
 const month=document.getElementById("perfMonth").value+"-01";const {data,error}=await sb.from("sales_performance_monthly").select("*").eq("month_start",month).order("sales_total",{ascending:false});const box=document.getElementById("performanceRows");if(error){box.innerHTML='<p class="status err">'+esc(error.message)+'</p>';return}
 performance=data||[];if(!performance.length){box.innerHTML=sellers.map(s=>'<div class="perf"><div><strong>'+esc(s.name)+'</strong><small>Sem pedidos computados neste período</small></div><div><small>Vendas</small><strong>R$ 0,00</strong></div><div><small>Pedidos</small><strong>0</strong></div><div><small>Ticket médio</small><strong>R$ 0,00</strong></div><div><small>Comissão prevista</small><strong>R$ 0,00</strong></div></div>').join("");return}
 box.innerHTML=performance.map(p=>'<div class="perf"><div><strong>'+esc(p.salesperson_name)+'</strong><small>'+new Date(p.month_start+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</small></div><div><small>Vendas</small><strong>'+money(p.sales_total)+'</strong></div><div><small>Pedidos</small><strong>'+p.orders_count+'</strong></div><div><small>Ticket médio</small><strong>'+money(p.average_ticket)+'</strong></div><div><small>Comissão prevista</small><strong>'+money(p.expected_commission)+'</strong></div></div>').join("")
}
document.getElementById("perfMonth").onchange=loadPerformance;
boot().catch(e=>{document.body.insertAdjacentHTML("afterbegin",'<div style="padding:12px;background:#5d1f1f;color:#fff">Erro ao carregar Gestão Comercial: '+esc(e.message)+'</div>')});