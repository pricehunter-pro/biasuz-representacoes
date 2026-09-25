const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),campaignId=new URLSearchParams(location.search).get("campaign_id");
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let campaign=null,rows=[];
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
async function boot(){if(!campaignId||!await auth())return;await Promise.all([loadCampaign(),loadRows()]);}
async function loadCampaign(){const {data,error}=await sb.from("campaigns").select("*,representadas(name)").eq("id",campaignId).single();if(error)throw error;campaign=data;document.getElementById("title").textContent=data.name;document.getElementById("subtitle").textContent=(data.representadas?.name||data.brand||"Todas as representadas")+" · "+(data.segment||"todos os segmentos")+" · "+(data.state||"todos os estados")+" · revisão individual antes do envio."}
async function loadRows(){
 const {data,error}=await sb.from("whatsapp_outbox").select("*,customers(id,trade_name,legal_name,city,state,phone1,phone2)").eq("campaign_id",campaignId).order("created_at",{ascending:false}).limit(5000);
 if(error)throw error;rows=data||[];render();
}
function render(){
 const q=document.getElementById("search").value.trim().toLowerCase(),st=document.getElementById("statusFilter").value;
 const filtered=rows.filter(x=>{const c=x.customers||{},hay=[c.trade_name,c.legal_name,c.city,c.state,x.recipient].join(" ").toLowerCase();return(!q||hay.includes(q))&&(!st||x.status===st)});
 document.getElementById("kQueued").textContent=rows.filter(x=>x.status!=="cancelled").length.toLocaleString("pt-BR");
 document.getElementById("kDraft").textContent=rows.filter(x=>["draft","approved"].includes(x.status)).length.toLocaleString("pt-BR");
 document.getElementById("kSent").textContent=rows.filter(x=>x.status==="sent").length.toLocaleString("pt-BR");
 document.getElementById("kError").textContent=rows.filter(x=>x.status==="error").length.toLocaleString("pt-BR");
 const box=document.getElementById("rows");
 box.innerHTML=filtered.length?filtered.map(x=>{const c=x.customers||{},locked=["sending","sent","cancelled"].includes(x.status);return '<article class="queue-card" data-row="'+x.id+'"><div class="queue-customer"><span class="queue-status '+esc(x.status)+'">'+esc(x.status)+'</span><strong style="margin-top:9px">'+esc(c.trade_name||c.legal_name||"Cliente")+'</strong><small>'+esc([c.city,c.state].filter(Boolean).join(" / "))+'<br>'+esc(x.recipient)+'</small><div style="margin-top:10px"><a class="btn btn-small btn-outline" href="./customer-admin.html?id='+encodeURIComponent(x.customer_id)+'#whatsapp">Abrir cliente</a></div></div><div class="queue-message"><textarea data-message="'+x.id+'" '+(locked?"disabled":"")+'>'+esc(x.message)+'</textarea><small class="muted">'+(x.sent_at?"Enviada em "+new Date(x.sent_at).toLocaleString("pt-BR"):"Criada em "+new Date(x.created_at).toLocaleString("pt-BR"))+'</small></div><div class="queue-actions">'+(!locked?'<button class="btn btn-small btn-outline" data-save="'+x.id+'">Salvar edição</button><button class="btn btn-small" data-send="'+x.id+'">Enviar agora</button><button class="btn btn-small btn-outline" data-cancel="'+x.id+'">Cancelar</button>':'')+(x.status==="error"?'<button class="btn btn-small" data-send="'+x.id+'">Tentar novamente</button>':'')+'</div></article>'}).join(""):'<div class="queue-empty">Nenhuma mensagem encontrada para este filtro.</div>';
 bindActions();
}
function bindActions(){
 document.querySelectorAll("[data-save]").forEach(b=>b.onclick=async()=>{const id=b.dataset.save,msg=document.querySelector('[data-message="'+id+'"]').value.trim();if(!msg)return;const {error}=await sb.from("whatsapp_outbox").update({message:msg,updated_at:new Date().toISOString()}).eq("id",id);if(error)return alert(error.message);await loadRows()});
 document.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=async()=>{if(!confirm("Cancelar este rascunho?"))return;const {error}=await sb.from("whatsapp_outbox").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",b.dataset.cancel);if(error)return alert(error.message);await loadRows()});
 document.querySelectorAll("[data-send]").forEach(b=>b.onclick=async()=>{const id=b.dataset.send;if(!confirm("Enviar esta mensagem agora pela Evolution API?"))return;b.disabled=true;b.textContent="Enviando...";const {data,error}=await sb.functions.invoke("evolution-send",{body:{outbox_id:id}});if(error||data?.error){alert(data?.error||error?.message||"Falha no envio");b.disabled=false;b.textContent="Enviar agora";return}await loadRows()});
}
document.getElementById("search").oninput=render;document.getElementById("statusFilter").onchange=render;document.getElementById("reload").onclick=loadRows;
boot().catch(e=>{document.getElementById("rows").innerHTML='<div class="queue-empty">Erro: '+esc(e.message)+'</div>'});