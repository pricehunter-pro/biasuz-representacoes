const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const setStatus=(id,ok,yes="Ativo",no="Pendente")=>{const el=document.getElementById(id);el.textContent=ok?yes:no;el.className="step-status "+(ok?"ok":"warn")};
async function auth(){const {data:{user}}=await sb.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){location.href="./admin.html";return false}return true}
async function count(table,fn){let q=sb.from(table).select("*",{count:"exact",head:true});if(fn)q=fn(q);const r=await q;return r.count||0}
async function load(){
 if(!await auth())return;
 let settings=null;try{const r=await fetch(cfg.supabaseUrl+"/auth/v1/settings",{headers:{apikey:cfg.supabasePublishableKey}});if(r.ok)settings=await r.json()}catch{}
 let ih={};try{const r=await sb.functions.invoke("integration-health",{body:{}});if(!r.error)ih=r.data||{}}catch{}
 const [{data:assets},unlinked,goals,rules,optins]=await Promise.all([
   sb.from("representadas").select("name,slug,logo_url,banner_image_url,official_url").eq("active",true).order("name"),
   count("salespeople",q=>q.eq("active",true).is("user_id",null)),
   count("sales_goals"),
   count("commission_rules",q=>q.eq("active",true)),
   count("customers",q=>q.eq("whatsapp_marketing_allowed",true).is("whatsapp_opt_out_at",null))
 ]);
 const ext=settings?.external||{},phone=!!(settings?.phone||settings?.sms_provider),evo=ih?.evolution||{};
 setStatus("evolutionStatus",!!(evo.configured&&evo.probe_ok),evo.connection_state?("Conectada · "+evo.connection_state):"Conectada",evo.configured?"Configurar conexão":"Secrets pendentes");
 setStatus("googleStatus",!!ext.google);
 setStatus("discordStatus",!!ext.discord);
 setStatus("telegramStatus",!!cfg.telegramOidcEnabled);
 setStatus("phoneStatus",phone);
 const rows=assets||[],missing=rows.filter(x=>!x.logo_url||x.logo_url.includes("google.com/s2/favicons")||!x.banner_image_url);
 setStatus("assetsStatus",missing.length===0,"Completo",missing.length+" marcas pendentes");
 document.getElementById("assetList").innerHTML=missing.length?missing.map(x=>{
   const need=[];if(!x.logo_url||x.logo_url.includes("google.com/s2/favicons"))need.push("logo");if(!x.banner_image_url)need.push("banner");
   return '<div class="asset-item"><strong>'+esc(x.name)+'</strong><span>Preciso de: '+esc(need.join(" + "))+'</span></div>';
 }).join(""):'<div class="asset-item"><strong>Identidade visual completa</strong><span>Nenhum arquivo pendente.</span></div>';
 const commercialOk=unlinked===0&&goals>0&&rules>0;
 setStatus("commercialStatus",commercialOk,"Operação configurada","Ajustes pendentes");
 const summary=[
  ["Evolution",evo.configured&&evo.probe_ok?"Pronta":"Pendente"],
  ["Google",ext.google?"Ativo":"Pendente"],
  ["Discord",ext.discord?"Ativo":"Pendente"],
  ["Telegram",cfg.telegramOidcEnabled?"Ativo":"Pendente"],
  ["WhatsApp OTP",phone?"Ativo":"Pendente"]
 ];
 document.getElementById("setupSummary").innerHTML=summary.map(x=>'<article class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></article>').join("");
}
document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.dataset.copy);const old=b.textContent;b.textContent="Copiado";setTimeout(()=>b.textContent=old,1200)});
document.getElementById("reload").onclick=load;load();