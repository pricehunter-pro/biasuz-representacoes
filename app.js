const segments=["Pet","Bazar","Jardinagem","Farma","Tech","Matco"];
const brands=[
{name:"Ferplast",url:"https://int.ferplast.com/pt-br",segments:["Pet"]},
{name:"Jambo Pet",url:"https://www.jambopet.com.br/",segments:["Pet"]},
{name:"Família de Estimação",url:"https://www.familiadeestimacao.com.br/",segments:["Pet"]},
{name:"TOH",url:"https://toh.com.br/",segments:["Pet"]},
{name:"German Hart",url:"https://www.brasgroup.com.br/germanhart",segments:["Pet"]},
{name:"Natty Chews",url:"https://nattychews.com/",segments:["Pet"]},
{name:"Maccabi",url:"https://maccabiart.com/",segments:["Pet","Bazar"]},
{name:"Farex",url:"https://www.farex.net/",segments:["Bazar","Matco"]},
{name:"TOQ",url:"https://www.toq.ind.br/",segments:["Bazar","Matco"]},
{name:"EVO",url:"https://www.evooficial.com.br/",segments:["Bazar","Jardinagem"]},
{name:"RAW RAW",url:"https://www.rawraw.com.br/",segments:["Pet"]},
{name:"PAPAPETS",url:"https://papapets.com.br/",segments:["Pet"]},
{name:"Dentalight",url:"https://www.dentalight.com.br/",segments:["Pet"]},
{name:"Just",url:"https://justpetiscos.com.br/",segments:["Pet"]},
{name:"COLLAR PET",url:"https://www.instagram.com/collarpetoficial/",segments:["Pet"]},
{name:"Fortezza",url:"https://fortezza.com.br/",segments:["Bazar","Matco"]},
{name:"WB",url:"https://www.wb.com.br/",segments:["Bazar","Tech"]},
{name:"Geonav",url:"https://www.geonav.com.br/",segments:["Tech"]},
{name:"Leão de Judá",url:"https://www.instagram.com/ceramicaleaodejuda/",segments:["Bazar","Jardinagem","Matco"]}
];
const descriptions={Pet:"Produtos, acessórios e soluções para o mercado pet.",Bazar:"Utilidades, presentes e itens para o varejo.",Jardinagem:"Produtos para cultivo, casa e jardim.",Farma:"Oportunidades para canais farmacêuticos e especializados.",Tech:"Tecnologia, acessórios e conectividade.",Matco:"Soluções para material de construção e canais relacionados."};
document.getElementById("segmentCards").innerHTML=segments.map(s=>'<article class="segment-card"><strong>'+s+'</strong><p>'+descriptions[s]+'</p></article>').join("");
const filters=document.getElementById("filters"), grid=document.getElementById("brandsGrid");
let active="Todas";
function waLink(brand){const n=(window.BIASUZ_CONFIG?.whatsappNumber||"").replace(/\D/g,""); const msg=encodeURIComponent("Olá, sou lojista e tenho interesse comercial em "+brand+" através da Biasuz Representações."); return n?"https://wa.me/"+n+"?text="+msg:"#contato";}
function render(){grid.innerHTML=brands.filter(b=>active==="Todas"||b.segments.includes(active)).map(b=>'<article class="brand-card"><div><h3>'+b.name+'</h3><p>'+b.segments.join(" • ")+'</p></div><div class="brand-actions"><a href="'+b.url+'" target="_blank" rel="noopener">Site oficial</a><a class="primary" href="'+waLink(b.name)+'">Tenho interesse</a></div></article>').join("")}
["Todas",...segments].forEach(s=>{const b=document.createElement("button");b.className="filter"+(s==="Todas"?" active":"");b.textContent=s;b.onclick=()=>{active=s;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.textContent===s));render()};filters.appendChild(b)});render();
const ss=document.getElementById("segmentSelect");ss.innerHTML='<option value="">Selecione</option>'+segments.map(s=>'<option>'+s+'</option>').join("");
const bs=document.getElementById("brandSelect");bs.innerHTML+=[...brands].sort((a,b)=>a.name.localeCompare(b.name)).map(b=>'<option>'+b.name+'</option>').join("");
const cfg=window.BIASUZ_CONFIG||{}; const sb=(cfg.supabaseUrl&&cfg.supabasePublishableKey&&window.supabase)?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey):null;
document.getElementById("leadForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,status=document.getElementById("formStatus");status.className="form-status";status.textContent="Enviando...";const d=Object.fromEntries(new FormData(f).entries());if(d.website){status.textContent="Solicitação recebida.";return}const payload={name:d.name,company:d.company,phone:d.phone,email:d.email||null,state:d.state,segment:d.segment,brand:d.brand||null,message:d.message||null,consent:true,source:"landing"};try{if(sb){const {error}=await sb.from("leads").insert(payload);if(error)throw error} else {const n=(cfg.whatsappNumber||"").replace(/\D/g,"");if(n)window.open("https://wa.me/"+n+"?text="+encodeURIComponent("Novo contato Biasuz\nNome: "+d.name+"\nEmpresa: "+d.company+"\nUF: "+d.state+"\nSegmento: "+d.segment+"\nMarca: "+(d.brand||"não informada")),"_blank");else throw new Error("Canal de atendimento ainda não configurado.")}status.className="form-status ok";status.textContent="Solicitação enviada. Em breve entraremos em contato.";f.reset()}catch(err){status.className="form-status err";status.textContent="Não foi possível enviar agora. "+(err.message||"Tente novamente.")}});