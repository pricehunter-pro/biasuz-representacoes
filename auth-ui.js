window.BiasuzAuth=(function(){
 const cfg=window.BIASUZ_CONFIG||{};
 const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
 async function settings(){
  try{const r=await fetch(cfg.supabaseUrl+"/auth/v1/settings",{headers:{apikey:cfg.supabasePublishableKey}});return r.ok?await r.json():null}catch{return null}
 }
 function setStatus(el,msg,kind=""){if(!el)return;el.className="form-status "+kind;el.textContent=msg}
 async function init(sb,{role="cliente",statusId="loginStatus"}={}){
  const st=document.getElementById(statusId),login=document.getElementById("loginForm");
  const s=await settings(),ext=s?.external||{};
  const providers={google:!!ext.google,discord:!!ext.discord,whatsapp:!!ext.phone,telegram:!!cfg.telegramBotUsername};
  document.querySelectorAll("[data-auth-provider]").forEach(btn=>{
   const p=btn.dataset.authProvider,ready=providers[p];
   btn.classList.toggle("auth-disabled",!ready);btn.setAttribute("aria-disabled",String(!ready));
   const badge=btn.querySelector(".auth-state");if(badge)badge.textContent=ready?"ativo":"configurar";
  });
  document.getElementById("googleLogin")?.addEventListener("click",async()=>{
   if(!providers.google)return setStatus(st,"Google Login já está preparado no site; falta habilitar as credenciais OAuth no Supabase.","");
   const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:(cfg.siteUrl||location.origin)+"/portal.html?role="+encodeURIComponent(role)}});
   if(error)setStatus(st,error.message,"err");
  });
  document.getElementById("discordLogin")?.addEventListener("click",async()=>{
   if(!providers.discord)return setStatus(st,"Discord Login já está preparado; falta habilitar o aplicativo OAuth no Supabase.","");
   const {error}=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:(cfg.siteUrl||location.origin)+"/portal.html?role="+encodeURIComponent(role)}});
   if(error)setStatus(st,error.message,"err");
  });
  document.getElementById("telegramLogin")?.addEventListener("click",()=>{
   if(!providers.telegram)return setStatus(st,"Telegram Login está preparado para o Bot da Biasuz; falta vincular o bot/segredo do Telegram.","");
   location.href=(cfg.siteUrl||location.origin)+"/telegram-auth.html?role="+encodeURIComponent(role);
  });
  document.getElementById("whatsappLogin")?.addEventListener("click",()=>{
   if(!providers.whatsapp)return setStatus(st,"Login por WhatsApp OTP está preparado; falta habilitar Phone Auth com Twilio/Twilio Verify no Supabase.","");
   document.getElementById("phoneAuthPanel")?.classList.toggle("hidden");
  });
  document.getElementById("magicLogin")?.addEventListener("click",async()=>{
   const email=login?.querySelector('[name="email"]')?.value?.trim();if(!email)return setStatus(st,"Informe seu e-mail para receber o link mágico.","err");
   setStatus(st,"Enviando link de acesso...");
   const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:(cfg.siteUrl||location.origin)+"/portal.html?role="+encodeURIComponent(role)}});
   if(error)return setStatus(st,error.message,"err");setStatus(st,"Link enviado. Confira seu e-mail e entre sem senha.","ok");
  });
  document.getElementById("forgotPassword")?.addEventListener("click",async e=>{
   e.preventDefault();const email=login?.querySelector('[name="email"]')?.value?.trim();if(!email)return setStatus(st,"Digite seu e-mail acima para recuperar a senha.","err");
   setStatus(st,"Enviando recuperação...");
   const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:(cfg.siteUrl||location.origin)+"/reset-password.html"});
   if(error)return setStatus(st,error.message,"err");setStatus(st,"E-mail de recuperação enviado.","ok");
  });
  document.getElementById("sendWhatsappOtp")?.addEventListener("click",async()=>{
   const phone=document.getElementById("whatsappPhone")?.value?.replace(/\D/g,"");if(!phone)return setStatus(st,"Informe o número com DDD.","err");
   const normalized=phone.startsWith("55")?("+"+phone):("+55"+phone);setStatus(st,"Enviando código pelo WhatsApp...");
   const {error}=await sb.auth.signInWithOtp({phone:normalized,options:{channel:"whatsapp",shouldCreateUser:false}});
   if(error)return setStatus(st,error.message,"err");document.getElementById("otpRow")?.classList.remove("hidden");setStatus(st,"Código enviado pelo WhatsApp.","ok");
  });
  document.getElementById("verifyWhatsappOtp")?.addEventListener("click",async()=>{
   const phone=document.getElementById("whatsappPhone")?.value?.replace(/\D/g,""),token=document.getElementById("whatsappOtp")?.value?.trim();if(!phone||!token)return;
   const normalized=phone.startsWith("55")?"+"+phone:"+55"+phone;const {error}=await sb.auth.verifyOtp({phone:normalized,token,type:"sms"});
   if(error)return setStatus(st,error.message,"err");location.reload();
  });
  return {settings:s,providers};
 }
 return {init,settings};
})();