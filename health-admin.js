const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let state={};
const row=(title,value,status="ok",note="")=>'<div class="row"><div><strong>'+esc(title)+'</strong>'+(note?'<br><small>'+esc(note)+'</small>':'')+'</div><div><strong>'+esc(value)+'</strong></div><span class="pill '+status+'">'+(status==="ok"?"OK":status==="warn"?"ATENÇÃO":"PENDENTE")+'</span></div>';
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
async function count(table,mutator){let q=sb.from(table).select("*",{count:"exact",head:true});if(mutator)q=mutator(q);const r=await q;return {count:r.count||0,error:r.error}}
async function load(){
 if(!await auth())return;
 document.getElementById("metrics").innerHTML='<div class="panel">Carregando diagnóstico...</div>';
 const [brands,products,catalogs,customers,orders,leads,missingLogo,missingImage,activePrices,reviewCats,internalCats,optin,sellers,profiles,goals,rules,campaigns] = await Promise.all([
  count("representadas",q=>q.eq("active",true)),
  count("products",q=>q.eq("active",true)),
  count("catalogs"),
  count("customers"),
  count("orders"),
  count("leads"),
  count("representadas",q=>q.eq("active",true).is("logo_url",null)),
  count("products",q=>q.eq("active",true).is("image_url",null)),
  count("product_prices",q=>q.eq("active",true)),
  count("catalogs",q=>q.in("status",["uploaded","review","processing"])),
  count("catalogs",q=>q.eq("visibility","internal")),
  count("customers",q=>q.eq("whatsapp_marketing_allowed",true).is("whatsapp_opt_out_at",null)),
  count("salespeople",q=>q.eq("active",true)),
  count("portal_profiles",q=>q.eq("role","representante").eq("active",true)),
  count("sales_goals"),
  count("commission_rules",q=>q.eq("active",true)),
  count("campaigns")
 ]);
 let settings=null;try{const r=await fetch(cfg.supabaseUrl+"/auth/v1/settings",{headers:{apikey:cfg.supabasePublishableKey}});if(r.ok)settings=await r.json()}catch{}
 let evolution={configured:false,probe_ok:false};try{const r=await sb.functions.invoke("integration-health",{body:{}});if(!r.error&&r.data?.evolution)evolution=r.data.evolution}catch{}
 const [{data:unlinked},{data:brandAssets}]=await Promise.all([
  sb.from("salespeople").select("id,name,user_id").eq("active",true).is("user_id",null),
  sb.from("representadas").select("name,slug,logo_url,banner_image_url").eq("active",true).order("name")
 ]);
 const normalizedAssets=(brandAssets||[]),accurateMissingLogo=normalizedAssets.filter(x=>!x.logo_url||x.logo_url.includes("google.com/s2/favicons")).length,missingBanner=normalizedAssets.filter(x=>!x.banner_image_url).length;
 state={brands:brands.count,products:products.count,catalogs:catalogs.count,customers:customers.count,orders:orders.count,leads:leads.count,missingLogo:accurateMissingLogo,missingBanner,missingImage:missingImage.count,activePrices:activePrices.count,reviewCats:reviewCats.count,internalCats:internalCats.count,optin:optin.count,sellers:sellers.count,repProfiles:profiles.count,unlinked:(unlinked||[]).length,goals:goals.count,rules:rules.count,campaigns:campaigns.count,settings,evolution,brandAssets:normalizedAssets};
 render();
}
function metric(label,value,note){return '<div class="panel metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>'}
function render(){
 document.getElementById("metrics").innerHTML=[
  metric("Clientes / prospects",state.customers.toLocaleString("pt-BR"),"carteira CRM"),
  metric("Produtos ativos",state.products.toLocaleString("pt-BR"),"catálogo mestre"),
  metric("Catálogos",state.catalogs.toLocaleString("pt-BR"),state.reviewCats+" em processamento/revisão"),
  metric("Pedidos",state.orders.toLocaleString("pt-BR"),"transações registradas")
 ].join("");
 document.getElementById("dataRows").innerHTML=
  row("Representadas ativas",state.brands,"ok")+
  row("Logomarcas faltantes",state.missingLogo,state.missingLogo?"warn":"ok","Priorizar arquivos oficiais limpos")+
  row("Produtos sem imagem",state.missingImage,state.missingImage?"warn":"ok","Podem vir de catálogo/site oficial")+
  row("Preços B2B ativos",state.activePrices,state.activePrices?"ok":"warn","Preço de origem não é preço B2B");
 const ext=state.settings?.external||{},phone=!!(state.settings?.phone||state.settings?.sms_provider);
 document.getElementById("authRows").innerHTML=
  row("E-mail / senha",state.settings?.email!==false?"Ativo":"Verificar",state.settings?.email!==false?"ok":"warn")+
  row("Google OAuth",ext.google?"Ativo":"Credenciais pendentes",ext.google?"ok":"warn")+
  row("Discord OAuth",ext.discord?"Ativo":"Credenciais pendentes",ext.discord?"ok":"warn")+
  row("Telegram OIDC",cfg.telegramOidcEnabled?"Ativo":"Client ID/Secret pendentes",cfg.telegramOidcEnabled?"ok":"warn")+
  row("WhatsApp / Phone OTP",phone?"Ativo":"Twilio/Twilio Verify pendente",phone?"ok":"warn")+
  row("Evolution API assistida",state.evolution?.configured?(state.evolution?.probe_ok?("Conectada"+(state.evolution?.connection_state?" · "+state.evolution.connection_state:"")):"Configurada, revisar instância"):"Secrets pendentes",state.evolution?.configured&&state.evolution?.probe_ok?"ok":"warn",state.evolution?.configured?(state.evolution?.probe_ok?"Teste de status da Evolution respondeu com sucesso.":"Os Secrets existem, mas o teste de status não respondeu com sucesso."):"Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE nos Edge Function Secrets")+
  row("Representantes com portal",state.repProfiles,state.repProfiles?"ok":"warn")+
  row("Vendedores sem usuário vinculado",state.unlinked,state.unlinked?"warn":"ok");
 document.getElementById("catalogRows").innerHTML=
  row("Catálogos armazenados",state.catalogs,"ok")+
  row("Em revisão/processamento",state.reviewCats,state.reviewCats?"warn":"ok")+
  row("Internos/confidenciais",state.internalCats,"ok","Não devem aparecer para cliente")+
  row("Deduplicação SHA-256","Ativa","ok");
 document.getElementById("salesRows").innerHTML=
  row("Vendedores ativos",state.sellers,state.sellers?"ok":"warn")+
  row("Metas cadastradas",state.goals,state.goals?"ok":"warn")+
  row("Regras de comissão",state.rules,state.rules?"ok":"warn")+
  row("Campanhas",state.campaigns,state.campaigns?"ok":"warn")+
  row("Opt-ins WhatsApp",state.optin,state.optin?"ok":"warn","Disparo automático exige consentimento");
 const assets=(state.brandAssets||[]).filter(x=>!x.logo_url||x.logo_url.includes("google.com/s2/favicons")||!x.banner_image_url);
 document.getElementById("assetRows").innerHTML=assets.length?assets.map(x=>{
   const needs=[];if(!x.logo_url||x.logo_url.includes("google.com/s2/favicons"))needs.push("logomarca");if(!x.banner_image_url)needs.push("banner horizontal");
   return row(x.name,needs.join(" + "),"warn","Enviar preferencialmente PNG/WebP com boa resolução; banner ideal 1600×600 ou maior.");
 }).join(""):row("Identidade visual","Completa","ok","Todas as representadas possuem logo e banner cadastrados.");

 const priorities=[];
 if(state.missingLogo)priorities.push(["Inserir logomarcas oficiais",state.missingLogo+" representadas sem logo","warn"]);
 if(state.missingImage)priorities.push(["Enriquecer imagens de produtos",state.missingImage+" produtos sem imagem","warn"]);
 if(state.reviewCats)priorities.push(["Concluir revisão de catálogos",state.reviewCats+" catálogos pendentes","warn"]);
 if(!ext.google)priorities.push(["Ativar Google OAuth","Cadastrar Client ID/Secret no Supabase","warn"]);
 if(!cfg.telegramOidcEnabled)priorities.push(["Ativar Telegram OIDC","Criar Login OIDC no BotFather e cadastrar como custom:telegram","warn"]);
 if(!state.evolution?.configured)priorities.push(["Concluir Evolution API","Cadastrar EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE nos Secrets","warn"]);
 else if(!state.evolution?.probe_ok)priorities.push(["Revisar conexão Evolution API","Secrets encontrados, mas a instância não respondeu ao teste de status","warn"]);
 if(state.unlinked)priorities.push(["Vincular vendedor ao portal",state.unlinked+" vendedor(es) sem usuário representante","warn"]);
 if(!state.optin)priorities.push(["Coletar consentimento WhatsApp comercial","Necessário apenas para campanhas; não é método de login","warn"]);
 if(!state.rules)priorities.push(["Cadastrar regras de comissão","Necessário antes de gerar comissão prevista","warn"]);
 if(!state.goals)priorities.push(["Cadastrar metas","Performance já está pronta para medir o realizado","warn"]);
 if(!priorities.length)priorities.push(["Operação essencial","Sem pendências automáticas detectadas","ok"]);
 document.getElementById("priorityRows").innerHTML=priorities.map(x=>row(...x)).join("");
}
document.getElementById("reload").onclick=load;load().catch(e=>{document.getElementById("metrics").innerHTML='<div class="panel"><span class="pill err">ERRO</span><p>'+esc(e.message)+'</p></div>'});