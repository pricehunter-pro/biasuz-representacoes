const cfg=window.BIASUZ_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const wanted=(new URLSearchParams(location.search).get("role")||"cliente").toLowerCase();
const roleNames={cliente:"Painel do Cliente",representada:"Painel da Representada",representante:"Painel do Representante",admin:"Painel do Administrador"};
document.getElementById("loginTitle").textContent=roleNames[wanted]||"Acesso ao portal";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let profile=null;

function showPortal(on){document.getElementById("loginView").classList.toggle("hidden",on);document.getElementById("portalView").classList.toggle("hidden",!on)}
async function getProfile(){
 const {data:{user}}=await sb.auth.getUser();if(!user)return null;
 const {data}=await sb.from("portal_profiles").select("*").eq("user_id",user.id).maybeSingle();
 return data;
}
async function boot(){
 const {data:{session}}=await sb.auth.getSession();if(!session){showPortal(false);return}
 profile=await getProfile();
 if(!profile){await sb.auth.signOut();document.getElementById("loginStatus").textContent="Este usuário ainda não possui perfil liberado pela Biasuz.";showPortal(false);return}
 if(wanted==="admin"&&profile.role==="admin"){location.href="./admin.html";return}
 if(profile.role!==wanted&&profile.role!=="admin"){document.getElementById("loginStatus").textContent="Seu usuário não possui acesso a este painel.";await sb.auth.signOut();showPortal(false);return}
 showPortal(true);await loadPortal();
}
document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("loginStatus");st.textContent="Entrando...";const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(error){st.textContent=error.message;st.className="form-status err";return}await boot()});
document.getElementById("logout").onclick=async()=>{await sb.auth.signOut();location.reload()};

async function loadPortal(){
 document.getElementById("portalTitle").textContent=roleNames[profile.role]||"Portal";
 document.getElementById("profileName").textContent=profile.display_name||"Usuário Biasuz";
 document.getElementById("profileRole").textContent=roleNames[profile.role]||profile.role;
 await Promise.all([loadContext(),loadOrders(),loadRequests()]);
}
async function loadContext(){
 const box=document.getElementById("contextContent"),title=document.getElementById("contextTitle");
 if(profile.role==="cliente"&&profile.customer_id){
   const {data:c}=await sb.from("customers").select("*").eq("id",profile.customer_id).maybeSingle();
   title.textContent=c?.trade_name||c?.legal_name||"Minha empresa";
   box.innerHTML=c?'<div class="policy-grid"><div class="policy-box"><span>CNPJ</span><strong>'+esc(c.cnpj)+'</strong></div><div class="policy-box"><span>Cidade</span><strong>'+esc((c.city||"")+" / "+(c.state||""))+'</strong></div><div class="policy-box"><span>Telefone</span><strong>'+esc(c.phone1||"—")+'</strong></div><div class="policy-box"><span>Status comercial</span><strong>'+esc(c.lifecycle_stage)+'</strong></div></div>':'<p class="muted">Cadastro não localizado.</p>';
 } else if(profile.role==="representada"&&profile.representada_id){
   const {data:r}=await sb.from("representadas").select("*").eq("id",profile.representada_id).maybeSingle();
   const {data:p}=await sb.from("commercial_policies").select("*").eq("representada_id",profile.representada_id).eq("active",true).order("valid_from",{ascending:false}).limit(1).maybeSingle();
   title.textContent=r?.name||"Representada";
   box.innerHTML='<div class="policy-grid"><div class="policy-box"><span>Pedido mínimo</span><strong>'+(p?.min_order_value!=null?"R$ "+Number(p.min_order_value).toLocaleString("pt-BR",{minimumFractionDigits:2}):"A cadastrar")+'</strong></div><div class="policy-box"><span>Prazo de pagamento</span><strong>'+esc(p?.payment_terms||"A cadastrar")+'</strong></div><div class="policy-box"><span>Frete</span><strong>'+esc(p?.freight_policy||"A cadastrar")+'</strong></div><div class="policy-box"><span>Previsão de entrega</span><strong>'+(p?.delivery_estimate_days?esc(p.delivery_estimate_days+" dias"):"A cadastrar")+'</strong></div></div><p class="muted">'+esc(p?.notes||"")+'</p>';
 } else if(profile.role==="representante"){
   title.textContent="Carteira e pedidos sob sua responsabilidade";
   box.innerHTML='<p class="muted">Neste painel você acompanha pedidos vinculados ao seu usuário e pode abrir demandas comerciais, financeiras ou cadastrais.</p>';
 } else {
   box.innerHTML='<p class="muted">Acesso administrativo.</p>';
 }
}
async function loadOrders(){
 const {data,error}=await sb.from("orders").select("id,order_number,status,total,created_at,representada_id").order("created_at",{ascending:false}).limit(100);
 const rows=data||[];document.getElementById("orderCount").textContent=rows.length;
 document.getElementById("ordersList").innerHTML=error?'<p class="form-status err">'+esc(error.message)+'</p>':rows.length?rows.map(o=>'<div class="list-item"><strong>Pedido #'+esc(o.order_number)+'</strong><small>'+new Date(o.created_at).toLocaleDateString("pt-BR")+'</small><div class="pill">'+esc(o.status)+'</div><p>Total: R$ '+Number(o.total||0).toLocaleString("pt-BR",{minimumFractionDigits:2})+'</p></div>').join(""):'<p class="muted">Nenhum pedido disponível para este acesso.</p>';
}
async function loadRequests(){
 const {data,error}=await sb.from("portal_requests").select("*").order("created_at",{ascending:false}).limit(100);
 const rows=data||[];document.getElementById("requestCount").textContent=rows.filter(x=>["aberta","em_analise"].includes(x.status)).length;
 document.getElementById("requestsList").innerHTML=error?'<p class="form-status err">'+esc(error.message)+'</p>':rows.length?rows.map(r=>'<div class="list-item"><strong>'+esc(r.title)+'</strong><small>'+new Date(r.created_at).toLocaleString("pt-BR")+'</small><div class="pill">'+esc(r.status)+'</div><p>'+esc(r.description)+'</p>'+(r.admin_response?'<p><strong>Resposta Biasuz:</strong> '+esc(r.admin_response)+'</p>':'')+'</div>').join(""):'<p class="muted">Nenhuma demanda aberta.</p>';
}
document.getElementById("requestForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const st=document.getElementById("requestStatus");st.textContent="Enviando...";const {data:{user}}=await sb.auth.getUser();const row={user_id:user.id,role:profile.role,customer_id:profile.customer_id||null,representada_id:profile.representada_id||null,request_type:d.request_type,title:d.title,description:d.description};const {error}=await sb.from("portal_requests").insert(row);if(error){st.className="form-status err";st.textContent=error.message;return}st.className="form-status ok";st.textContent="Demanda enviada.";e.currentTarget.reset();await loadRequests()});
boot();