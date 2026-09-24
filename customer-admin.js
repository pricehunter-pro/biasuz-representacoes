const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),id=new URLSearchParams(location.search).get("id");
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>"R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
let customer=null,sellers=[],regions=[],currentWaDraftId=null;
function status(id,msg,kind=""){const e=document.getElementById(id);e.className="status "+kind;e.textContent=msg}
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
async function boot(){if(!id||!await auth())return;await Promise.all([loadBase(),loadInteractions(),loadOrders(),loadWhatsAppOutbox()])}
async function loadBase(){
 const [c,s,r]=await Promise.all([sb.from("customers").select("*").eq("id",id).single(),sb.from("salespeople").select("*").eq("active",true).order("name"),sb.from("sales_regions").select("*").eq("active",true).order("code")]);
 if(c.error)throw c.error;customer=c.data;sellers=s.data||[];regions=r.data||[];
 document.getElementById("title").textContent=customer.trade_name||customer.legal_name;document.getElementById("subtitle").textContent=customer.legal_name+" · "+(customer.city||"")+" / "+(customer.state||"");
 document.getElementById("customerInfo").innerHTML=[
  ["CNPJ",customer.cnpj],["Segmento",customer.segment],["Situação",customer.registration_status||"—"],["Telefone",customer.phone1||"—"],["E-mail",customer.email||"—"],["Endereço",[customer.street,customer.number,customer.district,customer.city,customer.state].filter(Boolean).join(", ")]
 ].map(x=>'<div class="box"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("");
 const f=document.getElementById("customerForm");f.elements.lifecycle_stage.value=customer.lifecycle_stage||"prospect";f.elements.notes.value=customer.notes||"";if(customer.next_action_at)f.elements.next_action_at.value=new Date(customer.next_action_at).toISOString().slice(0,16);
 document.getElementById("salespersonSelect").innerHTML='<option value="">Sem vendedor</option>'+sellers.map(x=>'<option value="'+x.id+'" '+(x.id===customer.salesperson_id?"selected":"")+'>'+esc(x.name)+'</option>').join("");
 document.getElementById("regionSelect").innerHTML='<option value="">Sem região</option>'+regions.map(x=>'<option value="'+x.id+'" '+(x.id===customer.sales_region_id?"selected":"")+'>'+esc(x.code+" · "+x.name)+'</option>').join("");
 const digits=String(customer.phone1||"").replace(/\D/g,"");document.getElementById("waAction").href=digits?("https://wa.me/"+(digits.startsWith("55")?digits:"55"+digits)+"?text="+encodeURIComponent("Olá, aqui é a Biasuz Representações.")):"#";
 document.getElementById("emailAction").href=customer.email?"mailto:"+encodeURIComponent(customer.email):"#";
 const draft=document.getElementById("waDraft");if(draft&&!draft.value)draft.value="Olá, "+(customer.trade_name||customer.legal_name)+". Aqui é a Biasuz Representações. Estou entrando em contato para dar continuidade ao nosso atendimento comercial.";
 const consent=document.getElementById("waConsentNote");if(consent)consent.innerHTML=customer.whatsapp_opt_out_at?"<strong>Bloqueado:</strong> este cliente registrou opt-out de WhatsApp.":customer.whatsapp_marketing_allowed?"<strong>Contato liberado:</strong> consentimento de marketing registrado.":"<strong>Atenção:</strong> não há consentimento de marketing registrado. Use o envio apenas para atendimento individual já solicitado/relacionado.";
}

const waTemplates={
 intro:()=>`Olá, ${customer?.trade_name||customer?.legal_name||"tudo bem"}! Aqui é a Biasuz Representações. Quero apresentar nosso portfólio e entender quais marcas fazem mais sentido para sua loja.`,
 catalog:()=>`Olá, ${customer?.trade_name||customer?.legal_name||"tudo bem"}! Separei materiais e catálogos das representadas da Biasuz que podem ser interessantes para sua operação. Posso te encaminhar as opções?`,
 followup:()=>`Olá, ${customer?.trade_name||customer?.legal_name||"tudo bem"}! Passando para dar continuidade ao nosso atendimento. Ficou alguma dúvida sobre produtos, condições comerciais ou próximos pedidos?`
};
document.querySelectorAll("[data-wa-template]").forEach(b=>b.onclick=()=>{const fn=waTemplates[b.dataset.waTemplate];if(fn)document.getElementById("waDraft").value=fn()});
async function loadWhatsAppOutbox(){
 const {data,error}=await sb.from("whatsapp_outbox").select("*").eq("customer_id",id).order("created_at",{ascending:false}).limit(20),box=document.getElementById("waOutboxRows");if(!box)return;
 box.innerHTML=error?'<p class="status err">'+esc(error.message)+'</p>':(data||[]).length?(data||[]).map(x=>'<div class="item"><strong>'+esc(x.status)+' · '+new Date(x.created_at).toLocaleString("pt-BR")+'</strong><p>'+esc(x.message)+'</p>'+(x.error_message?'<small>'+esc(x.error_message)+'</small>':'')+'</div>').join(""):'<p class="muted">Nenhuma mensagem assistida preparada ainda.</p>';
}
document.getElementById("saveWaDraft")?.addEventListener("click",async()=>{
 const msg=document.getElementById("waDraft").value.trim(),st=document.getElementById("waAssistStatus"),recipient=String(customer?.phone1||customer?.phone2||"").replace(/\D/g,"");
 if(!msg)return status("waAssistStatus","Escreva a mensagem antes de salvar.","err");if(!recipient)return status("waAssistStatus","Cliente sem telefone cadastrado.","err");if(customer?.whatsapp_opt_out_at)return status("waAssistStatus","Envio bloqueado: cliente com opt-out de WhatsApp.","err");
 status("waAssistStatus","Salvando rascunho...");
 const {data:{user}}=await sb.auth.getUser();
 const {data,error}=await sb.from("whatsapp_outbox").insert({customer_id:id,created_by:user.id,recipient,message:msg,status:"draft",consent_snapshot:!!customer.whatsapp_marketing_allowed}).select("id").single();
 if(error)return status("waAssistStatus",error.message,"err");currentWaDraftId=data.id;document.getElementById("sendWaEvolution").disabled=false;status("waAssistStatus","Rascunho salvo. Revise a mensagem e clique em “Aprovar e enviar”.","ok");await loadWhatsAppOutbox();
});
document.getElementById("sendWaEvolution")?.addEventListener("click",async()=>{
 if(!currentWaDraftId)return status("waAssistStatus","Salve um rascunho primeiro.","err");
 status("waAssistStatus","Enviando pela Evolution API...");
 const {data,error}=await sb.functions.invoke("evolution-send",{body:{outbox_id:currentWaDraftId}});
 if(error||data?.error){const code=data?.error||error?.message||"Falha no envio";if(code==="evolution_not_configured")return status("waAssistStatus","A integração está pronta, mas faltam URL, chave e instância da Evolution API nos segredos do Supabase.","err");return status("waAssistStatus",String(code),"err")}
 status("waAssistStatus","Mensagem enviada com sucesso pela Evolution API.","ok");currentWaDraftId=null;document.getElementById("sendWaEvolution").disabled=true;await Promise.all([loadWhatsAppOutbox(),loadInteractions()]);
});

document.getElementById("customerForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));status("customerStatus","Salvando...");const row={lifecycle_stage:d.lifecycle_stage,salesperson_id:d.salesperson_id||null,sales_region_id:d.sales_region_id||null,next_action_at:d.next_action_at?new Date(d.next_action_at).toISOString():null,notes:d.notes||null,commercial_owner:sellers.find(x=>x.id===d.salesperson_id)?.name||customer.commercial_owner,updated_at:new Date().toISOString()};const {error}=await sb.from("customers").update(row).eq("id",id);if(error)return status("customerStatus",error.message,"err");status("customerStatus","Cadastro atualizado.","ok");await loadBase()};
async function loadInteractions(){const {data,error}=await sb.from("interactions").select("*").eq("customer_id",id).order("created_at",{ascending:false}).limit(100);const box=document.getElementById("interactionRows");box.innerHTML=error?'<p class="status err">'+esc(error.message)+'</p>':(data||[]).length?(data||[]).map(x=>'<div class="item"><strong>'+esc(x.channel)+' · '+(x.direction==="inbound"?"Cliente → Biasuz":"Biasuz → Cliente")+'</strong><small> · '+new Date(x.created_at).toLocaleString("pt-BR")+'</small><p>'+esc(x.summary)+'</p></div>').join(""):'<p class="muted">Nenhuma interação registrada.</p>'}
document.getElementById("interactionForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget)),{data:{user}}=await sb.auth.getUser();status("interactionStatus","Registrando...");const {error}=await sb.from("interactions").insert({customer_id:id,channel:d.channel,direction:d.direction,summary:d.summary,created_by:user.id});if(error)return status("interactionStatus",error.message,"err");await sb.from("customers").update({last_contact_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);e.currentTarget.reset();status("interactionStatus","Interação registrada.","ok");loadInteractions()};
async function loadOrders(){const {data,error}=await sb.from("orders").select("order_number,status,total,created_at,representadas(name)").eq("customer_id",id).order("created_at",{ascending:false}).limit(100);const box=document.getElementById("orderRows");box.innerHTML=error?'<p class="status err">'+esc(error.message)+'</p>':(data||[]).length?(data||[]).map(o=>'<div class="item"><strong>Pedido #'+esc(o.order_number)+' · '+esc(o.representadas?.name||"")+'</strong><small> · '+new Date(o.created_at).toLocaleDateString("pt-BR")+'</small><p>'+esc(o.status)+' · '+money(o.total)+'</p></div>').join(""):'<p class="muted">Nenhum pedido deste cliente.</p>'}
boot().catch(e=>{document.body.insertAdjacentHTML("afterbegin",'<div style="background:#602020;color:#fff;padding:12px">Erro: '+esc(e.message)+'</div>')});