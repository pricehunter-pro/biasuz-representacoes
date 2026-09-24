const cfg=window.BIASUZ_CONFIG||{},sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),qs=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,"")),tokenHash=qs.get("token_hash")||hash.get("token_hash"),type=qs.get("type")||hash.get("type")||"magiclink",next=qs.get("next")||"";
const st=document.getElementById("status"),title=document.getElementById("title"),help=document.getElementById("help"),actions=document.getElementById("actions");
const canonical="https://bia.dunihub.online";
function fail(msg){title.textContent="Este link não pode mais ser usado";help.textContent="Links de acesso e recuperação são temporários e de uso único.";st.className="status err";st.textContent=msg||"O link expirou ou já foi utilizado.";actions.innerHTML='<a class="btn" href="'+canonical+'/reset-password.html">Solicitar novo link</a><a class="btn btn-outline" href="'+canonical+'/admin.html">Voltar ao acesso</a>'}
async function boot(){
 const err=hash.get("error_description")||qs.get("error_description");if(err)return fail(decodeURIComponent(err.replace(/\+/g," ")));
 if(!tokenHash)return fail("Token de autenticação ausente. Solicite um novo e-mail.");
 const {data,error}=await sb.auth.verifyOtp({token_hash:tokenHash,type});if(error)return fail(error.message);
 st.className="status ok";st.textContent="Acesso validado com segurança.";
 if(type==="recovery"){title.textContent="Recuperação validada";help.textContent="Agora você pode criar uma nova senha.";setTimeout(()=>location.replace(canonical+"/reset-password.html?mode=recovery"),450);return}
 const user=data?.user||null,role=user?.app_metadata?.role;
 title.textContent="Acesso confirmado";help.textContent="Redirecionando para o painel correto.";
 const dest=next&&next.startsWith("/")?next:(role==="admin"?"/admin.html":"/portal.html");
 setTimeout(()=>location.replace(canonical+dest),450);
}
boot().catch(e=>fail(e.message));