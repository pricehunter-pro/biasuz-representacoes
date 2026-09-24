window.BiasuzUI=(function(){
 const SVG={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m21 8-9 5-9-5 9-5 9 5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5Z"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.5 11h11l2-7H7"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.4 1.6c-.9.9-2.2 1.3-2.2 3.4"/><path d="M12 18h.01"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06-2.83 2.83-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21h-4v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06-2.83-2.83.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3v-4h.09A1.6 1.6 0 0 0 4.56 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06 2.83-2.83.06.06A1.6 1.6 0 0 0 8.84 4.7 1.6 1.6 0 0 0 9.81 3.2V3h4v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06 2.83 2.83-.06.06A1.6 1.6 0 0 0 19.7 8.8c.12.6.64 1.04 1.25 1.04H21v4h-.09a1.6 1.6 0 0 0-1.51 1.16Z"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 3 18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-2.3 3.1M6.6 6.6C3.6 8.5 2 12 2 12s3.5 6 10 6a9.5 9.5 0 0 0 4.3-1"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>'
 };
 const roleInfo={
  admin:{
   label:"Administrador",title:"Controle total da operação Biasuz.",accent:"gestão comercial",
   text:"Acesse CRM, carteira de clientes, representadas, catálogos, lojas B2B, performance e diagnóstico em um único ambiente.",
   benefits:[["Visão 360°","Leads, clientes, pedidos e demandas."],["Catálogos inteligentes","PDF, OCR e revisão antes de publicar."],["Gestão comercial","Vendedores, metas, campanhas e comissões."],["Segurança","Acessos separados por perfil e regras de banco."]]
  },
  cliente:{
   label:"Cliente",title:"Seu portal de compras e relacionamento.",accent:"compras organizadas",
   text:"Entre para acessar as lojas das indústrias representadas, consultar catálogos, acompanhar pedidos e falar com a Biasuz.",
   benefits:[["Lojas separadas","Cada indústria mantém produtos e condições próprias."],["Pedidos organizados","Um pedido por representada, sem misturar indústrias."],["Catálogos","Materiais comerciais disponíveis no seu acesso."],["Atendimento","Abra uma demanda e acompanhe a resposta."]]
  },
  representada:{
   label:"Representada",title:"Sua operação comercial com a Biasuz.",accent:"acompanhamento transparente",
   text:"Consulte pedidos, política comercial, catálogos, demandas e informações relacionadas à sua indústria.",
   benefits:[["Pedidos","Acompanhe somente pedidos da sua indústria."],["Política comercial","Condições, prazos e regras organizados."],["Catálogos","Materiais publicados e disponíveis."],["Demandas","Canal direto de atendimento com a Biasuz."]]
  },
  representante:{
   label:"Representante",title:"Sua carteira, metas e oportunidades.",accent:"venda com contexto",
   text:"Acompanhe clientes, pedidos, metas, comissões, catálogos e ações comerciais da sua carteira.",
   benefits:[["Carteira","Clientes vinculados ao seu acesso."],["Metas","Acompanhe realizado e objetivo."],["Catálogos","Compartilhe materiais por WhatsApp ou e-mail."],["Comissões","Visão dos valores previstos e aprovados."]]
  }
 };
 const qs=new URLSearchParams(location.search);
 function currentRole(){
  if(location.pathname.endsWith("/admin.html")||location.pathname.endsWith("admin.html"))return "admin";
  const r=(qs.get("role")||"cliente").toLowerCase();return roleInfo[r]?r:"cliente";
 }
 function authIntro(role){
  const i=roleInfo[role]||roleInfo.cliente;
  return '<aside class="auth-intro"><div class="auth-intro-copy"><span class="eyebrow">'+i.label+' · Biasuz Representações</span><h2>'+i.title.replace(i.accent,'<span>'+i.accent+'</span>')+'</h2><p>'+i.text+'</p><div class="auth-benefits">'+i.benefits.map(x=>'<div class="auth-benefit"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join("")+'</div></div><div class="auth-support"><small>Precisa de ajuda para entrar?</small><a href="https://wa.me/5575992268989?text='+encodeURIComponent("Olá, preciso de ajuda para acessar o "+i.label+" da Biasuz.")+'" target="_blank" rel="noopener">Falar com a Biasuz no WhatsApp →</a></div></aside>';
 }
 function enhanceAccess(){
  const login=document.getElementById("loginView");if(!login||document.getElementById("authExperience"))return;
  const role=currentRole(),host=login.parentElement,wrap=document.createElement("div");wrap.id="authExperience";wrap.className="auth-experience";
  wrap.innerHTML=authIntro(role)+'<div class="auth-stage"></div>';
  host.insertBefore(wrap,login);wrap.querySelector(".auth-stage").appendChild(login);
  const sync=()=>wrap.classList.toggle("hidden",login.classList.contains("hidden"));sync();
  new MutationObserver(sync).observe(login,{attributes:true,attributeFilter:["class"]});
  enhancePasswords(login);
 }
 function enhancePasswords(scope=document){
  scope.querySelectorAll('input[type="password"]').forEach(input=>{
   if(input.closest(".password-wrap"))return;
   const wrap=document.createElement("span");wrap.className="password-wrap";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
   const btn=document.createElement("button");btn.type="button";btn.className="password-toggle";btn.setAttribute("aria-label","Exibir senha");btn.innerHTML=SVG.eye;wrap.appendChild(btn);
   btn.addEventListener("click",()=>{const showing=input.type==="text";input.type=showing?"password":"text";btn.innerHTML=showing?SVG.eye:SVG.eyeoff;btn.setAttribute("aria-label",showing?"Exibir senha":"Ocultar senha")});
  });
 }
 function sideItem(icon,label,attrs=""){return '<button '+attrs+'>'+SVG[icon]+'<span>'+label+'</span></button>'}
 function linkItem(icon,label,href){return '<a href="'+href+'">'+SVG[icon]+'<span>'+label+'</span></a>'}
 function baseSidebar(role,nav){
  const info=roleInfo[role]||roleInfo.cliente;
  return '<aside class="dashboard-sidebar"><a class="dashboard-brand" href="./index.html"><span class="brand-mark">B</span><span><strong>BIASUZ</strong><small>REPRESENTAÇÕES</small></span></a><div class="dashboard-role"><span>Ambiente</span><strong>'+info.label+'</strong></div><nav class="dashboard-nav">'+nav+'</nav><div class="dashboard-sidebar-bottom"><div class="dashboard-help"><strong>Primeira vez aqui?</strong><p>Veja um guia rápido dos recursos principais deste painel.</p><button data-start-tour>'+SVG.help+'<span>Como usar este painel</span></button></div>'+linkItem("help","Falar no WhatsApp","https://wa.me/5575992268989")+'</div></aside>';
 }
 function transformAdmin(){
  const app=document.getElementById("appView");if(!app||app.dataset.uiV2)return;app.dataset.uiV2="1";if(app.parentElement)app.parentElement.style.padding="0";
  const old=[...app.childNodes];const main=document.createElement("main");main.className="dashboard-main";
  old.forEach(n=>main.appendChild(n));
  const nav='<div class="dashboard-nav-group">Operação</div>'+
   sideItem("home","Visão geral",'data-admin-target="leads"')+
   sideItem("users","Carteira / CRM",'data-admin-target="customers"')+
   sideItem("box","Representadas",'data-admin-target="catalog"')+
   sideItem("file","Catálogos & PDFs",'data-admin-target="catalogs"')+
   '<div class="dashboard-nav-group">Gestão</div>'+
   linkItem("file","Revisar extrações","./catalog-review.html")+
   linkItem("box","Gestão das Lojas","./commercial-admin.html")+
   linkItem("chart","Gestão Comercial","./sales-admin.html")+
   linkItem("settings","Diagnóstico","./health-admin.html")+
   sideItem("upload","Importar carteira",'data-admin-target="import"');
  const layout=document.createElement("div");layout.className="dashboard-layout";layout.innerHTML=baseSidebar("admin",nav);layout.appendChild(main);app.appendChild(layout);
  const top=main.querySelector(".admin-top");top?.classList.add("dashboard-topbar");
  const welcome=document.createElement("section");welcome.className="dashboard-welcome";welcome.innerHTML='<span class="eyebrow">Central operacional</span><h2>Boa gestão começa com uma visão clara.</h2><p>Use a navegação lateral para trabalhar carteira, marcas, catálogos, lojas e indicadores sem se perder entre telas.</p><div class="dashboard-welcome-actions"><button class="btn btn-small" data-start-tour>Fazer tour guiado</button><a class="btn btn-small btn-outline" href="./master-preview.html">Visualizar portais</a></div>';
  if(top)top.insertAdjacentElement("afterend",welcome);
  main.querySelector(".tabs")?.classList.add("legacy-tabs");
  document.querySelectorAll("[data-admin-target]").forEach(btn=>btn.addEventListener("click",()=>{
    const target=btn.dataset.adminTarget,orig=[...main.querySelectorAll(".tab[data-tab]")].find(x=>x.dataset.tab===target);orig?.click();
    document.querySelectorAll("[data-admin-target]").forEach(x=>x.classList.toggle("active",x===btn));
    window.scrollTo({top:0,behavior:"smooth"});
  }));
  document.querySelector('[data-admin-target="leads"]')?.classList.add("active");
  const firstCard=main.querySelector(".kpis");if(firstCard){const call=document.createElement("div");call.className="guide-callout";call.innerHTML='<span class="guide-number">1</span><div><b>Comece pelos indicadores.</b><small>Leads, carteira, representadas e produtos mostram o tamanho atual da operação. Depois use o menu lateral para entrar em cada módulo.</small></div>';firstCard.insertAdjacentElement("beforebegin",call)}
  attachTour("admin");
 }
 function transformPortal(){
  const app=document.getElementById("portalView");if(!app||app.dataset.uiV2)return;app.dataset.uiV2="1";if(app.parentElement)app.parentElement.style.padding="0";const role=currentRole();
  const old=[...app.childNodes],main=document.createElement("main");main.className="dashboard-main";old.forEach(n=>main.appendChild(n));
  const labels={
   cliente:[["home","Início","contextCard"],["box","Lojas","storesSection"],["chart","Promoções","promotionsSection"],["cart","Pedidos","ordersList"],["file","Catálogos","repCatalogsSection"],["bell","Notificações","notificationsList"],["help","Demandas","requestsList"]],
   representada:[["home","Início","contextCard"],["chart","Resultados","representadaWorkspace"],["cart","Pedidos","ordersList"],["file","Catálogos","repCatalogsSection"],["bell","Notificações","notificationsList"],["help","Demandas","requestsList"]],
   representante:[["home","Visão geral","contextCard"],["chart","Minha operação","representativeWorkspace"],["cart","Pedidos","ordersList"],["file","Catálogos","repCatalogsSection"],["bell","Notificações","notificationsList"],["help","Demandas","requestsList"]]
  };
  const nav='<div class="dashboard-nav-group">Meu portal</div>'+labels[role].map(([i,l,id],idx)=>sideItem(i,l,'data-scroll-target="'+id+'"'+(idx===0?' class="active"':''))).join("")+'<div class="dashboard-nav-group">Conta</div>'+linkItem("settings","Alterar minha senha","./reset-password.html?mode=change");
  const layout=document.createElement("div");layout.className="dashboard-layout";layout.innerHTML=baseSidebar(role,nav);layout.appendChild(main);app.appendChild(layout);
  const head=main.querySelector(".portal-head");head?.classList.add("dashboard-topbar");
  const i=roleInfo[role],welcome=document.createElement("section");welcome.className="dashboard-welcome";welcome.innerHTML='<span class="eyebrow">'+i.label+'</span><h2>'+({cliente:"Bem-vindo ao seu espaço de compras.",representada:"Acompanhe sua operação com clareza.",representante:"Sua carteira e seus resultados, juntos."}[role])+'</h2><p>'+i.text+'</p><div class="dashboard-welcome-actions"><button class="btn btn-small" data-start-tour>Como usar este painel</button><a class="btn btn-small btn-outline" href="https://wa.me/5575992268989" target="_blank" rel="noopener">Preciso de ajuda</a></div>';
  if(head)head.insertAdjacentElement("afterend",welcome);
  main.querySelector("#contextCard")?.insertAdjacentHTML("beforebegin",'<div class="guide-callout"><span class="guide-number">1</span><div><b>Seu painel é organizado por contexto.</b><small>Use o menu lateral para ir direto a lojas, pedidos, catálogos, notificações e atendimento. Tudo que aparece aqui respeita o seu perfil de acesso.</small></div></div>');
  document.querySelectorAll("[data-scroll-target]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.scrollTarget,el=document.getElementById(id)||document.querySelector("#"+id);if(el){document.querySelectorAll("[data-scroll-target]").forEach(x=>x.classList.toggle("active",x===btn));el.scrollIntoView({behavior:"smooth",block:"start"})}
  }));
  attachTour(role);
 }
 function stepsFor(role){
  if(role==="admin")return[
   {sel:".dashboard-sidebar",title:"Navegação central",text:"Todos os módulos administrativos estão organizados aqui. Você não precisa mais procurar funções em uma faixa de botões."},
   {sel:".kpis",title:"Indicadores principais",text:"Comece conferindo o tamanho da operação e use estes números como ponto de partida."},
   {sel:"#tab-customers",title:"Carteira e CRM",text:"Na Carteira você pesquisa clientes, abre a ficha completa e registra relacionamento, responsável e próxima ação."},
   {sel:".dashboard-actions",title:"Conta e visualização",text:"Troque sua senha, visualize os portais e encerre sua sessão por aqui."}
  ];
  const common=[
   {sel:".dashboard-sidebar",title:"Seu menu principal",text:"Use este menu para navegar entre as áreas do seu portal."},
   {sel:".portal-grid",title:"Resumo rápido",text:"Os cartões mostram pedidos, demandas e notificações ligadas ao seu acesso."},
   {sel:"#contextCard",title:"Informações do seu perfil",text:"Aqui ficam os dados e condições mais importantes para o seu tipo de acesso."}
  ];
  if(role==="cliente"){common.push({sel:"#storesSection",title:"Lojas das representadas",text:"Escolha uma indústria para comprar. A lista inicial é resumida para deixar o painel mais limpo."});common.push({sel:"#promotionsSection",title:"Promoções",text:"Campanhas e condições liberadas pela Biasuz ou pelas representadas aparecem aqui."})};
  if(role==="representante")common.push({sel:"#representativeWorkspace",title:"Sua operação comercial",text:"Acompanhe carteira, vendas, metas e comissões do período."});
  if(role==="representada"){common.push({sel:"#representadaWorkspace",title:"Resultados da sua indústria",text:"Acompanhe pedidos, valor movimentado, ticket médio e positivações do período."});common.push({sel:"#repCatalogsSection",title:"Catálogos e materiais",text:"Consulte os materiais comerciais publicados para sua operação."})};
  common.push({sel:"#requestForm",title:"Atendimento Biasuz",text:"Quando precisar, abra uma demanda e acompanhe a resposta pelo próprio portal."});
  return common;
 }
 function attachTour(role){
  if(document.getElementById("uiTourCard"))return;
  const overlay=document.createElement("div");overlay.id="uiTourOverlay";overlay.className="ui-tour-overlay";document.body.appendChild(overlay);
  const card=document.createElement("div");card.id="uiTourCard";card.className="ui-tour-card";card.innerHTML='<span class="eyebrow">Guia rápido</span><h3 id="uiTourTitle"></h3><p id="uiTourText"></p><div class="ui-tour-actions"><button class="btn btn-small btn-outline" id="uiTourClose">Fechar</button><button class="btn btn-small" id="uiTourNext">Próximo</button></div>';document.body.appendChild(card);
  let idx=0,current=null,steps=[];
  const close=()=>{overlay.classList.remove("open");card.classList.remove("open");current?.classList.remove("ui-tour-highlight");current=null;localStorage.setItem("biasuz-tour-"+role,"done")};
  const show=()=>{current?.classList.remove("ui-tour-highlight");while(idx<steps.length&&!document.querySelector(steps[idx].sel))idx++;if(idx>=steps.length){close();return}const s=steps[idx],el=document.querySelector(s.sel);current=el;el.classList.add("ui-tour-highlight");el.scrollIntoView({behavior:"smooth",block:"center"});document.getElementById("uiTourTitle").textContent=s.title;document.getElementById("uiTourText").textContent=s.text;document.getElementById("uiTourNext").textContent=idx===steps.length-1?"Concluir":"Próximo";overlay.classList.add("open");card.classList.add("open")};
  const start=()=>{idx=0;steps=stepsFor(role);show()};
  document.querySelectorAll("[data-start-tour]").forEach(b=>b.addEventListener("click",start));
  document.getElementById("uiTourClose").onclick=close;document.getElementById("uiTourNext").onclick=()=>{idx++;show()};overlay.onclick=close;
  const app=role==="admin"?document.getElementById("appView"):document.getElementById("portalView");
  if(app&&!app.classList.contains("hidden")&&!localStorage.getItem("biasuz-tour-"+role))setTimeout(start,900);
 }
 function enhanceAdminSubpage(){
  const page=location.pathname.split("/").pop(),roots={
   "sales-admin.html":".sales-shell","commercial-admin.html":".manager","catalog-review.html":".review","health-admin.html":".shell","customer-admin.html":".shell"
  };
  const sel=roots[page];if(!sel)return;const root=document.querySelector(sel);if(!root||root.querySelector(".subpage-dock"))return;
  document.body.classList.add("admin-subpage-v2");
  const dock=document.createElement("nav");dock.className="subpage-dock";dock.innerHTML=
   '<a href="./admin.html">'+SVG.home+'<span>Central</span></a>'+
   '<a href="./commercial-admin.html">'+SVG.box+'<span>Lojas</span></a>'+
   '<a href="./sales-admin.html">'+SVG.chart+'<span>Comercial</span></a>'+
   '<a href="./catalog-review.html">'+SVG.file+'<span>Revisão PDF</span></a>'+
   '<a href="./health-admin.html">'+SVG.settings+'<span>Diagnóstico</span></a>'+
   '<a href="./index.html" target="_blank">'+SVG.eye+'<span>Ver site</span></a>';
  root.insertBefore(dock,root.firstChild);
 }
 function init(){
  enhanceAccess();enhancePasswords();
  const app=document.getElementById("appView"),portal=document.getElementById("portalView");
  if(app)transformAdmin();if(portal)transformPortal();enhanceAdminSubpage();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
 return {init,enhancePasswords};
})();