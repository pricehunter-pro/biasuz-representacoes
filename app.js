const segments=["Pet","Bazar","Jardinagem","Farma","Tech","Matco"];
const fallbackBrands=[
{name:"Ferplast",slug:"ferplast",url:"https://int.ferplast.com/pt-br",segments:["Pet"]},
{name:"Jambo Pet",slug:"jambo-pet",url:"https://www.jambopet.com.br/",segments:["Pet"]},
{name:"Família de Estimação",slug:"familia-de-estimacao",url:"https://www.familiadeestimacao.com.br/",segments:["Pet"]},
{name:"TOH",slug:"toh",url:"https://toh.com.br/",segments:["Pet"]},
{name:"German Hart",slug:"german-hart",url:"https://www.brasgroup.com.br/germanhart",segments:["Pet"]},
{name:"Natty Chews",slug:"natty-chews",url:"https://nattychews.com/",segments:["Pet"]},
{name:"Maccabi",slug:"maccabi",url:"https://maccabiart.com/",segments:["Pet","Bazar"]},
{name:"Farex",slug:"farex",url:"https://www.farex.net/",segments:["Bazar","Matco"]},
{name:"TOQ",slug:"toq",url:"https://www.toq.ind.br/",segments:["Bazar","Matco"]},
{name:"EVO",slug:"evo",url:"https://www.evooficial.com.br/",segments:["Bazar","Jardinagem"]},
{name:"RAW RAW",slug:"raw-raw",url:"https://www.rawraw.com.br/",segments:["Pet"]},
{name:"PAPAPETS",slug:"papapets",url:"https://papapets.com.br/",segments:["Pet"]},
{name:"Dentalight",slug:"dentalight",url:"https://www.dentalight.com.br/",segments:["Pet"]},
{name:"Just",slug:"just",url:"https://justpetiscos.com.br/",segments:["Pet"]},
{name:"COLLAR PET",slug:"collar-pet",url:"https://www.instagram.com/collarpetoficial/",segments:["Pet"]},
{name:"Fortezza",slug:"fortezza",url:"https://fortezza.com.br/",segments:["Bazar","Matco"]},
{name:"WB",slug:"wb",url:"https://www.wb.com.br/",segments:["Bazar","Tech"]},
{name:"Geonav",slug:"geonav",url:"https://www.geonav.com.br/",segments:["Tech"]},
{name:"Leão de Juda",slug:"leao-de-juda",url:"https://www.instagram.com/ceramicaleaodejuda/",segments:["Bazar","Jardinagem","Matco"]}
];
const descriptions={Pet:"Produtos, acessórios e soluções para o mercado pet.",Bazar:"Utilidades, presentes e itens para o varejo.",Jardinagem:"Produtos para cultivo, casa e jardim.",Farma:"Oportunidades para canais farmacêuticos e especializados.",Tech:"Tecnologia, acessórios e conectividade.",Matco:"Soluções para material de construção e canais relacionados."};
const cfg=window.BIASUZ_CONFIG||{};
const sb=(cfg.supabaseUrl&&cfg.supabasePublishableKey&&window.supabase)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
let brands=fallbackBrands;
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const logoFallback=url=>"https://www.google.com/s2/favicons?domain_url="+encodeURIComponent(url||"https://bia.dunihub.online")+"&sz=256";
function waLink(brand){const n=(cfg.whatsappNumber||"5575992268989").replace(/\D/g,"");const msg=encodeURIComponent("Olá, sou lojista e tenho interesse comercial em "+brand+" através da Biasuz Representações.");return "https://wa.me/"+n+"?text="+msg}
function renderBrands(){
 const grid=document.getElementById("brandsGrid");if(!grid)return;
 grid.innerHTML=brands.map(b=>{
   const src=b.logo||logoFallback(b.url);
   return '<a class="brand-logo-tile" href="'+esc(b.url)+'" target="_blank" rel="noopener" title="'+esc(b.name)+'" aria-label="Abrir site oficial da '+esc(b.name)+'"><img loading="lazy" src="'+esc(src)+'" alt="Logomarca '+esc(b.name)+'" onerror="this.closest(\'a\').style.display=\'none\'"></a>';
 }).join("");
 const bs=document.getElementById("brandSelect");
 if(bs)bs.innerHTML='<option value="">Todas / ainda não sei</option>'+[...brands].sort((a,b)=>a.name.localeCompare(b.name)).map(b=>'<option>'+esc(b.name)+'</option>').join("");
}
async function loadBrands(){
 if(!sb){const metric=document.getElementById("metricBrands");if(metric)metric.textContent=brands.length;renderBrands();return}
 const {data,error}=await sb.from("representadas").select("name,slug,official_url,segments,active,logo_url").eq("active",true).order("name");
 if(!error&&data?.length) brands=data.map(b=>({name:b.name,slug:b.slug,url:b.official_url,segments:b.segments||[],logo:(b.logo_url&&!b.logo_url.includes("google.com/s2/favicons"))?b.logo_url:null}));
 const metric=document.getElementById("metricBrands");if(metric)metric.textContent=brands.length;
 
 renderBrands();
}
document.getElementById("segmentCards").innerHTML=segments.map(s=>'<article class="segment-card"><strong>'+s+'</strong><p>'+descriptions[s]+'</p></article>').join("");
const ss=document.getElementById("segmentSelect");ss.innerHTML='<option value="">Selecione</option>'+segments.map(s=>'<option>'+s+'</option>').join("");
document.getElementById("leadForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,status=document.getElementById("formStatus");status.className="form-status";status.textContent="Enviando...";
 const d=Object.fromEntries(new FormData(form).entries());if(d.website){status.textContent="Solicitação recebida.";return}
 const payload={name:d.name,company:d.company,phone:d.phone,email:d.email||null,state:d.state,segment:d.segment,brand:d.brand||null,message:d.message||null,consent:true,source:"landing"};
 try{
  if(sb){const {error}=await sb.from("leads").insert(payload);if(error)throw error}
  status.className="form-status ok";status.textContent="Solicitação registrada. Abrindo WhatsApp para agilizar seu atendimento.";
  const n=(cfg.whatsappNumber||"5575992268989").replace(/\D/g,"");
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent("Olá, sou "+d.name+" da empresa "+d.company+". Tenho interesse em "+(d.brand||d.segment)+" e acabei de preencher o formulário no site da Biasuz."),"_blank");
  form.reset()
 }catch(err){status.className="form-status err";status.textContent="Não foi possível enviar agora. "+(err.message||"Tente novamente.")}
});
loadBrands();