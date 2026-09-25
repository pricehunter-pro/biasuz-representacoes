window.BiasuzAuth=(function(){
 const cfg=window.BIASUZ_CONFIG||{};
 const CANONICAL_SITE="https://bia.dunihub.online";
 function setStatus(el,msg,kind=""){if(!el)return;el.className="form-status "+kind;el.textContent=msg}
 function redirectUrl(path){const base=(cfg.siteUrl&&cfg.siteUrl.startsWith("https://")?cfg.siteUrl:CANONICAL_SITE).replace(/\/$/,"");return base+(path.startsWith("/")?path:"/"+path)}
 function friendlyError(message){
  const m=String(message||"");
  if(/invalid login credentials/i.test(m))return "E-mail ou senha não conferem. Use “Esqueci minha senha” para criar uma nova senha.";
  if(/email not confirmed/i.test(m))return "Seu e-mail ainda precisa ser confirmado.";
  if(/expired|otp_expired/i.test(m))return "Este link expirou. Solicite uma nova recuperação de senha.";
  return m||"Não foi possível concluir a autenticação.";
 }
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
  const googleReady=!!ext.google;
  const googleBtn=document.getElementById("googleLogin");
  if(googleBtn){
   googleBtn.classList.toggle("auth-provider-ready",googleReady);
   googleBtn.classList.toggle("auth-provider-pending",!googleReady);
   const badge=googleBtn.querySelector(".auth-state");
   if(badge)badge.textContent=googleReady?"ativo":"configurar";
   googleBtn.addEventListener("click",async()=>{
    if(!googleReady)return setStatus(st,"O botão Google está pronto no site. Falta salvar/ativar as credenciais do provedor Google no Supabase Auth.","");
    setStatus(st,"Abrindo autenticação do Google...");
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectUrl(target)}});
    if(error)setStatus(st,friendlyError(error.message),"err");
   });
  }

  document.getElementById("forgotPassword")?.addEventListener("click",async e=>{
   e.preventDefault();
   const email=login?.querySelector('[name="email"]')?.value?.trim();
   if(!email)return setStatus(st,"Digite seu e-mail acima para recuperar a senha.","err");
   setStatus(st,"Enviando recuperação...");
   const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl("/reset-password.html")});
   if(error)return setStatus(st,friendlyError(error.message),"err");
   setStatus(st,"E-mail de recuperação enviado. Verifique também o spam.","ok");
  });

  document.getElementById("toggleSignup")?.addEventListener("click",e=>{
   e.preventDefault();document.getElementById("signupPanel")?.classList.toggle("hidden");
  });
  document.getElementById("createAccount")?.addEventListener("click",async()=>{
   const name=document.getElementById("signupName")?.value?.trim();
   const email=document.getElementById("signupEmail")?.value?.trim();
   const password=document.getElementById("signupPassword")?.value||"";
   if(!email||password.length<8)return setStatus(st,"Informe um e-mail válido e uma senha com pelo menos 8 caracteres.","err");
   setStatus(st,"Criando seu acesso...");
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:name||email.split("@")[0]},emailRedirectTo:redirectUrl(target)}});
   if(error)return setStatus(st,error.message,"err");
   if(data?.session){setStatus(st,"Conta criada. Entrando...","ok");setTimeout(()=>location.href=redirectUrl(target),500)}
   else setStatus(st,"Conta criada. Confira seu e-mail para confirmar o acesso. Se seu e-mail já estiver na carteira Biasuz, o perfil será vinculado automaticamente.","ok");
  });

  document.getElementById("requestAccess")?.addEventListener("click",e=>{
   e.preventDefault();
   const email=login?.querySelector('[name="email"]')?.value?.trim()||"";
   const msg="Olá, preciso de ajuda para acessar "+(role==="admin"?"o Painel Administrativo":"o portal da Biasuz")+(email?" com o e-mail "+email:"")+".";
   window.open("https://wa.me/"+String(cfg.whatsappNumber||"5575992268989").replace(/\D/g,"")+"?text="+encodeURIComponent(msg),"_blank");
  });

  return {settings:s,providers:{google:googleReady,email:true,password:true}};
 }
 return {init,settings};
})();