window.BiasuzAuth=(function(){
 const cfg=window.BIASUZ_CONFIG||{};
 function setStatus(el,msg,kind=""){if(!el)return;el.className="form-status "+kind;el.textContent=msg}
 function redirectUrl(path){return (cfg.siteUrl||location.origin)+(path.startsWith("/")?path:"/"+path)}
 async function settings(){
  try{
   const r=await fetch(cfg.supabaseUrl+"/auth/v1/settings",{headers:{apikey:cfg.supabasePublishableKey}});
   return r.ok?await r.json():null
  }catch{return null}
 }
 async function init(sb,{role="cliente",statusId="loginStatus",redirectPath=null}={}){
  const st=document.getElementById(statusId),login=document.getElementById("loginForm");
  const s=await settings(),ext=s?.external||{};
  const target=redirectPath||("/portal.html?role="+encodeURIComponent(role));
  const providerReady={
   google:!!ext.google,
   discord:!!ext.discord,
   whatsapp:!!(s?.phone||ext.phone||s?.sms_provider),
   telegram:!!cfg.telegramOidcEnabled
  };
  document.querySelectorAll("[data-auth-provider]").forEach(btn=>{
   const p=btn.dataset.authProvider,ready=!!providerReady[p];
   btn.classList.toggle("auth-provider-ready",ready);
   btn.classList.toggle("auth-provider-pending",!ready);
   const badge=btn.querySelector(".auth-state");
   if(badge)badge.textContent=ready?"ativo":"configurar";
  });

  async function oauth(provider){
   setStatus(st,"Abrindo autenticação...");
   const {error}=await sb.auth.signInWithOAuth({provider,options:{redirectTo:redirectUrl(target)}});
   if(error)setStatus(st,error.message,"err")
  }
  document.getElementById("googleLogin")?.addEventListener("click",()=>providerReady.google?oauth("google"):setStatus(st,"Google está integrado no site. Falta somente cadastrar o Client ID e o Client Secret no Supabase Auth.",""));
  document.getElementById("discordLogin")?.addEventListener("click",()=>providerReady.discord?oauth("discord"):setStatus(st,"Discord está integrado no site. Falta somente cadastrar o aplicativo OAuth no Supabase Auth.",""));
  document.getElementById("telegramLogin")?.addEventListener("click",()=>providerReady.telegram?oauth(cfg.telegramProvider||"custom:telegram"):setStatus(st,"Telegram OIDC está preparado. Falta cadastrar o Client ID/Secret gerado pelo BotFather no provedor customizado do Supabase.",""));
  document.getElementById("whatsappLogin")?.addEventListener("click",()=>{
   const panel=document.getElementById("phoneAuthPanel");
   if(!providerReady.whatsapp){if(panel)panel.classList.remove("hidden");return setStatus(st,"Informe o telefone para preparar o acesso. O envio do OTP será ativado assim que o WhatsApp Phone Auth/Twilio estiver configurado no Supabase.","")}
   panel?.classList.toggle("hidden");
  });

  document.getElementById("magicLogin")?.addEventListener("click",async()=>{
   const email=login?.querySelector('[name="email"]')?.value?.trim();
   if(!email)return setStatus(st,"Informe seu e-mail para receber o link de acesso.","err");
   setStatus(st,"Enviando link de acesso...");
   const {error}=await sb.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:true,emailRedirectTo:redirectUrl(target)}
   });
   if(error)return setStatus(st,error.message,"err");
   setStatus(st,"Link enviado. Se o e-mail estiver vinculado à sua empresa, o painel será liberado automaticamente.","ok");
  });

  document.getElementById("forgotPassword")?.addEventListener("click",async e=>{
   e.preventDefault();
   const email=login?.querySelector('[name="email"]')?.value?.trim();
   if(!email)return setStatus(st,"Digite seu e-mail acima para recuperar a senha.","err");
   setStatus(st,"Enviando recuperação...");
   const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl("/reset-password.html")});
   if(error)return setStatus(st,error.message,"err");
   setStatus(st,"E-mail de recuperação enviado. Verifique também o spam.","ok");
  });

  document.getElementById("sendWhatsappOtp")?.addEventListener("click",async()=>{
   const phone=document.getElementById("whatsappPhone")?.value?.replace(/\D/g,"");
   if(!phone)return setStatus(st,"Informe o número com DDD.","err");
   if(!providerReady.whatsapp)return setStatus(st,"WhatsApp OTP ainda aguarda a credencial do provedor de telefonia no Supabase.","err");
   const normalized=phone.startsWith("55")?("+"+phone):("+55"+phone);
   setStatus(st,"Enviando código pelo WhatsApp...");
   const {error}=await sb.auth.signInWithOtp({phone:normalized,options:{channel:"whatsapp",shouldCreateUser:true}});
   if(error)return setStatus(st,error.message,"err");
   document.getElementById("otpRow")?.classList.remove("hidden");
   setStatus(st,"Código enviado pelo WhatsApp.","ok");
  });
  document.getElementById("verifyWhatsappOtp")?.addEventListener("click",async()=>{
   const phone=document.getElementById("whatsappPhone")?.value?.replace(/\D/g,""),token=document.getElementById("whatsappOtp")?.value?.trim();
   if(!phone||!token)return setStatus(st,"Informe telefone e código.","err");
   const normalized=phone.startsWith("55")?("+"+phone):("+55"+phone);
   const {error}=await sb.auth.verifyOtp({phone:normalized,token,type:"sms"});
   if(error)return setStatus(st,error.message,"err");
   location.href=redirectUrl(target);
  });

  document.getElementById("requestAccess")?.addEventListener("click",e=>{
   e.preventDefault();
   const email=login?.querySelector('[name="email"]')?.value?.trim()||"";
   const msg="Olá, quero ativar meu acesso ao "+(role==="admin"?"Painel Administrativo":"portal da Biasuz")+(email?" usando o e-mail "+email:"")+".";
   window.open("https://wa.me/"+String(cfg.whatsappNumber||"5575992268989").replace(/\D/g,"")+"?text="+encodeURIComponent(msg),"_blank");
  });

  return {settings:s,providers:providerReady};
 }
 return {init,settings};
})();